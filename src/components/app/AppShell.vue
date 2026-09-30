<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import type { Message, Thread } from "@shared/types"
import { ApiError, createMockApi } from "@/lib/api"
import AppSidebar from "./AppSidebar.vue"
import ChatView from "./ChatView.vue"

const DEFAULT_MODEL = "deepseek-v4.1-flash"
const api = createMockApi()

const threads = ref<Thread[]>([])
const messages = ref<Record<string, Message[]>>({})
const activeId = ref<string | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const sidebarOpen = ref(false)
const streaming = ref(false)
const drawer = ref<HTMLElement | null>(null)
let controller: AbortController | null = null

const activeThread = computed(() => threads.value.find((thread) => thread.id === activeId.value) ?? null)
const activeMessages = computed(() => (activeId.value ? (messages.value[activeId.value] ?? []) : []))

function report(cause: unknown) {
  error.value = cause instanceof ApiError ? cause.message : "Something went wrong."
  console.error(cause)
}

async function loadMessages(id: string) {
  if (messages.value[id]) return
  const { data } = await api.listMessages(id)
  messages.value[id] = data
}

async function select(id: string) {
  activeId.value = id
  sidebarOpen.value = false
  try {
    await loadMessages(id)
  } catch (cause) {
    report(cause)
  }
}

onMounted(async () => {
  try {
    const page = await api.listThreads()
    threads.value = page.data
    const first = page.data[0]
    if (first) {
      activeId.value = first.id
      await loadMessages(first.id)
    }
  } catch (cause) {
    report(cause)
  } finally {
    loading.value = false
  }
})

async function create() {
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
  try {
    const updated = await api.updateThread(id, { title })
    threads.value = threads.value.map((thread) => (thread.id === id ? updated : thread))
  } catch (cause) {
    report(cause)
  }
}

async function remove(id: string) {
  try {
    await api.deleteThread(id)
    threads.value = threads.value.filter((thread) => thread.id !== id)
    delete messages.value[id]
    if (activeId.value === id) activeId.value = threads.value[0]?.id ?? null
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
  try {
    const user = await api.appendMessage(thread.id, text)
    const list = messages.value[thread.id] ?? (messages.value[thread.id] = [])
    list.push(user)

    // Reactive so streaming mutations re-render; a plain object would not.
    const reply = reactive<Message>({ id: crypto.randomUUID(), role: "assistant", content: "", createdAt: Date.now() })
    list.push(reply)

    streaming.value = true
    controller = new AbortController()
    await api.streamReply(thread.id, (chunk) => (reply.content += chunk), controller.signal)

    if (thread.title === "New chat") {
      const updated = await api.updateThread(thread.id, { title: text.slice(0, 48) })
      threads.value = threads.value.map((item) => (item.id === thread.id ? updated : item))
    }
  } catch (cause) {
    report(cause)
  } finally {
    streaming.value = false
    controller = null
  }
}

function stop() {
  controller?.abort()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") sidebarOpen.value = false
}

watch(sidebarOpen, async (open) => {
  if (open) {
    document.addEventListener("keydown", onKeydown)
    await nextTick()
    drawer.value?.querySelector<HTMLInputElement>("input")?.focus()
  } else {
    document.removeEventListener("keydown", onKeydown)
  }
})

onUnmounted(() => document.removeEventListener("keydown", onKeydown))
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

    <div v-if="sidebarOpen" ref="drawer" class="fixed inset-0 z-40 md:hidden">
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
      :streaming="streaming"
      :loading="loading"
      :error="error"
      @send="send"
      @stop="stop"
      @open-sidebar="sidebarOpen = true"
      @set-model="setModel"
    />
  </div>
</template>
