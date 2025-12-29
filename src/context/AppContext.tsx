
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { GoogleGenAI, Chat, Type } from '@google/genai';
import { ChatMessage, ConversationReport } from '../models/conversation.model';
import { WritingReport } from '../models/writing.model';

// --- Type Definitions ---
type ConversationState = 'idle' | 'active' | 'analyzing' | 'report_ready';
type WritingState = 'idle' | 'image_selected' | 'analyzing' | 'report_ready';
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// --- Prompts and Schemas ---
const SYSTEM_INSTRUCTION_CHAT = `You are Herr Schmidt, a friendly, patient, and encouraging German language teacher. 
        Converse with the user in German to help them practice for an exam. 
        Keep your responses relatively short and clear, suitable for a language learner. 
        Your goal is to maintain a natural conversation. 
        Do not explicitly correct every mistake, but you can subtly model the correct grammar or vocabulary in your responses.`;

const CONVERSATION_ANALYSIS_PROMPT_TEMPLATE = `You are a German language teaching expert. Analyze the following conversation transcript between a student (user) and a teacher (model). Provide a detailed analysis based on the student's performance.

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

const HANDWRITING_ANALYSIS_PROMPT = `You are a helpful and encouraging German language teacher. Analyze the handwritten German text in the provided image.
      - Identify any mistakes in grammar, spelling, or vocabulary.
      - Provide a brief, encouraging summary of the user's performance.
      - Create a list of specific corrections. For each correction, provide the original text snippet, the corrected version, and a simple explanation.
      - Create a list of 2-3 things the user did well (e.g., good vocabulary usage, correct sentence structure).
      - Structure your response strictly as JSON.`;


interface AppContextType {
  // Common
  geminiError: string | null;
  setGeminiError: (error: string | null) => void;

  // Conversation
  conversationState: ConversationState;
  activeConversation: ChatMessage[];
  conversationReports: ConversationReport[];
  latestConversationReport: ConversationReport | null;
  averageScore: number;
  level: { number: number; name: string };
  startConversation: () => void;
  addUserMessage: (message: string) => Promise<string>;
  stopConversation: () => Promise<void>;
  
  // Writing
  writingState: WritingState;
  selectedImage: string | null;
  writingReports: WritingReport[];
  latestWritingReport: WritingReport | null;
  selectImage: (file: File) => void;
  analyzeWriting: () => Promise<void>;
  resetWriting: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// FIX: Make children optional to resolve a TypeScript error in index.tsx that seems to be caused by a misconfigured JSX parser.
export function AppProvider({ children }: { children?: ReactNode }) {
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [activeConversation, setActiveConversation] = useState<ChatMessage[]>([]);
  const [conversationReports, setConversationReports] = useState<ConversationReport[]>([]);
  const [latestConversationReport, setLatestConversationReport] = useState<ConversationReport | null>(null);
  const [writingState, setWritingState] = useState<WritingState>('idle');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [writingReports, setWritingReports] = useState<WritingReport[]>([]);
  const [latestWritingReport, setLatestWritingReport] = useState<WritingReport | null>(null);

  const ai = useMemo(() => {
    if (!process.env.API_KEY) {
      const errorMessage = "API_KEY environment variable not set.";
      setGeminiError(errorMessage);
      console.error(errorMessage);
      return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }, []);

  const chatRef = React.useRef<Chat | null>(null);
  
  useEffect(() => {
    try {
      const savedConvReports = localStorage.getItem('german-coach-reports');
      if (savedConvReports) {
        setConversationReports(JSON.parse(savedConvReports).map((r: any) => ({...r, date: new Date(r.date)})));
      }
      const savedWritingReports = localStorage.getItem('german-coach-writing-reports');
      if (savedWritingReports) {
        setWritingReports(JSON.parse(savedWritingReports).map((r: any) => ({...r, date: new Date(r.date)})));
      }
    } catch (e) {
      console.error("Failed to load reports from localStorage", e);
    }
  }, []);
  
  const averageScore = useMemo(() => {
    if (conversationReports.length === 0) return 0;
    const total = conversationReports.reduce((sum, r) => sum + (r.grammarScore + r.vocabularyScore + r.fluencyScore) / 3, 0);
    return Math.round(total / conversationReports.length);
  }, [conversationReports]);

  const level = useMemo(() => {
    if (averageScore >= 90) return { number: 5, name: 'Meister' };
    if (averageScore >= 75) return { number: 4, name: 'Fortgeschrittener' };
    if (averageScore >= 50) return { number: 3, name: 'Gesprächig' };
    if (averageScore >= 25) return { number: 2, name: 'Anfänger' };
    return { number: 1, name: 'Neuling' };
  }, [averageScore]);

  const startConversation = useCallback(() => {
    if (!ai?.chats) return;
    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT },
    });
    setActiveConversation([{ role: 'model', text: 'Hallo! Ich bin Herr Schmidt. Lass uns auf Deutsch sprechen. Wie geht es Ihnen heute?' }]);
    setConversationState('active');
    setLatestConversationReport(null);
  }, [ai]);

  const addUserMessage = useCallback(async (message: string): Promise<string> => {
    if (conversationState !== 'active' || !chatRef.current) return '';
    
    setActiveConversation(prev => [...prev, { role: 'user', text: message }]);
    setActiveConversation(prev => [...prev, { role: 'model', text: '' }]);
    
    let fullResponse = '';
    try {
        const stream = await chatRef.current.sendMessageStream({ message });
        for await (const chunk of stream) {
            fullResponse += chunk.text;
            setActiveConversation(prev => {
                const newConv = [...prev];
                if (newConv.length > 0) {
                    newConv[newConv.length - 1].text = fullResponse;
                }
                return newConv;
            });
        }
    } catch (e) {
        console.error(e);
        setGeminiError("Error communicating with the AI.");
    }
    return fullResponse;
  }, [conversationState]);

  const stopConversation = useCallback(async () => {
    if (conversationState !== 'active' || !ai?.models) return;
    
    setConversationState('analyzing');
    const transcript = activeConversation;
    const transcriptString = transcript.map(m => `${m.role}: ${m.text}`).join('\n');
    const prompt = CONVERSATION_ANALYSIS_PROMPT_TEMPLATE.replace('${transcriptString}', transcriptString);

    try {
        const response = await ai.models.generateContent({
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
        const analysis = JSON.parse(response.text.trim()) as Partial<ConversationReport>;
        const newReport: ConversationReport = { id: new Date().toISOString(), date: new Date(), transcript, ...analysis } as ConversationReport;
        
        setLatestConversationReport(newReport);
        const updatedReports = [newReport, ...conversationReports];
        setConversationReports(updatedReports);
        try { localStorage.setItem('german-coach-reports', JSON.stringify(updatedReports)); } catch (e) {}
        setConversationState('report_ready');
    } catch (e) {
        console.error("Error analyzing conversation:", e);
        setGeminiError("Failed to analyze the conversation.");
        setConversationState('idle');
    }
    setActiveConversation([]);
  }, [ai, activeConversation, conversationState, conversationReports]);

  const selectImage = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setGeminiError(`Image size exceeds ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setWritingState('image_selected');
      setGeminiError(null);
    };
    reader.onerror = () => setGeminiError("Could not read file.");
    reader.readAsDataURL(file);
  }, []);

  const analyzeWriting = useCallback(async () => {
    if (!selectedImage || !ai?.models) return;
    setWritingState('analyzing');
    const match = selectedImage.match(/^data:(image\/[a-z]+);base64,(.*)$/);
    if (!match) { setGeminiError("Invalid image format."); return; }
    const [, mimeType, base64Data] = match;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: HANDWRITING_ANALYSIS_PROMPT }, { inlineData: { mimeType, data: base64Data } }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        overallFeedback: { type: Type.STRING },
                        corrections: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { original: { type: Type.STRING }, corrected: { type: Type.STRING }, explanation: { type: Type.STRING } },
                                required: ['original', 'corrected', 'explanation']
                            }
                        },
                        positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['overallFeedback', 'corrections', 'positivePoints']
                }
            }
        });
        const analysis = JSON.parse(response.text.trim()) as Partial<WritingReport>;
        const newReport = { id: new Date().toISOString(), date: new Date(), imageUrl: selectedImage, ...analysis } as WritingReport;
        
        setLatestWritingReport(newReport);
        const updatedReports = [newReport, ...writingReports];
        setWritingReports(updatedReports);
        try { localStorage.setItem('german-coach-writing-reports', JSON.stringify(updatedReports)); } catch (e) {}
        setWritingState('report_ready');
    } catch(e) {
        console.error("Error analyzing writing:", e);
        setGeminiError("Failed to analyze writing sample.");
        setWritingState('image_selected');
    }
  }, [ai, selectedImage, writingReports]);

  const resetWriting = useCallback(() => {
    setWritingState('idle');
    setSelectedImage(null);
    setLatestWritingReport(null);
    setGeminiError(null);
  }, []);

  const value = {
    geminiError, setGeminiError,
    conversationState, activeConversation, conversationReports, latestConversationReport, averageScore, level, startConversation, addUserMessage, stopConversation,
    writingState, selectedImage, writingReports, latestWritingReport, selectImage, analyzeWriting, resetWriting
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
