import type { APIRoute } from "astro"
import { ChatRequestSchema } from "@shared/schemas"
import type { ApiErrorBody } from "@shared/api"
import { upstream } from "@/lib/upstream"

export const prerender = false

function error(code: ApiErrorBody["error"]["code"], message: string, status: number, details?: unknown): Response {
  const body: ApiErrorBody = { error: { code, message, details } }
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

export const POST: APIRoute = async (context) => {
  const { key, base } = upstream()
  if (!key) return error("INTERNAL", "Server is missing its model API key.", 500)

  const parsed = ChatRequestSchema.safeParse(await context.request.json().catch(() => null))
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Invalid chat request.", 422, parsed.error.issues)
  }

  const { model, session, messages } = parsed.data

  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "user-agent": "opencode-chat/0.1",
      "x-opencode-session": session,
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal: context.request.signal,
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 2000)
    return error("UPSTREAM_ERROR", `Model request failed (${response.status}).`, 502, detail)
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/event-stream",
      "cache-control": "no-store",
    },
  })
}
