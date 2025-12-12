export interface Attendee {
  id: string;
  rawInput: string;
  formattedName: string;
  formattedPhone?: string;
  timestamp: number;
}

export enum AppState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  PROCESSING = 'PROCESSING', // Using Gemini to clean names
  REVIEW = 'REVIEW',
  SUBMITTING = 'SUBMITTING',
  COMPLETED = 'COMPLETED'
}