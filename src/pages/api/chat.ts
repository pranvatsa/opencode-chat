import type { APIRoute } from "astro"
import { ChatRequestSchema } from "@shared/schemas"
import { jsonError } from "@/lib/http"
import { upstream } from "@/lib/upstream"
import { appendMessage, getThread, listMessages } from "@/server/threads"

export const prerender = false

const MAX_BODY_BYTES = 256 * 1024

/** Extracts assistant text from a complete OpenAI-style SSE payload. */
function assistantText(raw: string): string {
  let text = ""
  for (const frame of raw.split("\n\n")) {
    for (const line of frame.split("\n")) {
      if (!line.startsWith("data:")) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === "[DONE]") continue
      try {
        const delta = JSON.parse(payload).choices?.[0]?.delta?.content
        if (typeof delta === "string") text += delta
      } catch {
        // keepalives and partial frames
      }
    }
  }
  return text
}

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

  const { threadId, text } = parsed.data
  const thread = await getThread(threadId)
  if (!thread) return jsonError("NOT_FOUND", "Chat not found.", 404)

  const history = await listMessages(threadId)
  await appendMessage(threadId, "user", text)

  const messages = [
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: "user", content: text },
  ]

  let response: Response
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "user-agent": "opencode-chat/0.1",
        "x-opencode-session": threadId,
      },
      body: JSON.stringify({ model: thread.model, messages, stream: true }),
      // Streams run long, so there is no request timeout; a client disconnect
      // aborts the upstream call instead.
      signal: context.request.signal,
    })
  } catch {
    return jsonError("UPSTREAM_ERROR", "Could not reach the model.", 502)
  }

  if (!response.ok || !response.body) {
    // Keep the provider's body server-side; never echo it to the client.
    const detail = response.body ? (await response.text()).slice(0, 500) : ""
    console.error(`upstream chat failed: ${response.status} ${detail}`)
    return jsonError("UPSTREAM_ERROR", `Model request failed (${response.status}).`, 502)
  }

  // Pass the stream through and record the assistant reply when it ends.
  const decoder = new TextDecoder()
  let raw = ""
  const recorder = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk)
      raw += decoder.decode(chunk, { stream: true })
    },
    async flush() {
      raw += decoder.decode()
      const content = assistantText(raw).trim()
      if (!content) return
      try {
        await appendMessage(threadId, "assistant", content)
      } catch (cause) {
        console.error("failed to record assistant message", cause)
      }
    },
  })

  return new Response(response.body.pipeThrough(recorder), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/event-stream",
      "cache-control": "no-store",
    },
  })
}
