import type { APIRoute } from "astro"
import { ChatRequestSchema } from "@shared/schemas"
import { jsonError } from "@/lib/http"
import { upstream } from "@/lib/upstream"

export const prerender = false

const MAX_BODY_BYTES = 256 * 1024

export const POST: APIRoute = async (context) => {
  const { key, base } = upstream()
  if (!key) return jsonError("INTERNAL", "Server is missing its model API key.", 500)

  if (Number(context.request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) {
    return jsonError("VALIDATION_ERROR", "Request body too large.", 413)
  }

  const parsed = ChatRequestSchema.safeParse(await context.request.json().catch(() => null))
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid chat request.", 422, parsed.error.issues)
  }

  const { model, session, messages } = parsed.data

  let response: Response
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "user-agent": "opencode-chat/0.1",
        "x-opencode-session": session,
      },
      body: JSON.stringify({ model, messages, stream: true }),
      // Streams run long, so there is no request timeout; a client disconnect
      // aborts the upstream call instead.
      signal: context.request.signal,
    })
  } catch {
    return jsonError("UPSTREAM_ERROR", "Could not reach the model.", 502)
  }

  if (!response.ok) {
    // Keep the provider's body server-side; never echo it to the client.
    console.error(`upstream chat failed: ${response.status} ${(await response.text()).slice(0, 500)}`)
    return jsonError("UPSTREAM_ERROR", `Model request failed (${response.status}).`, 502)
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/event-stream",
      "cache-control": "no-store",
    },
  })
}
