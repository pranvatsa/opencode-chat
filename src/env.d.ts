// `cloudflare:workers` is a virtual module provided by the Workers runtime.
// This declaration covers the parts we use; add bindings here as they appear.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>
}
