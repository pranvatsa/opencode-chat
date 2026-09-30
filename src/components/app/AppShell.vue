<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import type { Message, Model, Thread } from "@shared/types"
import { ApiError, createApi } from "@/lib/api"
import { FALLBACK_MODELS } from "@/lib/models"
import AppSidebar from "./AppSidebar.vue"
import ChatView from "./ChatView.vue"

const DEFAULT_MODEL = "deepseek-v4.1-flash"
const api = createApi()

const models = ref<Model[]>(FALLBACK_MODELS)
const threads = ref<Thread[]>([])
const messages = ref<Record<string, Message[]>>({})
const activeId = ref<string | null>(null)
const loading = ref(true)
const messagesLoading = ref(false)
const error = ref<string | null>(null)
const sidebarOpen = ref(false)
const streaming = ref(false)
const drawer = ref<HTMLElement | null>(null)
let controller: AbortController | null = null
let streamThreadId: string | null = null
let previousFocus: HTMLElement | null = null

const activeThread = computed(() => threads.value.find((thread) => thread.id === activeId.value) ?? null)
const activeMessages = computed(() => (activeId.value ? (messages.value[activeId.value] ?? []) : []))

function report(cause: unknown) {
  error.value = cause instanceof ApiError ? cause.message : "Something went wrong."
  console.error(cause)
}

async function loadMessages(id: string) {
  if (messages.value[id]) return
  messagesLoading.value = true
  try {
    messages.value[id] = await api.listMessages(id)
  } finally {
    messagesLoading.value = false
  }
}

async function activate(id: string | null) {
  activeId.value = id
  if (id) await loadMessages(id)
}

async function select(id: string) {
  error.value = null
  sidebarOpen.value = false
  try {
    await activate(id)
  } catch (cause) {
    report(cause)
  }
}

onMounted(async () => {
  void api
    .listModels()
    .then((list) => {
      if (list.length) models.value = list
    })
    .catch(() => {
      // keep the fallback list
    })
  try {
    threads.value = await api.listThreads()
    await activate(threads.value[0]?.id ?? null)
  } catch (cause) {
    report(cause)
  } finally {
    loading.value = false
  }
})

async function create() {
  error.value = null
  try {
    const thread = await api.createThread({ model: DEFAULT_MODEL })
    threads.value = [thread, ...threads.value]
    messages.value[thread.id] = []
    activeId.value = thread.id
    sidebarOpen.value = false
  } catch (cause) {
    report(cause)
  }
}

async function rename(id: string, title: string) {
  const next = title.trim()
  if (!next) return
  try {
    const updated = await api.updateThread(id, { title: next })
    threads.value = threads.value.map((thread) => (thread.id === id ? updated : thread))
  } catch (cause) {
    report(cause)
  }
}

async function remove(id: string) {
  error.value = null
  try {
    if (streamThreadId === id) stop()
    await api.deleteThread(id)
    threads.value = threads.value.filter((thread) => thread.id !== id)
    delete messages.value[id]
    if (activeId.value === id) await activate(threads.value[0]?.id ?? null)
  } catch (cause) {
    report(cause)
  }
}

async function setModel(model: string) {
  const id = activeId.value
  if (!id) return
  try {
    const updated = await api.updateThread(id, { model })
    threads.value = threads.value.map((thread) => (thread.id === id ? updated : thread))
  } catch (cause) {
    report(cause)
  }
}

async function send(text: string) {
  const thread = activeThread.value
  if (!thread || streaming.value) return

  // Claim the guard before the first await so a second send cannot slip in.
  streaming.value = true
  error.value = null
  controller = new AbortController()
  streamThreadId = thread.id

  const list = messages.value[thread.id] ?? (messages.value[thread.id] = [])
  list.push({ id: crypto.randomUUID(), role: "user", content: text, createdAt: Date.now() })

  // Reactive so streaming mutations re-render; a plain object would not.
  const reply = reactive<Message>({ id: crypto.randomUUID(), role: "assistant", content: "", createdAt: Date.now() })
  list.push(reply)

  try {
    await api.sendMessage(thread.id, text, (chunk) => (reply.content += chunk), controller.signal)

    if (thread.title === "New chat") {
      const updated = await api.updateThread(thread.id, { title: text.slice(0, 48) })
      threads.value = threads.value.map((item) => (item.id === thread.id ? updated : item))
    }
  } catch (cause) {
    // A stop is a normal end, not a failure.
    if (!controller.signal.aborted) report(cause)
  } finally {
    streaming.value = false
    controller = null
    streamThreadId = null
  }
}

function stop() {
  controller?.abort()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    sidebarOpen.value = false
    return
  }
  if (event.key !== "Tab" || !drawer.value) return
  const focusable = Array.from(
    drawer.value.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'),
  ).filter((element) => element.offsetParent !== null)
  if (focusable.length < 2) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(sidebarOpen, async (open) => {
  if (open) {
    previousFocus = document.activeElement as HTMLElement | null
    document.addEventListener("keydown", onKeydown)
    await nextTick()
    drawer.value?.querySelector<HTMLInputElement>("input")?.focus()
  } else {
    document.removeEventListener("keydown", onKeydown)
    previousFocus?.focus()
    previousFocus = null
  }
})

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown)
  controller?.abort()
})
</script>

<template>
  <div class="flex h-dvh w-full overflow-hidden">
    <AppSidebar
      class="hidden w-72 shrink-0 border-r md:flex"
      :threads="threads"
      :active-id="activeId"
      @create="create"
      @select="select"
      @rename="rename"
      @remove="remove"
    />

    <div
      v-if="sidebarOpen"
      ref="drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Chats"
      class="fixed inset-0 z-40 md:hidden"
    >
      <button
        type="button"
        class="absolute inset-0 bg-black/60"
        aria-label="Close chats"
        @click="sidebarOpen = false"
      />
      <AppSidebar
        class="absolute inset-y-0 left-0 flex w-72 max-w-[85%] border-r shadow-xl"
        :threads="threads"
        :active-id="activeId"
        @create="create"
        @select="select"
        @rename="rename"
        @remove="remove"
      />
    </div>

    <ChatView
      class="flex min-w-0 flex-1 flex-col"
      :thread="activeThread"
      :messages="activeMessages"
      :models="models"
      :streaming="streaming"
      :loading="loading || messagesLoading"
      :error="error"
      @send="send"
      @stop="stop"
      @open-sidebar="sidebarOpen = true"
      @set-model="setModel"
    />
  </div>
</template>
