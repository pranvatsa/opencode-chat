import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "astro/config"
import cloudflare from "@astrojs/cloudflare"
import vue from "@astrojs/vue"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  output: "server",
  adapter: cloudflare({ imageService: "passthrough" }),
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      },
    },
  },
})
