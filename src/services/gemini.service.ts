
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Chat, Type } from '@google/genai';
import { ChatMessage, ConversationReport } from '../models/conversation.model';
import { WritingReport } from '../models/writing.model';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly ai: GoogleGenAI;
  private chat: Chat | null = null;
  
  error = signal<string | null>(null);

  constructor() {
    if (!process.env.API_KEY) {
        const errorMessage = "API_KEY environment variable not set. The application cannot contact the Gemini API.";
        this.error.set(errorMessage);
        console.error(errorMessage);
        this.ai = {} as GoogleGenAI;
        return;
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  startChat(): void {
    if (!this.ai.chats) {
        this.error.set("Gemini AI client is not initialized. Please check your API key.");
        return;
    }
    this.chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are Herr Schmidt, a friendly, patient, and encouraging German language teacher. 
        Converse with the user in German to help them practice for an exam. 
        Keep your responses relatively short and clear, suitable for a language learner. 
        Your goal is to maintain a natural conversation. 
        Do not explicitly correct every mistake, but you can subtly model the correct grammar or vocabulary in your responses.`,
      },
    });
    this.error.set(null);
  }

  async sendMessageStream(
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ): Promise<void> {
    if (!this.chat) {
      this.error.set('Chat is not initialized. Please start a new conversation.');
      onComplete();
      return;
    }
    this.error.set(null);
    try {
      const responseStream = await this.chat.sendMessageStream({ message });
      for await (const chunk of responseStream) {
        onChunk(chunk.text);
      }
    } catch (e) {
      console.error('Error sending message:', e);
      this.error.set('An error occurred while communicating with the AI. Please try again.');
    } finally {
        onComplete();
    }
  }

  async analyzeConversation(transcript: ChatMessage[]): Promise<Partial<ConversationReport> | null> {
    if (!this.ai.models) {
        this.error.set("Gemini AI client is not initialized. Please check your API key.");
        return null;
    }
    const prompt = `Analyze the following German conversation transcript...`; // Prompt omitted for brevity
    this.error.set(null);
    try {
      const response = await this.ai.models.generateContent({ /* ... */ }); // Body omitted for brevity
      return JSON.parse(response.text.trim()) as Partial<ConversationReport>;
    } catch (e) {
      console.error('Error analyzing conversation:', e);
      this.error.set('An error occurred while analyzing the conversation. Please try again.');
      return null;
    }
  }

  async analyzeHandwriting(imageBase64: string): Promise<Partial<WritingReport> | null> {
    if (!this.ai.models) {
        this.error.set("Gemini AI client is not initialized. Please check your API key.");
        return null;
    }
    
    // Extract mime type and pure base64 data from the data URL
    const match = imageBase64.match(/^data:(image\/[a-z]+);base64,(.*)$/);
    if (!match || match.length !== 3) {
      this.error.set("Invalid image format.");
      return null;
    }
    const mimeType = match[1];
    const base64Data = match[2];

    const textPart = {
      text: `You are a helpful and encouraging German language teacher. Analyze the handwritten German text in the provided image.
      - Identify any mistakes in grammar, spelling, or vocabulary.
      - Provide a brief, encouraging summary of the user's performance.
      - Create a list of specific corrections. For each correction, provide the original text snippet, the corrected version, and a simple explanation.
      - Create a list of 2-3 things the user did well (e.g., good vocabulary usage, correct sentence structure).
      - Structure your response strictly as JSON.`
    };

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    };

    this.error.set(null);
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, imagePart] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallFeedback: { type: Type.STRING, description: 'A brief, encouraging summary of the user\'s performance.' },
              corrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    corrected: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ['original', 'corrected', 'explanation']
                },
                description: 'A list of specific corrections with explanations.'
              },
              positivePoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'A list of 2-3 things the user did well.'
              }
            }
          }
        }
      });
      
      const jsonText = response.text.trim();
      return JSON.parse(jsonText) as Partial<WritingReport>;

    } catch (e) {
      console.error('Error analyzing handwriting:', e);
      this.error.set('An error occurred while analyzing the writing sample. Please try again.');
      return null;
    }
  }
}
