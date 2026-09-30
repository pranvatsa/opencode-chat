import { z } from "zod"

/**
 * Boundary validation for the server endpoints. Imported only by files that
 * run on the server, so `zod` never reaches the browser bundle.
 */

const SESSION_ID = /^[A-Za-z0-9._:-]{1,128}$/
const MAX_TOTAL_CONTENT = 200_000

export const ChatRequestSchema = z
  .object({
    // A session id is interpolated into a request header upstream, so it must
    // be a safe token — never free text.
    session: z.string().regex(SESSION_ID, "invalid session id"),
    model: z.string().min(1).max(120),
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
  .refine((value) => value.messages.reduce((total, message) => total + message.content.length, 0) <= MAX_TOTAL_CONTENT, {
    message: "conversation too large",
  })

export type ChatRequestInput = z.infer<typeof ChatRequestSchema>
