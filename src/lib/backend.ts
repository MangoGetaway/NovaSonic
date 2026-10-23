import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ChatMessage, Conversation, DeltaEvent, FinishedEvent, LocalModel } from "../types";

export const backend = {
  discover: () => invoke<LocalModel[]>("discover_models"),
  conversations: () => invoke<Conversation[]>("list_conversations"),
  messages: (conversationId: string) => invoke<ChatMessage[]>("list_messages", { conversationId }),
  create: (modelKey: string) => invoke<Conversation>("create_conversation", { modelKey }),
  appendUser: (conversationId: string, content: string) =>
    invoke<ChatMessage>("append_message", { conversationId, content }),
  remove: (conversationId: string) => invoke<void>("delete_conversation", { conversationId }),
  start: (conversationId: string, modelKey: string, requestId: string) =>
    invoke<void>("start_chat", { conversationId, modelKey, requestId }),
  cancel: (requestId: string) => invoke<void>("cancel_chat", { requestId }),
  onDelta: (cb: (event: DeltaEvent) => void): Promise<UnlistenFn> =>
    listen<DeltaEvent>("novasonic://chat-delta", (event) => cb(event.payload)),
  onFinished: (cb: (event: FinishedEvent) => void): Promise<UnlistenFn> =>
    listen<FinishedEvent>("novasonic://chat-finished", (event) => cb(event.payload))
};
