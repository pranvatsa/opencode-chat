import type { APIRoute } from "astro"
import { jsonError } from "@/lib/http"
import { getThread, listMessages } from "@/server/threads"

export const prerender = false

export const GET: APIRoute = async ({ params }) => {
  const id = params.id
  if (!id) return jsonError("VALIDATION_ERROR", "Missing thread id.", 422)

  if (!(await getThread(id))) return jsonError("NOT_FOUND", "Chat not found.", 404)
  return Response.json(await listMessages(id))
}
