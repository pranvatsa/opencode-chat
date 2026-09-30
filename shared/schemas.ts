import { z } from "zod"

/**
 * Boundary validation for the server endpoints. Imported only by files that
 * run on the server, so `zod` never reaches the browser bundle.
 */

const ID = /^[A-Za-z0-9_-]{1,64}$/

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

export const ChatRequestSchema = z.object({
  // Interpolated into an upstream request header, so it must be a safe token.
  threadId: z.string().regex(ID, "invalid thread id"),
  text: z.string().trim().min(1).max(24000),
})

export type ChatRequestInput = z.infer<typeof ChatRequestSchema>
