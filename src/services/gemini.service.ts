
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Chat, Type } from '@google/genai';
import { ChatMessage, ConversationReport } from '../models/conversation.model';
import { WritingReport } from '../models/writing.model';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly ai: GoogleGenAI;
  private chat: Chat | null = null;
  
  error = signal<string | null>(null);

  // --- Production-Ready Prompts ---
  private readonly SYSTEM_INSTRUCTION_CHAT = `You are Herr Schmidt, a friendly, patient, and encouraging German language teacher. 
        Converse with the user in German to help them practice for an exam. 
        Keep your responses relatively short and clear, suitable for a language learner. 
        Your goal is to maintain a natural conversation. 
        Do not explicitly correct every mistake, but you can subtly model the correct grammar or vocabulary in your responses.`;

  private readonly CONVERSATION_ANALYSIS_PROMPT_TEMPLATE = `You are a German language teaching expert. Analyze the following conversation transcript between a student (user) and a teacher (model). Provide a detailed analysis based on the student's performance.

Transcript:
---
\${transcriptString}
---

Your task is to evaluate the student's German skills and provide a report in a strict JSON format.

1.  **overallFeedback**: Write a brief, encouraging paragraph summarizing the student's performance. Mention their strengths and the general impression.
2.  **scores (0-100)**:
    *   **grammarScore**: Rate the student's grammatical accuracy. Consider sentence structure, verb conjugations, noun cases (nominative, accusative, dative), and prepositions.
    *   **vocabularyScore**: Rate the student's use of vocabulary. Consider the range of words, appropriateness of word choice, and avoidance of repetition.
    *   **fluencyScore**: Rate the student's conversational fluency. Consider the flow of the conversation, hesitation, and the ability to express ideas smoothly.
3.  **positivePoints**: List 2-3 specific things the student did well. Be specific, e.g., "Correctly used the dative case in 'Ich gebe dem Mann ein Buch'."
4.  **areasForImprovement**: List 2-3 specific, actionable areas for improvement. Provide examples from the transcript, e.g., "The verb should be in the second position in main clauses. Instead of 'Heute ich gehe...', it should be 'Heute gehe ich...'."

Ensure your entire output is only the JSON object, with no surrounding text or markdown.`;

  private readonly HANDWRITING_ANALYSIS_PROMPT = `You are a helpful and encouraging German language teacher. Analyze the handwritten German text in the provided image.
      - Identify any mistakes in grammar, spelling, or vocabulary.
      - Provide a brief, encouraging summary of the user's performance.
      - Create a list of specific corrections. For each correction, provide the original text snippet, the corrected version, and a simple explanation.
      - Create a list of 2-3 things the user did well (e.g., good vocabulary usage, correct sentence structure).
      - Structure your response strictly as JSON.`;


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
        systemInstruction: this.SYSTEM_INSTRUCTION_CHAT,
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
    const transcriptString = transcript.map(m => `${m.role}: ${m.text}`).join('\n');
    const prompt = this.CONVERSATION_ANALYSIS_PROMPT_TEMPLATE.replace('${transcriptString}', transcriptString);
    
    this.error.set(null);
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallFeedback: { type: Type.STRING },
              grammarScore: { type: Type.NUMBER },
              vocabularyScore: { type: Type.NUMBER },
              fluencyScore: { type: Type.NUMBER },
              positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['overallFeedback', 'grammarScore', 'vocabularyScore', 'fluencyScore', 'positivePoints', 'areasForImprovement']
          }
        }
      });
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

    const textPart = { text: this.HANDWRITING_ANALYSIS_PROMPT };
    const imagePart = {
      inlineData: { mimeType: mimeType, data: base64Data }
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
