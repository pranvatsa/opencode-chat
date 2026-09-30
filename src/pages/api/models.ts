import type { APIRoute } from "astro"
import { jsonError } from "@/lib/http"
import { upstream } from "@/lib/upstream"

export const prerender = false

export const GET: APIRoute = async () => {
  const { key, base } = upstream()
  if (!key) return jsonError("INTERNAL", "Server is missing its model API key.", 500)

  let response: Response
  try {
    response = await fetch(`${base}/models`, {
      headers: { authorization: `Bearer ${key}`, "user-agent": "opencode-chat/0.1" },
    })
  } catch {
    return jsonError("UPSTREAM_ERROR", "Could not reach the model catalog.", 502)
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  })
}
