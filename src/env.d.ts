/// <reference types="@cloudflare/workers-types" />

// Bindings for the Workers runtime. workers-types types `cloudflare:workers`
// `env` as `Cloudflare.Env`, so bindings are declared here.
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    CHAT_RATE_LIMITER: RateLimit
    OPENCODE_GO_API_KEY?: string
    OPENCODE_GO_BASE_URL?: string
    CF_ACCESS_TEAM_DOMAIN?: string
    CF_ACCESS_AUD?: string
  }
}

declare namespace App {
  interface Locals {
    user?: { email?: string }
    /** Workers execution context, provided by the Cloudflare adapter. */
    cfContext?: ExecutionContext
  }
}
