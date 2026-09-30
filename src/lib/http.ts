import type { ApiErrorBody, ApiErrorCode } from "@shared/api"

/** The single JSON error shape every endpoint returns. */
export function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
): Response {
  const body: ApiErrorBody = { error: { code, message, details } }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}
