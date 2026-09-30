/**
 * OpenAI-compatible SSE parsing, shared by the server (which records the
 * assistant reply) and the client (which streams it). One implementation so
 * the two cannot drift.
 */

/** Returns the assistant content in one SSE frame (one or more `data:` lines). */
export function contentFromSseFrame(frame: string): string {
  let text = ""
  for (const line of frame.split("\n")) {
    if (!line.startsWith("data:")) continue
    const payload = line.slice(5).trim()
    if (!payload || payload === "[DONE]") continue
    try {
      const delta = JSON.parse(payload).choices?.[0]?.delta?.content
      if (typeof delta === "string") text += delta
    } catch {
      // keepalives and partial frames
    }
  }
  return text
}

/** Returns the full assistant text from a complete SSE payload. */
export function assistantTextFromSse(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n\n")
    .map(contentFromSseFrame)
    .join("")
}
