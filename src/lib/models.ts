import type { Model } from "@shared/types"

/** Model catalog shown in the picker. Static until wired to `/api/models`. */
export const MODELS: Model[] = [
  { id: "deepseek-v4.1-flash", label: "DeepSeek V4.1 Flash" },
  { id: "glm-5.3", label: "GLM-5.3" },
  { id: "kimi-k2.7-code", label: "Kimi K2.7 Code" },
  { id: "qwen3.8-flash", label: "Qwen3.8 Flash" },
]
