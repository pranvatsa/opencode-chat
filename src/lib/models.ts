import type { Model } from "@shared/types"

// Friendly names for models we know; anything else falls back to a tidied id.
const LABELS: Record<string, string> = {
  "deepseek-v4.1-flash": "DeepSeek V4.1 Flash",
  "deepseek-v4-pro": "DeepSeek V4 Pro",
  "deepseek-v4-flash": "DeepSeek V4 Flash",
  "glm-5.3": "GLM-5.3",
  "glm-5.3-flash": "GLM-5.3 Flash",
  "kimi-k2.7-code": "Kimi K2.7 Code",
  "kimi-k3": "Kimi K3",
  "qwen3.8-flash": "Qwen3.8 Flash",
  "qwen3.8-max": "Qwen3.8 Max",
  "minimax-m3": "MiniMax M3",
}

export function labelFor(id: string): string {
  return (
    LABELS[id] ??
    id
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  )
}

/** Shown until `/api/models` responds, and if it ever fails. */
export const FALLBACK_MODELS: Model[] = [
  { id: "deepseek-v4.1-flash", label: labelFor("deepseek-v4.1-flash") },
  { id: "glm-5.3", label: labelFor("glm-5.3") },
  { id: "kimi-k2.7-code", label: labelFor("kimi-k2.7-code") },
  { id: "qwen3.8-flash", label: labelFor("qwen3.8-flash") },
]
