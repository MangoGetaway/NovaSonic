export type Provider = "ollama" | "lmstudio" | "llamacpp";

export interface LocalModel {
  key: string;
  id: string;
  label: string;
  provider: Provider;
}

export interface Conversation {
  id: string;
  title: string;
  model_key: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface DeltaEvent {
  request_id: string;
  text: string;
}

export interface FinishedEvent {
  request_id: string;
  text: string;
  error: string | null;
}
