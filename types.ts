export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface DesignStyle {
  id: string;
  name: string;
  prompt: string;
  previewColor: string;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  EDITING = 'EDITING',
}

export interface ToolCallResponse {
  functionCalls: {
    id: string;
    name: string;
    args: Record<string, any>;
  }[];
}
