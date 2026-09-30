export type Role = "user" | "assistant"

export interface Message {
  id: string
  role: Role
  content: string
  createdAt: number
}

export interface Thread {
  id: string
  title: string
  model: string
  createdAt: number
  updatedAt: number
}

export interface Model {
  id: string
  label: string
}
