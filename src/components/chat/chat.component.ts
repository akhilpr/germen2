
import { Component, ChangeDetectionStrategy, inject, signal, ElementRef, viewChild, effect, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../services/conversation.service';
import { GeminiService } from '../../services/gemini.service';
import { SpeechService } from '../../services/speech.service';

@Component({
  selector: 'app-chat',
  imports: [CommonModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnDestroy {
  conversationService = inject(ConversationService);
  geminiService = inject(GeminiService);
  speechService = inject(SpeechService);

  isProcessing = signal(false);

  chatContainer = viewChild<ElementRef>('chatContainer');
  
  isMicDisabled = computed(() => this.speechService.isListening() || this.speechService.isSpeaking() || this.isProcessing());
  micButtonIcon = computed(() => {
    if (this.speechService.isListening()) return 'fa-microphone-slash';
    if (this.speechService.isSpeaking() || this.isProcessing()) return 'fa-circle-stop';
    return 'fa-microphone';
  });
  micButtonHint = computed(() => {
    if (this.speechService.isListening()) return 'Listening...';
    if (this.speechService.isSpeaking()) return 'Herr Schmidt is speaking...';
    if (this.isProcessing()) return 'Thinking...';
    if (this.conversationService.state() === 'active') return 'Tap the microphone to speak';
    return '';
  });

  constructor() {
    effect(() => {
        // Auto-scroll to the bottom when messages change
        this.conversationService.activeConversation();
        this.scrollToBottom();
    });
  }

  ngOnDestroy(): void {
    this.speechService.stop();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
        const container = this.chatContainer()?.nativeElement;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, 100);
  }
  
  async startNewConversation(): Promise<void> {
    this.conversationService.startConversation();
    const initialGreeting = this.conversationService.activeConversation()[0]?.text;
    if (initialGreeting) {
      try {
        await this.speechService.speak(initialGreeting, 'de-DE');
      } catch (e) {
        console.error("Error speaking initial greeting:", e);
      }
    }
  }

  async handleMicClick(): Promise<void> {
    if (this.isMicDisabled()) {
        this.speechService.stop();
        return;
    }

    try {
        const userTranscript = await this.speechService.listen('de-DE');
        if (userTranscript) {
            this.processUserMessage(userTranscript);
        }
    } catch (e) {
        console.error('Error during listening:', e);
    }
  }

  private async processUserMessage(message: string): Promise<void> {
    this.isProcessing.set(true);
    this.conversationService.addUserMessage(message);
    
    // The addUserMessage method streams the response into the service's signal.
    // Here, we wait for the full response to be collected before speaking.
    let fullResponse = '';
    await this.geminiService.sendMessageStream(
        message,
        (chunk) => {
          fullResponse += chunk;
        },
        async () => { // onComplete
          this.isProcessing.set(false);
          if (fullResponse && this.conversationService.isConversationActive()) {
            try {
              await this.speechService.speak(fullResponse, 'de-DE');
            } catch(e) {
              console.error("Error speaking AI response:", e);
            }
          }
        }
    );
  }

  stopConversation(): void {
    this.speechService.stop();
    this.conversationService.stopConversation();
  }
}
