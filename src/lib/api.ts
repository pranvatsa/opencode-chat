import type { Message, Model, Thread } from "@shared/types"
import type { ApiErrorBody, ApiErrorCode, ChatApi, ChatRequest } from "@shared/api"
import { labelFor } from "./models"

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

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    let code: ApiErrorCode = "INTERNAL"
    let message = `Request failed (${response.status}).`
    try {
      const body = (await response.json()) as ApiErrorBody
      code = body.error.code
      message = body.error.message
    } catch {
      // non-JSON error body; keep the default message
    }
    throw new ApiError(code, message, response.status)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}

/** Talks to the Worker API. Nothing here knows about the model provider. */
export function createApi(): ChatApi {
  return {
    async listModels(): Promise<Model[]> {
      const body = await request<{ data?: Array<{ id?: string } | string> } | Array<{ id?: string }>>(
        "/api/models",
      )
      const items = Array.isArray(body) ? body : (body.data ?? [])
      return items
        .map((item) => (typeof item === "string" ? item : (item?.id ?? "")))
        .filter((id): id is string => Boolean(id))
        .map((id) => ({ id, label: labelFor(id) }))
    },
    listThreads: () => request<Thread[]>("/api/threads"),
    createThread: (input) => request<Thread>("/api/threads", jsonInit("POST", input)),
    updateThread: (id, input) => request<Thread>(`/api/threads/${id}`, jsonInit("PATCH", input)),
    deleteThread: (id) => request<void>(`/api/threads/${id}`, { method: "DELETE" }),
    listMessages: (threadId) => request<Message[]>(`/api/threads/${threadId}/messages`),

    async sendMessage(threadId, text, onDelta, signal) {
      const body: ChatRequest = { threadId, text }

      let response: Response
      try {
        response = await fetch("/api/chat", { ...jsonInit("POST", body), signal })
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
