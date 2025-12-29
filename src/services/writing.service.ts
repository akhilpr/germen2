
import { Injectable, signal, computed, inject } from '@angular/core';
import { WritingReport } from '../models/writing.model';
import { GeminiService } from './gemini.service';

type WritingState = 'idle' | 'image_selected' | 'analyzing' | 'report_ready';

@Injectable({ providedIn: 'root' })
export class WritingService {
  private geminiService = inject(GeminiService);

  // State
  readonly state = signal<WritingState>('idle');
  readonly selectedImage = signal<string | null>(null); // base64 data URL
  readonly reports = signal<WritingReport[]>([]);
  readonly latestReport = signal<WritingReport | null>(null);

  constructor() {
    const savedReports = localStorage.getItem('german-coach-writing-reports');
    if (savedReports) {
      const parsedReports = JSON.parse(savedReports).map((r: any) => ({...r, date: new Date(r.date)}));
      this.reports.set(parsedReports);
    }
  }
  
  selectImage(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.selectedImage.set(reader.result as string);
      this.state.set('image_selected');
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
    localStorage.setItem('german-coach-writing-reports', JSON.stringify(this.reports()));
  }
}
