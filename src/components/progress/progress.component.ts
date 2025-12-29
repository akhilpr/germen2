
import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ConversationService } from '../../services/conversation.service';
import { WritingService } from '../../services/writing.service';
import { ConversationReport } from '../../models/conversation.model';
import { WritingReport } from '../../models/writing.model';

type ProgressView = 'conversations' | 'writing';

@Component({
  selector: 'app-progress',
  imports: [CommonModule, DatePipe],
  templateUrl: './progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressComponent {
  conversationService = inject(ConversationService);
  writingService = inject(WritingService);
  
  progressView = signal<ProgressView>('conversations');
  
  selectedConversationReport = signal<ConversationReport | null>(null);
  selectedWritingReport = signal<WritingReport | null>(null);

  constructor() {
    // Auto-select the latest report when the component initializes or when a new report is generated
    effect(() => {
        if (this.conversationService.latestReport()) {
            this.selectedConversationReport.set(this.conversationService.latestReport());
            this.progressView.set('conversations');
        }
    });

    effect(() => {
        if (this.writingService.latestReport()) {
            this.selectedWritingReport.set(this.writingService.latestReport());
            this.progressView.set('writing');
        }
    });
  }

  selectConversationReport(report: ConversationReport): void {
    this.selectedConversationReport.set(report);
  }

  selectWritingReport(report: WritingReport): void {
    this.selectedWritingReport.set(report);
  }

  setView(view: ProgressView) {
    this.progressView.set(view);
  }
}
