<script setup lang="ts">
import { ref } from "vue"
import { Check, Copy } from "@/components/icons"
import type { Message } from "@shared/types"
import { Button } from "@/components/ui/button"
import MarkdownContent from "./MarkdownContent.vue"

const props = defineProps<{ message: Message }>()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <article class="group mx-auto w-full max-w-3xl px-4 py-4">
    <div class="mb-1.5 flex items-center gap-2">
      <span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {{ message.role === "user" ? "You" : "Assistant" }}
      </span>
      <Button
        v-if="message.role === 'assistant' && message.content"
        variant="ghost"
        size="icon-sm"
        class="ml-auto opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        aria-label="Copy message"
        @click="copy"
      >
        <Check v-if="copied" class="size-3.5" />
        <Copy v-else class="size-3.5" />
      </Button>
    </div>

    <MarkdownContent v-if="message.role === 'assistant'" :content="message.content" />
    <p v-else class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
  </article>
</template>
