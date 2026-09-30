import { env as workerEnv } from "cloudflare:workers"

export interface Upstream {
  key?: string
  base: string
}

/**
 * Reads upstream config from the Cloudflare Worker environment (bindings,
 * secrets, and vars — including `.dev.vars` in local dev). The key never
 * leaves the server.
 */
export function upstream(): Upstream {
  const env = workerEnv as unknown as Record<string, unknown>
  const key = typeof env.OPENCODE_GO_API_KEY === "string" ? env.OPENCODE_GO_API_KEY : undefined
  const raw = typeof env.OPENCODE_GO_BASE_URL === "string" ? env.OPENCODE_GO_BASE_URL : "https://opencode.ai/zen/go/v1"
  return { key, base: raw.replace(/\/+$/, "") }
}
