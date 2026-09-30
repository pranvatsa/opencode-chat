import type { Message, Thread } from "@shared/types"
import type {
  ApiErrorCode,
  ChatApi,
  ChatRequest,
  CreateThreadInput,
  UpdateThreadInput,
} from "@shared/api"
import { MOCK_MESSAGES, MOCK_THREADS } from "./mock"

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status = 500,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createStore() {
  return {
    threads: [...MOCK_THREADS],
    messages: Object.fromEntries(Object.entries(MOCK_MESSAGES).map(([id, list]) => [id, [...list]])),
  }
}

const store = createStore()

/**
 * Temporary client-side `ChatApi`. Threads live in memory until D1 lands;
 * `streamReply` already talks to the real `/api/chat` proxy.
 */
export function createMockApi(): ChatApi {
  return {
    async listThreads(): Promise<Thread[]> {
      await sleep(140)
      return [...store.threads]
    },

    async createThread(input: CreateThreadInput): Promise<Thread> {
      if (!input.model) throw new ApiError("VALIDATION_ERROR", "model is required.", 422)
      await sleep(80)
      const thread: Thread = {
        id: crypto.randomUUID(),
        title: input.title?.trim() || "New chat",
        model: input.model,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      store.threads = [thread, ...store.threads]
      store.messages[thread.id] = []
      return thread
    },

    async updateThread(id: string, input: UpdateThreadInput): Promise<Thread> {
      if (input.title === undefined && input.model === undefined) {
        throw new ApiError("VALIDATION_ERROR", "provide at least one field to update.", 422)
      }
      const thread = store.threads.find((item) => item.id === id)
      if (!thread) throw new ApiError("NOT_FOUND", "Chat not found.", 404)
      const updated: Thread = { ...thread, ...input, updatedAt: Date.now() }
      store.threads = store.threads.map((item) => (item.id === id ? updated : item))
      return updated
    },

    async deleteThread(id: string): Promise<void> {
      if (!store.threads.some((item) => item.id === id)) {
        throw new ApiError("NOT_FOUND", "Chat not found.", 404)
      }
      store.threads = store.threads.filter((item) => item.id !== id)
      delete store.messages[id]
    },

    async listMessages(threadId: string): Promise<Message[]> {
      await sleep(90)
      const stored = store.messages[threadId]
      if (!stored) throw new ApiError("NOT_FOUND", "Chat not found.", 404)
      return [...stored]
    },

    async appendMessage(threadId: string, content: string): Promise<Message> {
      const text = content.trim()
      if (!text) throw new ApiError("VALIDATION_ERROR", "content is required.", 422)
      const list = store.messages[threadId]
      if (!list) throw new ApiError("NOT_FOUND", "Chat not found.", 404)
      const message: Message = { id: crypto.randomUUID(), role: "user", content: text, createdAt: Date.now() }
      list.push(message)
      return message
    },

    async streamReply(threadId: string, onDelta, signal?: AbortSignal): Promise<void> {
      const thread = store.threads.find((item) => item.id === threadId)
      const history = store.messages[threadId]
      if (!thread || !history) throw new ApiError("NOT_FOUND", "Chat not found.", 404)

      const messages = history
        .filter((message) => message.content.trim() !== "")
        .map((message) => ({ role: message.role, content: message.content }))
      if (!messages.length) throw new ApiError("CONFLICT", "No message to reply to.", 409)

      const body: ChatRequest = { model: thread.model, session: threadId, messages }

      let response: Response
      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal,
        })
      } catch (cause) {
        // Aborts are a normal stop, not a failure — let the caller see them.
        if (signal?.aborted) throw cause
        throw new ApiError("UPSTREAM_ERROR", "Could not reach the model.")
      }

      if (!response.ok || !response.body) {
        throw new ApiError("UPSTREAM_ERROR", `Model request failed (${response.status}).`, 502)
      }

      const emit = (event: string) => {
        for (const line of event.split("\n")) {
          if (!line.startsWith("data:")) continue
          const payload = line.slice(5).trim()
          if (payload === "[DONE]") continue
          try {
            const delta = JSON.parse(payload).choices?.[0]?.delta?.content
            if (typeof delta === "string" && delta) onDelta(delta)
          } catch {
            // keepalives and partial frames
          }
        }
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n")
          let index: number
          while ((index = buffer.indexOf("\n\n")) !== -1) {
            emit(buffer.slice(0, index))
            buffer = buffer.slice(index + 2)
          }
        }
        buffer += decoder.decode()
        if (buffer.trim()) emit(buffer)
      } finally {
        reader.cancel().catch(() => {})
      }
    },
  }
}
