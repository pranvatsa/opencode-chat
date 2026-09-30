<script lang="ts">
import { marked } from "marked"

// Module scope: runs once, not per component instance.
marked.setOptions({ gfm: true, breaks: true })
</script>

<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue"
import DOMPurify from "dompurify"
import { marked } from "marked"

// Parse/sanitize on a leading-edge throttle so streaming stays smooth without
// waiting on the first paint.
const THROTTLE_MS = 120
const SANITIZE = { FORBID_ATTR: ["style"] }

const props = defineProps<{ content: string }>()
const html = ref("")
let lastRender = 0
let timer: ReturnType<typeof setTimeout> | undefined

function render() {
  if (timer) {
    clearTimeout(timer)
    timer = undefined
  }
  lastRender = Date.now()
  html.value = DOMPurify.sanitize(marked.parse(props.content, { async: false }) as string, SANITIZE)
}

function schedule() {
  if (timer) return
  const wait = THROTTLE_MS - (Date.now() - lastRender)
  if (wait <= 0) render()
  else timer = setTimeout(render, wait)
}

watch(() => props.content, schedule, { immediate: true })
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <!-- Content is sanitized by DOMPurify before it reaches v-html. -->
  <div class="markdown text-sm" v-html="html" />
</template>

<style scoped>
.markdown :deep(> :first-child) {
  margin-top: 0;
}
.markdown :deep(> :last-child) {
  margin-bottom: 0;
}
.markdown :deep(p) {
  margin: 0.5rem 0;
  line-height: 1.65;
}
.markdown :deep(h2),
.markdown :deep(h3) {
  margin: 1rem 0 0.5rem;
  font-weight: 600;
}
.markdown :deep(h2) {
  font-size: 0.95rem;
}
.markdown :deep(ul),
.markdown :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
}
.markdown :deep(ul) {
  list-style: disc;
}
.markdown :deep(ol) {
  list-style: decimal;
}
.markdown :deep(li) {
  margin: 0.2rem 0;
}
.markdown :deep(a) {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.markdown :deep(code) {
  background: var(--muted);
  border-radius: 0.25rem;
  padding: 0.1rem 0.3rem;
  font-size: 0.85em;
}
.markdown :deep(pre) {
  margin: 0.75rem 0;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--card);
  padding: 0.75rem;
}
.markdown :deep(pre code) {
  background: transparent;
  padding: 0;
  font-size: 0.85em;
}
</style>
