import type { Message, Model, Thread } from "@shared/types"

export const MODELS: Model[] = [
  { id: "deepseek-v4.1-flash", label: "DeepSeek V4.1 Flash" },
  { id: "glm-5.3", label: "GLM-5.3" },
  { id: "kimi-k2.7-code", label: "Kimi K2.7 Code" },
  { id: "qwen3.8-flash", label: "Qwen3.8 Flash" },
]

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const now = Date.now()

export const MOCK_THREADS: Thread[] = [
  { id: "t-notion", title: "Notion idea dump", model: "deepseek-v4.1-flash", createdAt: now - 26 * HOUR, updatedAt: now - 2 * HOUR },
  { id: "t-pipeline", title: "Refactor the ingest pipeline", model: "glm-5.3", createdAt: now - 3 * 24 * HOUR, updatedAt: now - 20 * HOUR },
  { id: "t-naming", title: "Naming the new repo", model: "qwen3.8-flash", createdAt: now - 5 * 24 * HOUR, updatedAt: now - 4 * 24 * HOUR },
]

export const MOCK_MESSAGES: Record<string, Message[]> = {
  "t-notion": [
    { id: "m1", role: "user", content: "Brain dump: a chat app for OpenCode Go models, phone and laptop, threads synced.", createdAt: now - 2 * HOUR },
    {
      id: "m2",
      role: "assistant",
      content: "Got it. Three things stand out:\n\n1. **Sync matters** — threads must live server-side, not in the browser.\n2. **Keep v1 small** — chat only, no tools.\n3. **$0 budget** — Cloudflare free tiers.\n\nWant me to turn this into a short spec?",
      createdAt: now - 2 * HOUR + 2000,
    },
  ],
  "t-pipeline": [
    { id: "m3", role: "user", content: "How would you split the ingest worker so it can scale?", createdAt: now - 21 * HOUR },
    {
      id: "m4",
      role: "assistant",
      content: "Split it at the queue boundary:\n\n```ts\nexport default {\n  async queue(batch, env) {\n    for (const msg of batch.messages) {\n      await handle(msg.body, env)\n    }\n  },\n}\n```\n\nThat keeps the HTTP path thin and lets the consumer retry independently.",
      createdAt: now - 20 * HOUR,
    },
  ],
  "t-naming": [
    { id: "m5", role: "user", content: "Give me a few repo names that aren't cringe.", createdAt: now - 4 * 24 * HOUR },
    { id: "m6", role: "assistant", content: "`opencode-chat`, `flarechat`, `zenchat`. I'd take the first — it says what it is.", createdAt: now - 4 * 24 * HOUR + 1000 },
  ],
}

const TEMPLATE = `Here is a quick take.

## What I'd do
- Start with the smallest version that works
- Keep the seams clean so it can grow
- Ship it, then iterate

\`\`\`ts
type Thread = {
  id: string
  title: string
  model: string
}
\`\`\`

Want me to go deeper on any of these?`

export interface StreamOptions {
  signal?: AbortSignal
  onDelta: (chunk: string) => void
}

export async function streamMockReply(prompt: string, { signal, onDelta }: StreamOptions): Promise<void> {
  const text = `You said “${prompt.trim()}”.\n\n${TEMPLATE}`
  const tokens = text.match(/\s+|\S+/g) ?? []
  for (const token of tokens) {
    if (signal?.aborted) return
    onDelta(token)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
