import { ZodError } from "zod"
import type { Message, Thread } from "@shared/types"
import {
  AppendMessageInputSchema,
  CreateThreadInputSchema,
  ListThreadsParamsSchema,
  UpdateThreadInputSchema,
  type ApiErrorBody,
  type ApiErrorCode,
  type ChatApi,
  type CreateThreadInput,
  type ListThreadsParams,
  type Paginated,
  type UpdateThreadInput,
} from "@shared/api"
import { MOCK_MESSAGES, MOCK_THREADS, streamMockReply } from "./mock"

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message, details: this.details } }
  }
}

function toApiError(cause: unknown): ApiError {
  if (cause instanceof ApiError) return cause
  if (cause instanceof ZodError) {
    return new ApiError("VALIDATION_ERROR", "Invalid request.", 422, cause.issues)
  }
  return new ApiError("INTERNAL", "Something went wrong.", 500)
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

export function createMockApi(): ChatApi {
  return {
    async listThreads(input: ListThreadsParams = {}): Promise<Paginated<Thread>> {
      try {
        const { q, page, pageSize } = ListThreadsParamsSchema.parse(input)
        await sleep(140)
        const matching = q
          ? store.threads.filter((thread) => thread.title.toLowerCase().includes(q.toLowerCase()))
          : store.threads
        const start = (page - 1) * pageSize
        return {
          data: matching.slice(start, start + pageSize),
          pagination: {
            page,
            pageSize,
            totalItems: matching.length,
            totalPages: Math.max(1, Math.ceil(matching.length / pageSize)),
          },
        }
      } catch (cause) {
        throw toApiError(cause)
      }
    },

    async createThread(input: CreateThreadInput): Promise<Thread> {
      try {
        const { model, title } = CreateThreadInputSchema.parse(input)
        await sleep(80)
        const thread: Thread = {
          id: crypto.randomUUID(),
          title: title ?? "New chat",
          model,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        store.threads = [thread, ...store.threads]
        store.messages[thread.id] = []
        return thread
      } catch (cause) {
        throw toApiError(cause)
      }
    },

    async updateThread(id: string, input: UpdateThreadInput): Promise<Thread> {
      try {
        const patch = UpdateThreadInputSchema.parse(input)
        const thread = store.threads.find((item) => item.id === id)
        if (!thread) throw new ApiError("NOT_FOUND", "Chat not found.", 404)
        const updated: Thread = { ...thread, ...patch, updatedAt: Date.now() }
        store.threads = store.threads.map((item) => (item.id === id ? updated : item))
        return updated
      } catch (cause) {
        throw toApiError(cause)
      }
    },

    async deleteThread(id: string): Promise<void> {
      if (!store.threads.some((item) => item.id === id)) {
        throw new ApiError("NOT_FOUND", "Chat not found.", 404)
      }
      store.threads = store.threads.filter((item) => item.id !== id)
      delete store.messages[id]
    },

    async listMessages(threadId: string): Promise<{ data: Message[] }> {
      await sleep(90)
      const stored = store.messages[threadId]
      if (!stored) throw new ApiError("NOT_FOUND", "Chat not found.", 404)
      return { data: [...stored] }
    },

    async appendMessage(threadId: string, content: string): Promise<Message> {
      try {
        const { content: text } = AppendMessageInputSchema.parse({ content })
        const list = store.messages[threadId]
        if (!list) throw new ApiError("NOT_FOUND", "Chat not found.", 404)
        const message: Message = { id: crypto.randomUUID(), role: "user", content: text, createdAt: Date.now() }
        list.push(message)
        return message
      } catch (cause) {
        throw toApiError(cause)
      }
    },

    async streamReply(threadId: string, onDelta, signal?: AbortSignal): Promise<void> {
      const last = store.messages[threadId]?.findLast((message) => message.role === "user")
      if (!last) throw new ApiError("CONFLICT", "No message to reply to.", 409)
      await streamMockReply(last.content, { signal, onDelta })
    },
  }
}
