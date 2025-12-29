
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ConversationReport {
  id: string;
  date: Date;
  overallFeedback: string;
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  areasForImprovement: string[];
  positivePoints: string[];
  transcript: ChatMessage[];
}
