
import { Component, ChangeDetectionStrategy, inject, signal, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WritingService } from '../../services/writing.service';
import { GeminiService } from '../../services/gemini.service';
import { WritingReport } from '../../models/writing.model';

@Component({
  selector: 'app-writing',
  imports: [CommonModule],
  templateUrl: './writing.component.html',
  styleUrls: ['./writing.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WritingComponent {
  writingService = inject(WritingService);
  geminiService = inject(GeminiService);

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  isDragging = signal(false);

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    if (file) {
      this.writingService.selectImage(file);
    }
  }

  triggerFileInput(): void {
    this.fileInput()?.nativeElement.click();
  }

  analyze(): void {
    this.writingService.analyzeWriting();
  }
  
  startOver(): void {
    this.writingService.reset();
  }

  // Drag and Drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
        this.writingService.selectImage(file);
    } else {
        this.geminiService.error.set("Please drop an image file.");
    }
  }
}
