import { LlmChatRequest, LlmChatResponse, LlmModel } from "@/app/typing"
import type {
  SessionContextMemory,
  StoredChatMessage,
  StoredChatSession,
} from "@/app/server/chat-store"

export async function callLlmChat(
  req: LlmChatRequest
): Promise<LlmChatResponse> {
  const res = await fetch("/api/llm/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(
      error?.error?.message ?? `LLM request failed: ${res.status}`
    )
  }

  return (await res.json()) as LlmChatResponse
}

export async function callLlmChatStream(
  req: LlmChatRequest,
  onToken: (chunk: string) => void
): Promise<void> {
  const res = await fetch("/api/llm/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...req, stream: true }),
  })

  if (!res.ok || !res.body) {
    const error = await res.json().catch(() => null)
    throw new Error(
      error?.error?.message ?? `LLM request failed: ${res.status}`
    )
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    if (text) onToken(text)
  }
}

export async function getLlmModels(): Promise<LlmModel[]> {
  const res = await fetch("/api/llm/models")
  if (!res.ok) {
    throw new Error(`LLM models request failed: ${res.status}`)
  }
  return (await res.json()) as LlmModel[]
}

export async function listChatSessions(): Promise<StoredChatSession[]> {
  const res = await fetch("/api/chat/sessions")
  if (!res.ok) throw new Error(`List sessions failed: ${res.status}`)
  return (await res.json()) as StoredChatSession[]
}

export async function createChatSession(input?: {
  id?: string
  title?: string
}): Promise<StoredChatSession> {
  const res = await fetch("/api/chat/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  })
  if (!res.ok) throw new Error(`Create session failed: ${res.status}`)
  return (await res.json()) as StoredChatSession
}

export async function getChatSession(sessionId: string): Promise<{
  session: StoredChatSession
  messages: StoredChatMessage[]
  contextMemory?: SessionContextMemory
}> {
  const res = await fetch(`/api/chat/sessions/${sessionId}`)
  if (!res.ok) throw new Error(`Get session failed: ${res.status}`)
  return (await res.json()) as {
    session: StoredChatSession
    messages: StoredChatMessage[]
    contextMemory?: SessionContextMemory
  }
}

export async function appendChatMessage(params: {
  sessionId: string
  role: "user" | "assistant"
  content: string
}): Promise<StoredChatMessage> {
  const res = await fetch(`/api/chat/sessions/${params.sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: params.role, content: params.content }),
  })
  if (!res.ok) throw new Error(`Append message failed: ${res.status}`)
  return (await res.json()) as StoredChatMessage
}

const TITLE_PREVIEW_MAX = 40

/** 首条消息时根据用户输入生成会话标题并写入服务端（短句直接用，长句走模型摘要） */
export async function finalizeSessionTitle(params: {
  sessionId: string
  text: string
  model: string
}): Promise<{ title: string; unchanged?: boolean }> {
  const res = await fetch(`/api/chat/sessions/${params.sessionId}/title`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: params.text, model: params.model }),
  })
  if (!res.ok) throw new Error(`Finalize title failed: ${res.status}`)
  return (await res.json()) as { title: string; unchanged?: boolean }
}

export function previewSessionTitle(text: string) {
  const t = text.trim()
  if (t.length <= TITLE_PREVIEW_MAX) return t
  return `${t.slice(0, 37)}…`
}
