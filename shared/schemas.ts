import { z } from "zod"

/**
 * Boundary validation for the server endpoints. Imported only by files that
 * run on the server, so `zod` never reaches the browser bundle.
 */

export const ListThreadsParamsSchema = z.object({
  q: z.string().trim().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
})

export const CreateThreadInputSchema = z.object({
  model: z.string().min(1).max(120),
  title: z.string().trim().min(1).max(120).optional(),
})

export const UpdateThreadInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    model: z.string().min(1).max(120).optional(),
  })
  .refine((value) => value.title !== undefined || value.model !== undefined, {
    message: "provide at least one field to update",
  })

export const AppendMessageInputSchema = z.object({
  content: z.string().trim().min(1).max(8000),
})

export const ChatRequestSchema = z.object({
  model: z.string().min(1).max(120),
  session: z.string().min(1).max(128),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(24000),
      }),
    )
    .min(1)
    .max(200),
})
