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
  TRANSCRIBING = 'TRANSCRIBING', // Uploading and transcribing audio
  PROCESSING = 'PROCESSING', // Using Gemini to clean names
  REVIEW = 'REVIEW',
  SUBMITTING = 'SUBMITTING',
  COMPLETED = 'COMPLETED'
}
