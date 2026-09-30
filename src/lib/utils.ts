export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | null | undefined>

/**
 * Joins class values. Unlike `clsx` + `tailwind-merge`, this does not resolve
 * conflicting Tailwind utilities — call sites must not pass a utility that
 * contradicts a component default; use a variant instead (see AGENTS.md).
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  const walk = (value: ClassValue): void => {
    if (!value) return
    if (typeof value === "string" || typeof value === "number") {
      out.push(String(value))
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    for (const [name, enabled] of Object.entries(value)) if (enabled) out.push(name)
  }
  for (const input of inputs) walk(input)
  return out.join(" ")
}
