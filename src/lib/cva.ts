type VariantMap = Record<string, Record<string, string>>

export type VariantProps<F> = F extends (props?: infer P) => string ? NonNullable<P> : never

interface Config<V extends VariantMap> {
  variants?: V
  defaultVariants?: { [K in keyof V]?: keyof V[K] }
}

type Selection<V extends VariantMap> = { [K in keyof V]?: keyof V[K] | null | undefined }

/** Minimal class-variance-authority replacement (no conflict resolution). */
export function cva<V extends VariantMap>(base: string, config: Config<V> = {}) {
  const variants = (config.variants ?? {}) as V
  const defaults = (config.defaultVariants ?? {}) as { [K in keyof V]?: keyof V[K] }
  return (selection?: Selection<V>): string => {
    const classes = [base]
    for (const name of Object.keys(variants) as (keyof V & string)[]) {
      const chosen = selection?.[name] ?? defaults[name]
      if (chosen == null) continue
      const value = variants[name][chosen as string]
      if (value) classes.push(value)
    }
    return classes.filter(Boolean).join(" ")
  }
}
