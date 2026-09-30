import type { APIContext } from "astro"
import { defineMiddleware } from "astro:middleware"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { env } from "cloudflare:workers"
import { jsonError } from "@/lib/http"

// Cross-cutting concerns only. Auth lives here so every endpoint inherits it.
const SECURITY_HEADERS: Record<string, string> = {
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

  const environment = env
  const teamDomain = typeof environment.CF_ACCESS_TEAM_DOMAIN === "string" ? environment.CF_ACCESS_TEAM_DOMAIN : undefined
  const audience = typeof environment.CF_ACCESS_AUD === "string" ? environment.CF_ACCESS_AUD : undefined

  if (!teamDomain || !audience) {
    return import.meta.env.DEV
      ? null
      : jsonError("INTERNAL", "Server is not configured for authentication.", 500)
  }

  const assertion = context.request.headers.get("Cf-Access-Jwt-Assertion")
  if (!assertion) return jsonError("UNAUTHORIZED", "Authentication required.", 401)

  try {
    const { payload } = await jwtVerify(assertion, keySet(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience,
    })
    context.locals.user = { email: typeof payload.email === "string" ? payload.email : undefined }
    return null
  } catch {
    return jsonError("UNAUTHORIZED", "Invalid credentials.", 401)
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const denial = await requireAuth(context)
  const response = denial ?? (await next())
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value)
  }
  return response
})
