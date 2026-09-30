import type { APIRoute } from "astro"
import type { ApiErrorBody } from "@shared/api"
import { upstream } from "@/lib/upstream"

export const prerender = false

function error(code: ApiErrorBody["error"]["code"], message: string, status: number): Response {
  const body: ApiErrorBody = { error: { code, message } }
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

export const GET: APIRoute = async () => {
  const { key, base } = upstream()
  if (!key) return error("INTERNAL", "Server is missing its model API key.", 500)

  const response = await fetch(`${base}/models`, {
    headers: { authorization: `Bearer ${key}`, "user-agent": "opencode-chat/0.1" },
  })

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  })
}
