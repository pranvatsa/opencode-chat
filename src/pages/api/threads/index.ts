import type { APIRoute } from "astro"
import { CreateThreadInputSchema } from "@shared/schemas"
import { jsonError } from "@/lib/http"
import { createThread, listThreads } from "@/server/threads"

export const prerender = false

export const GET: APIRoute = async () => Response.json(await listThreads())

export const POST: APIRoute = async ({ request }) => {
  const parsed = CreateThreadInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid thread.", 422, parsed.error.issues)
  }
  const title = parsed.data.title?.trim() || "New chat"
  return Response.json(await createThread(parsed.data.model, title), { status: 201 })
}
