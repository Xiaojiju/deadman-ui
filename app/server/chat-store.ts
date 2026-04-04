import { promises as fs } from "node:fs"
import path from "node:path"

export type ChatRole = "user" | "assistant"

export type StoredChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
}

export type StoredChatSession = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

/** 持久化在会话文件中的上下文摘要（供 LLM 路由避免每次重算） */
export type SessionContextMemory = {
  summary: string
  /** 已纳入摘要的对话消息条数（从 messages 数组开头计数，与 chat route 中 summarizedUntil 一致） */
  summarizedMessageCount: number
  updatedAt: number
}

const MAX_CONTEXT_SUMMARY_CHARS = 12000

const DATA_DIR = path.join(process.cwd(), ".data", "chat-sessions")

function sessionFile(sessionId: string) {
  return path.join(DATA_DIR, `${sessionId}.json`)
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function safeId(id: string) {
  // 防路径穿越 + 兼容文件名
  return id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

type SessionDoc = {
  session: StoredChatSession
  messages: StoredChatMessage[]
  contextMemory?: SessionContextMemory
}

async function readDoc(sessionId: string): Promise<SessionDoc | null> {
  await ensureDir()
  const file = sessionFile(sessionId)
  try {
    const raw = await fs.readFile(file, "utf8")
    const doc = JSON.parse(raw) as SessionDoc
    if (!doc?.session?.id || !Array.isArray(doc.messages)) return null
    return doc
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as NodeJS.ErrnoException).code === "ENOENT"
    )
      return null
    throw e
  }
}

async function writeDoc(sessionId: string, doc: SessionDoc) {
  await ensureDir()
  const file = sessionFile(sessionId)
  await fs.writeFile(file, JSON.stringify(doc, null, 2), "utf8")
}

export async function listSessions(): Promise<StoredChatSession[]> {
  await ensureDir()
  const entries = await fs.readdir(DATA_DIR).catch(() => [])
  const sessions: StoredChatSession[] = []

  for (const name of entries) {
    if (!name.endsWith(".json")) continue
    const id = name.slice(0, -".json".length)
    const doc = await readDoc(id)
    if (doc?.session) sessions.push(doc.session)
  }

  sessions.sort((a, b) => b.updatedAt - a.updatedAt)
  return sessions
}

export async function createSession(input?: {
  id?: string
  title?: string
}): Promise<StoredChatSession> {
  const id = safeId(input?.id || newId()) || newId()
  const now = Date.now()
  const title = (input?.title?.trim() || "New chat").slice(0, 80)

  const existing = await readDoc(id)
  if (existing) return existing.session

  const session: StoredChatSession = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
  }

  await writeDoc(id, { session, messages: [] })
  return session
}

export async function getSession(sessionId: string): Promise<{
  session: StoredChatSession
  messages: StoredChatMessage[]
  contextMemory?: SessionContextMemory
} | null> {
  const id = safeId(sessionId)
  if (!id) return null
  const doc = await readDoc(id)
  if (!doc) return null
  return {
    session: doc.session,
    messages: doc.messages,
    contextMemory: doc.contextMemory,
  }
}

function clampContextSummary(s: string) {
  const t = s.replace(/\s+/g, " ").trim()
  if (t.length <= MAX_CONTEXT_SUMMARY_CHARS) return t
  return t.slice(0, MAX_CONTEXT_SUMMARY_CHARS)
}

export async function updateSessionContextMemory(
  sessionId: string,
  memory: { summary: string; summarizedMessageCount: number }
): Promise<void> {
  const id = safeId(sessionId)
  if (!id) return
  const doc = await readDoc(id)
  if (!doc) return
  doc.contextMemory = {
    summary: clampContextSummary(memory.summary),
    summarizedMessageCount: memory.summarizedMessageCount,
    updatedAt: Date.now(),
  }
  await writeDoc(id, doc)
}

/** 供 LLM 路由读取持久化摘要，避免每次全量会话再算 */
export async function getSessionContextMemory(
  sessionId: string
): Promise<SessionContextMemory | null> {
  const id = safeId(sessionId)
  if (!id) return null
  const doc = await readDoc(id)
  return doc?.contextMemory ?? null
}

export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<StoredChatSession | null> {
  const id = safeId(sessionId)
  if (!id) return null
  const doc = await readDoc(id)
  if (!doc) return null
  const next = title.replace(/\s+/g, " ").trim().slice(0, 80)
  if (!next) return doc.session
  doc.session.title = next
  doc.session.updatedAt = Date.now()
  await writeDoc(id, doc)
  return doc.session
}

export async function appendMessage(params: {
  sessionId: string
  role: ChatRole
  content: string
}): Promise<StoredChatMessage> {
  const id = safeId(params.sessionId)
  if (!id) throw new Error("Invalid sessionId")

  const doc =
    (await readDoc(id)) ??
    ({
      session: await createSession({ id, title: "New chat" }),
      messages: [],
    } satisfies SessionDoc)

  const msg: StoredChatMessage = {
    id: newId(),
    role: params.role,
    content: params.content,
    createdAt: Date.now(),
  }

  doc.messages.push(msg)
  doc.session.updatedAt = Date.now()
  await writeDoc(id, doc)
  return msg
}
