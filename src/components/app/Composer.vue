<script setup lang="ts">
import { ref } from "vue"
import { ArrowUp, Square } from "@/components/icons"
import { Button } from "@/components/ui/button"

const props = defineProps<{ disabled?: boolean; streaming?: boolean }>()
const emit = defineEmits<{ send: [value: string]; stop: [] }>()

const value = ref("")
const field = ref<HTMLTextAreaElement | null>(null)

function resize() {
  const node = field.value
  if (!node) return
  node.style.height = "auto"
  node.style.height = `${Math.min(node.scrollHeight, 200)}px`
}

function submit() {
  const text = value.value.trim()
  // Never clear the draft unless the parent can actually accept it.
  if (!text || props.disabled || props.streaming) return
  emit("send", text)
  value.value = ""
  requestAnimationFrame(resize)
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) return
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <form class="shrink-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" @submit.prevent="submit">
    <div
      class="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-1 focus-within:ring-ring"
    >
      <textarea
        id="composer"
        ref="field"
        v-model="value"
        rows="1"
        name="message"
        placeholder="Send a message"
        aria-label="Message"
        class="max-h-52 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        :disabled="disabled"
        @input="resize"
        @keydown="onKeydown"
      />
      <Button
        v-if="streaming"
        type="button"
        size="icon"
        variant="secondary"
        class="shrink-0"
        aria-label="Stop generating"
        @click="emit('stop')"
      >
        <Square class="size-3.5" />
      </Button>
      <Button v-else type="submit" size="icon" class="shrink-0" aria-label="Send message" :disabled="disabled || !value.trim()">
        <ArrowUp class="size-4" />
      </Button>
    </div>
  </form>
</template>
