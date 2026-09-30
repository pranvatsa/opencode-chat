import type { APIRoute } from "astro"
import { UpdateThreadInputSchema } from "@shared/schemas"
import { jsonError } from "@/lib/http"
import { deleteThread, updateThread } from "@/server/threads"

export const prerender = false

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id
  if (!id) return jsonError("VALIDATION_ERROR", "Missing thread id.", 422)

  const parsed = UpdateThreadInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid thread update.", 422, parsed.error.issues)
  }

  const thread = await updateThread(id, parsed.data)
  if (!thread) return jsonError("NOT_FOUND", "Chat not found.", 404)
  return Response.json(thread)
}

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id
  if (!id) return jsonError("VALIDATION_ERROR", "Missing thread id.", 422)

  if (!(await deleteThread(id))) return jsonError("NOT_FOUND", "Chat not found.", 404)
  return new Response(null, { status: 204 })
}
