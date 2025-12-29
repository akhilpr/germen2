
import { Injectable, signal, computed, inject } from '@angular/core';
import { ChatMessage, ConversationReport } from '../models/conversation.model';
import { GeminiService } from './gemini.service';

type ConversationState = 'idle' | 'active' | 'analyzing' | 'report_ready';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private geminiService = inject(GeminiService);

  // State
  readonly state = signal<ConversationState>('idle');
  readonly activeConversation = signal<ChatMessage[]>([]);
  readonly reports = signal<ConversationReport[]>([]);
  readonly latestReport = signal<ConversationReport | null>(null);

  // Computed Signals
  readonly isConversationActive = computed(() => this.state() === 'active');
  readonly averageScore = computed(() => {
    const allReports = this.reports();
    if (allReports.length === 0) return 0;
    const totalScore = allReports.reduce((sum, report) => {
        return sum + (report.grammarScore + report.vocabularyScore + report.fluencyScore) / 3;
    }, 0);
    return Math.round(totalScore / allReports.length);
  });
  readonly level = computed(() => {
    const avg = this.averageScore();
    if (avg >= 90) return { number: 5, name: 'Meister' };
    if (avg >= 75) return { number: 4, name: 'Fortgeschrittener' };
    if (avg >= 50) return { number: 3, name: 'Gesprächig' };
    if (avg >= 25) return { number: 2, name: 'Anfänger' };
    return { number: 1, name: 'Neuling' };
  });

  constructor() {
    // Load reports from localStorage for persistence (simple implementation)
    const savedReports = localStorage.getItem('german-coach-reports');
    if (savedReports) {
      const parsedReports = JSON.parse(savedReports).map((r: any) => ({...r, date: new Date(r.date)}));
      this.reports.set(parsedReports);
    }
  }

  startConversation(): void {
    this.geminiService.startChat();
    this.activeConversation.set([{
        role: 'model',
        text: 'Hallo! Ich bin Herr Schmidt. Lass uns auf Deutsch sprechen. Wie geht es Ihnen heute?'
    }]);
    this.state.set('active');
    this.latestReport.set(null);
  }

  async addUserMessage(message: string): Promise<void> {
    if (!this.isConversationActive()) return;

    this.activeConversation.update(conv => [...conv, { role: 'user', text: message }]);
    
    // Add empty model response to show typing indicator
    this.activeConversation.update(conv => [...conv, { role: 'model', text: '' }]);
    
    let fullResponse = '';
    await this.geminiService.sendMessageStream(message, 
    (chunk) => {
        fullResponse += chunk;
        this.activeConversation.update(conv => {
            const lastMessage = conv[conv.length-1];
            lastMessage.text = fullResponse;
            return [...conv];
        });
    },
    () => { /* onComplete */ });
  }

  async stopConversation(): Promise<void> {
    if (!this.isConversationActive()) return;
    
    this.state.set('analyzing');
    const transcript = this.activeConversation();
    const analysis = await this.geminiService.analyzeConversation(transcript);
    
    if (analysis) {
        const newReport: ConversationReport = {
            id: new Date().toISOString(),
            date: new Date(),
            transcript: transcript,
            ...analysis
        } as ConversationReport;

        this.latestReport.set(newReport);
        this.reports.update(reports => [newReport, ...reports]);
        this.saveReportsToLocalStorage();
        this.state.set('report_ready');
    } else {
        // If analysis fails, go back to idle but keep the transcript
        this.state.set('idle');
    }
    this.activeConversation.set([]);
  }

  private saveReportsToLocalStorage(): void {
    localStorage.setItem('german-coach-reports', JSON.stringify(this.reports()));
  }
}
