import { computed, type ComputedRef, type WritableComputedRef } from "vue"

/** Reactive view of `value` without the given keys. */
export function reactiveOmit<T extends object, K extends keyof T>(
  value: T,
  ...keys: K[]
): ComputedRef<Omit<T, K>> {
  return computed(() => {
    const result = { ...value }
    for (const key of keys) delete (result as Record<string, unknown>)[key as string]
    return result as Omit<T, K>
  })
}

export interface VModelOptions<T> {
  defaultValue?: T
}

/** Two-way binding helper: at most a few lines, so it lives here, not in a dep. */
export function useVModel<P extends Record<string, unknown>, K extends keyof P>(
  props: P,
  key: K,
  emit: (...args: any[]) => void,
  options: VModelOptions<P[K]> = {},
): WritableComputedRef<P[K]> {
  return computed<P[K]>({
    get: () => (props[key] === undefined ? (options.defaultValue as P[K]) : (props[key] as P[K])),
    set: (value) => emit(`update:${String(key)}`, value),
  })
}
