
export interface WritingCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface WritingReport {
  id: string;
  date: Date;
  imageUrl: string; // This will be a base64 data URL
  overallFeedback: string;
  corrections: WritingCorrection[];
  positivePoints: string[];
}
