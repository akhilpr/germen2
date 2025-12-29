
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly speechRecognition: any | null = null;
  private speechSynthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  isListening = signal(false);
  isSpeaking = signal(false);
  error = signal<string | null>(null);

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.error.set('Speech Recognition API is not supported in this browser.');
    } else {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false; // We want to capture single phrases
      this.speechRecognition.interimResults = false;
    }

    this.speechSynthesis = window.speechSynthesis;
    // The 'voiceschanged' event is crucial for loading voices asynchronously.
    this.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    this.loadVoices();
  }

  private loadVoices(): void {
    this.voices = this.speechSynthesis.getVoices();
    if(this.voices.length === 0) {
        // In some browsers, voices are loaded async, so we might need to check again.
        setTimeout(() => {
            this.voices = this.speechSynthesis.getVoices();
        }, 100);
    }
  }

  listen(lang: string): Promise<string> {
    if (this.isListening()) {
        return Promise.resolve(''); // Already listening, ignore new request
    }
    return new Promise((resolve, reject) => {
      if (!this.speechRecognition) {
        const err = 'Speech Recognition not available.';
        this.error.set(err);
        return reject(err);
      }

      const recognition = this.speechRecognition;
      recognition.lang = lang;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onend = () => {
        this.isListening.set(false);
      };

      recognition.onerror = (event: any) => {
        this.isListening.set(false);
        const errorMessage = event.error === 'no-speech' 
          ? 'I didn\'t hear anything. Please try again.' 
          : `Speech recognition error: ${event.error}`;
        this.error.set(errorMessage);
        reject(new Error(errorMessage));
      };
      
      recognition.start();
      this.isListening.set(true);
      this.error.set(null);
    });
  }
  
  speak(text: string, lang: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.speechSynthesis.speaking) {
        // Cancel previous utterance to prevent overlap if user clicks fast
        this.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;

      // --- Enhanced Voice Selection Logic ---
      // Find the best available German voice.
      const germanVoices = this.voices.filter(voice => voice.lang === 'de-DE');
      
      let selectedVoice: SpeechSynthesisVoice | undefined;
      if (germanVoices.length > 0) {
        // Prioritize "Google" voices as they are often higher quality and sound more natural.
        selectedVoice = germanVoices.find(voice => voice.name.toLowerCase().includes('google')) || germanVoices[0];
      } else {
        // Fallback to any voice that reports as being German.
        selectedVoice = this.voices.find(voice => voice.lang.startsWith('de'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        console.warn(`No German (de-DE) voice found. Using browser default for the specified language.`);
      }

      utterance.onstart = () => {
        this.isSpeaking.set(true);
        this.error.set(null);
      };
      
      utterance.onend = () => {
        this.isSpeaking.set(false);
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking.set(false);
        this.error.set(`Speech synthesis error: ${event.error}`);
        console.error("Speech synthesis error:", event);
        reject(event.error);
      };

      this.speechSynthesis.speak(utterance);
    });
  }

  stop() {
    if (this.isListening()) {
      this.speechRecognition?.stop();
      this.isListening.set(false);
    }
    if (this.isSpeaking()) {
      this.speechSynthesis.cancel();
      this.isSpeaking.set(false);
    }
  }
}
