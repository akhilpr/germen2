
import { Injectable, signal, computed, inject } from '@angular/core';
import { WritingReport } from '../models/writing.model';
import { GeminiService } from './gemini.service';

type WritingState = 'idle' | 'image_selected' | 'analyzing' | 'report_ready';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class WritingService {
  private geminiService = inject(GeminiService);

  // State
  readonly state = signal<WritingState>('idle');
  readonly selectedImage = signal<string | null>(null); // base64 data URL
  readonly reports = signal<WritingReport[]>([]);
  readonly latestReport = signal<WritingReport | null>(null);

  constructor() {
    try {
      const savedReports = localStorage.getItem('german-coach-writing-reports');
      if (savedReports) {
        const parsedReports = JSON.parse(savedReports).map((r: any) => ({...r, date: new Date(r.date)}));
        this.reports.set(parsedReports);
      }
    } catch (e) {
      console.error("Failed to load writing reports from localStorage", e);
    }
  }
  
  selectImage(file: File): void {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.geminiService.error.set(`Image size exceeds ${MAX_FILE_SIZE_MB}MB. Please choose a smaller file.`);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.selectedImage.set(reader.result as string);
      this.state.set('image_selected');
      this.geminiService.error.set(null); // Clear previous errors
    };
    reader.onerror = (e) => {
      console.error("FileReader error:", e);
      this.geminiService.error.set("Could not read the selected file.");
    };
    reader.readAsDataURL(file);
  }

  async analyzeWriting(): Promise<void> {
    const image = this.selectedImage();
    if (!image) return;

    this.state.set('analyzing');
    this.latestReport.set(null);

    const analysis = await this.geminiService.analyzeHandwriting(image);
    
    if (analysis) {
      const newReport: WritingReport = {
        id: new Date().toISOString(),
        date: new Date(),
        imageUrl: image,
        ...analysis,
      } as WritingReport;

      this.latestReport.set(newReport);
      this.reports.update(reports => [newReport, ...reports]);
      this.saveReportsToLocalStorage();
      this.state.set('report_ready');
    } else {
      this.state.set('image_selected'); // Go back to selected image if analysis fails
    }
  }

  reset(): void {
    this.state.set('idle');
    this.selectedImage.set(null);
    this.latestReport.set(null);
    this.geminiService.error.set(null);
  }

  private saveReportsToLocalStorage(): void {
    try {
      localStorage.setItem('german-coach-writing-reports', JSON.stringify(this.reports()));
    } catch (e) {
      console.error("Failed to save writing reports to localStorage", e);
    }
  }
}
