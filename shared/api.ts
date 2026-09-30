import type { Message, Thread } from "./types"

/** Every error response uses this shape. See api-and-interface-design. */
export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "CONFLICT",
  "UPSTREAM_ERROR",
  "INTERNAL",
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    details?: unknown
  }
}

export interface CreateThreadInput {
  model: string
  title?: string
}

export interface UpdateThreadInput {
  title?: string
  model?: string
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatRequest {
  model: string
  session: string
  messages: ChatMessage[]
}

/**
 * The UI codes against this contract. The mock implements it now; the Worker
 * implements the same surface later, so swapping is a one-file change. Keep it
 * to what the app actually uses — every field is a promise. See Hyrum's Law.
 */
export interface ChatApi {
  listThreads(): Promise<Thread[]>
  createThread(input: CreateThreadInput): Promise<Thread>
  updateThread(id: string, input: UpdateThreadInput): Promise<Thread>
  deleteThread(id: string): Promise<void>
  listMessages(threadId: string): Promise<Message[]>
  appendMessage(threadId: string, content: string): Promise<Message>
  streamReply(
    threadId: string,
    onDelta: (chunk: string) => void,
    signal?: AbortSignal,
  ): Promise<void>
}
