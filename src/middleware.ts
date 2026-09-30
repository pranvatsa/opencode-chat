import { defineMiddleware } from "astro:middleware"

// Cross-cutting concerns only: security headers now, Cloudflare Access JWT
// verification when Access is enabled (verify Cf-Access-Jwt-Assertion here so
// endpoints never re-check it).
const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
}

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next()
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value)
  }
  return response
})
