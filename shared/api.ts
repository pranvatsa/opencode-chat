import { z } from "zod"
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

export interface Paginated<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export const ListThreadsParamsSchema = z.object({
  q: z.string().trim().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
})
export type ListThreadsParams = z.input<typeof ListThreadsParamsSchema>

export const CreateThreadInputSchema = z.object({
  model: z.string().min(1),
  title: z.string().trim().min(1).max(120).optional(),
})
export type CreateThreadInput = z.infer<typeof CreateThreadInputSchema>

export const UpdateThreadInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    model: z.string().min(1).optional(),
  })
  .refine((value) => value.title !== undefined || value.model !== undefined, {
    message: "provide at least one field to update",
  })
export type UpdateThreadInput = z.infer<typeof UpdateThreadInputSchema>

export const AppendMessageInputSchema = z.object({
  content: z.string().trim().min(1).max(8000),
})
export type AppendMessageInput = z.infer<typeof AppendMessageInputSchema>

/**
 * The UI codes against this contract. The mock implements it now; the Worker
 * implements the same surface later, so swapping is a one-file change.
 */
export interface ChatApi {
  listThreads(params?: ListThreadsParams): Promise<Paginated<Thread>>
  createThread(input: CreateThreadInput): Promise<Thread>
  updateThread(id: string, input: UpdateThreadInput): Promise<Thread>
  deleteThread(id: string): Promise<void>
  listMessages(threadId: string): Promise<{ data: Message[] }>
  appendMessage(threadId: string, content: string): Promise<Message>
  streamReply(
    threadId: string,
    onDelta: (chunk: string) => void,
    signal?: AbortSignal,
  ): Promise<void>
}
