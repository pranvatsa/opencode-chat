import type { APIContext } from "astro"
import { defineMiddleware } from "astro:middleware"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { env } from "cloudflare:workers"
import { jsonError } from "@/lib/http"

// Cross-cutting concerns only. Auth lives here so every endpoint inherits it.
// The CSP is emitted by the Cloudflare adapter from Astro's `security.csp`
// config (see astro.config.mjs); do not set it here or it will be clobbered.
const SECURITY_HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=15552000",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
}

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function keySet(teamDomain: string) {
  let set = keySets.get(teamDomain)
  if (!set) {
    set = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`))
    keySets.set(teamDomain, set)
  }
  return set
}

/**
 * Cloudflare Access gates the app in production. We verify the signed
 * `Cf-Access-Jwt-Assertion` ourselves rather than trusting the header, so a
 * misconfigured origin cannot be driven anonymously. Fails closed in
 * production when Access is not configured.
 */
async function requireAuth(context: APIContext): Promise<Response | null> {
  if (!context.url.pathname.startsWith("/api/")) return null

  const teamDomain = typeof env.CF_ACCESS_TEAM_DOMAIN === "string" ? env.CF_ACCESS_TEAM_DOMAIN : undefined
  const audience = typeof env.CF_ACCESS_AUD === "string" ? env.CF_ACCESS_AUD : undefined

  if (!teamDomain || !audience) {
    return import.meta.env.DEV
      ? null
      : jsonError("INTERNAL", "Server is not configured for authentication.", 500)
  }

  const assertion = context.request.headers.get("Cf-Access-Jwt-Assertion")
  if (!assertion) return jsonError("UNAUTHORIZED", "Authentication required.", 401)

  let owner: string
  try {
    const { payload } = await jwtVerify(assertion, keySet(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience,
    })
    // Access JWTs always carry `sub`; require it so the rate-limit key can never
    // collapse into one shared bucket.
    const subject = payload.sub ?? (typeof payload.email === "string" ? payload.email : undefined)
    if (typeof subject !== "string" || subject === "") {
      return jsonError("UNAUTHORIZED", "Token is missing a subject.", 401)
    }
    owner = subject
    context.locals.user = { email: typeof payload.email === "string" ? payload.email : undefined }
  } catch {
    return jsonError("UNAUTHORIZED", "Invalid credentials.", 401)
  }

  // Expensive route: throttle per identity. Best-effort — never block on
  // limiter trouble.
  if (context.url.pathname === "/api/chat") {
    try {
      const { success } = await env.CHAT_RATE_LIMITER.limit({ key: owner })
      if (!success) return jsonError("RATE_LIMITED", "Too many requests. Slow down.", 429)
    } catch (cause) {
      console.error("rate limiter unavailable", cause)
    }
  }

  return null
}

export const onRequest = defineMiddleware(async (context, next) => {
  let response: Response
  try {
    const denial = await requireAuth(context)
    response = denial ?? (await next())
  } catch (cause) {
    // One catch-all keeps every /api error in the documented shape.
    console.error("unhandled request error", cause)
    response = context.url.pathname.startsWith("/api/")
      ? jsonError("INTERNAL", "Something went wrong.", 500)
      : new Response("Internal Server Error", { status: 500 })
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value)
  }
  return response
})
