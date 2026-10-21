export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  /** Set when generation failed; the text is shown instead of a normal reply. */
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  persona: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  system: string;
}

export interface Settings {
  apiKey: string;
  model: string;
  theme: 'light' | 'dark';
}

/** A provider turns a conversation into a stream of text chunks. */
export interface StreamRequest {
  system: string;
  messages: { role: Role; content: string }[];
  signal: AbortSignal;
}

export type ChatProvider = (req: StreamRequest) => AsyncIterable<string>;
