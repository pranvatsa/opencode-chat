import { env } from "cloudflare:workers"
import type { Message, Role, Thread } from "@shared/types"

interface ThreadRow {
  id: string
  title: string
  model: string
  created_at: number
  updated_at: number
}

interface MessageRow {
  id: string
  role: Role
  content: string
  created_at: number
}

const toThread = (row: ThreadRow): Thread => ({
  id: row.id,
  title: row.title,
  model: row.model,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  role: row.role,
  content: row.content,
  createdAt: row.created_at,
})

export async function listThreads(): Promise<Thread[]> {
  const { results } = await env.DB.prepare(
    "SELECT id, title, model, created_at, updated_at FROM threads ORDER BY updated_at DESC",
  ).all<ThreadRow>()
  return results.map(toThread)
}

export async function getThread(id: string): Promise<Thread | null> {
  const row = await env.DB.prepare(
    "SELECT id, title, model, created_at, updated_at FROM threads WHERE id = ?",
  )
    .bind(id)
    .first<ThreadRow>()
  return row ? toThread(row) : null
}

export async function createThread(model: string, title: string): Promise<Thread> {
  const now = Date.now()
  const thread: Thread = { id: crypto.randomUUID(), title, model, createdAt: now, updatedAt: now }
  await env.DB.prepare(
    "INSERT INTO threads (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(thread.id, thread.title, thread.model, thread.createdAt, thread.updatedAt)
    .run()
  return thread
}

export async function updateThread(
  id: string,
  patch: { title?: string; model?: string },
): Promise<Thread | null> {
  const existing = await getThread(id)
  if (!existing) return null
  const title = patch.title ?? existing.title
  const model = patch.model ?? existing.model
  const updatedAt = Date.now()
  await env.DB.prepare("UPDATE threads SET title = ?, model = ?, updated_at = ? WHERE id = ?")
    .bind(title, model, updatedAt, id)
    .run()
  return { ...existing, title, model, updatedAt }
}

export async function deleteThread(id: string): Promise<boolean> {
  if (!(await getThread(id))) return false
  await env.DB.batch([
    env.DB.prepare("DELETE FROM messages WHERE thread_id = ?").bind(id),
    env.DB.prepare("DELETE FROM threads WHERE id = ?").bind(id),
  ])
  return true
}

export async function listMessages(threadId: string): Promise<Message[]> {
  const { results } = await env.DB.prepare(
    "SELECT id, role, content, created_at FROM messages WHERE thread_id = ? ORDER BY created_at ASC",
  )
    .bind(threadId)
    .all<MessageRow>()
  return results.map(toMessage)
}

/** Returns the new message id so a failed turn can be rolled back. */
export async function appendMessage(threadId: string, role: Role, content: string): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()
  await env.DB.batch([
    env.DB.prepare("INSERT INTO messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, threadId, role, content, now),
    env.DB.prepare("UPDATE threads SET updated_at = ? WHERE id = ?").bind(now, threadId),
  ])
  return id
}

export async function deleteMessage(id: string): Promise<void> {
  await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run()
}
