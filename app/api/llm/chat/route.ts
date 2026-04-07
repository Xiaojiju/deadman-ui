import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

import {
  getSessionContextMemory,
  updateSessionContextMemory,
} from "@/app/server/chat-store"
import { providerStore } from "@/app/server/provider"
import type { ContentPart, LlmMessage } from "@/app/typing"
import { LlmChatRequest, LlmChatResponse } from "@/app/typing"
import {
  SYSTEM_PROMPT,
  CODE_MODE_SUFFIX,
  EXPLAIN_MODE_SUFFIX,
  ANALYZE_MODE_SUFFIX,
  TRANSLATE_MODE_SUFFIX,
  WRITE_MODE_SUFFIX,
} from "@/app/server/prompt"
import { ChatCompletionMessageParam } from "openai/resources"

// 简单的本地缓存，避免频繁创建 OpenAI 实例
const clientCache = new Map<string, OpenAI>()

type SessionMemory = {
  summary: string
  /**
   * 截止到哪条消息（不含）已经被纳入 summary
   * 使用「客户端发送的 messages 数组下标」作为锚点
   */
  summarizedUntil: number
  updatedAt: number
}

// MVP：内存级会话记忆（进程重启会丢，适合先验证效果）
const sessionMemoryStore = new Map<string, SessionMemory>()

function buildSystemPrompt(
  mode?: "chat" | "code" | "explain" | "analyze" | "write" | "translate"
) {
  switch (mode) {
    case "code":
      return SYSTEM_PROMPT + CODE_MODE_SUFFIX
    case "explain":
      return SYSTEM_PROMPT + EXPLAIN_MODE_SUFFIX
    case "analyze":
      return SYSTEM_PROMPT + ANALYZE_MODE_SUFFIX
    case "write":
      return SYSTEM_PROMPT + WRITE_MODE_SUFFIX
    case "translate":
      return SYSTEM_PROMPT + TRANSLATE_MODE_SUFFIX
    case "chat":
    default:
      return SYSTEM_PROMPT
  }
}

const MAX_RECENT_MESSAGES = 12
const MAX_SUMMARY_CHARS = 1200
/** 估算「系统提示 + 摘要 + 最近窗口」总字符超限时才触发 LLM 压缩，避免每条消息都总结 */
const MAX_CONTEXT_CHARS_BEFORE_COMPRESS = 12000

function toChatMessages(raw: LlmMessage[]): ChatCompletionMessageParam[] {
  const out: ChatCompletionMessageParam[] = []

  const push = (msg: ChatCompletionMessageParam) => out.push(msg)

  const normalizeParts = (parts: ContentPart[]) => {
    const normalized: ContentPart[] = []
    for (const p of parts) {
      if (p.type === "text") {
        const text = p.text?.trim()
        if (text) normalized.push({ type: "text", text })
      } else if (p.type === "image_url") {
        const url = p.image_url?.url?.trim()
        if (url) normalized.push({ type: "image_url", image_url: { url } })
      }
    }
    return normalized
  }

  for (const m of raw) {
    const role = m.role
    const content = m.content

    if (typeof content === "string") {
      const text = content.trim()
      if (text) push({ role, content: text })
      continue
    }

    if (Array.isArray(content)) {
      const parts = normalizeParts(content)
      if (parts.length > 0) {
        push({ role, content: parts } as unknown as ChatCompletionMessageParam)
      }
      continue
    }

    // null/empty: ignore
  }

  return out
}

function buildSessionKey(body: LlmChatRequest) {
  return body.sessionId?.trim() || "default"
}

function clampSummary(s: string) {
  if (s.length <= MAX_SUMMARY_CHARS) return s
  return s.slice(0, MAX_SUMMARY_CHARS)
}

async function loadPersistedMemory(sessionKey: string): Promise<SessionMemory> {
  if (sessionKey === "default") {
    return (
      sessionMemoryStore.get("default") ?? {
        summary: "",
        summarizedUntil: 0,
        updatedAt: Date.now(),
      }
    )
  }
  const ctx = await getSessionContextMemory(sessionKey)
  if (!ctx) {
    return { summary: "", summarizedUntil: 0, updatedAt: Date.now() }
  }
  return {
    summary: ctx.summary,
    summarizedUntil: ctx.summarizedMessageCount,
    updatedAt: ctx.updatedAt,
  }
}

function shouldCompressContext(params: {
  body: LlmChatRequest
  mode?: "chat" | "code" | "explain" | "analyze" | "write" | "translate"
  memory: SessionMemory
  fullMessages: ChatCompletionMessageParam[]
}): boolean {
  const system = buildSystemPrompt(params.mode)
  const userProfile = params.body.memory?.userProfile?.trim()
  const filtered = params.fullMessages.filter((m) => m.role !== "system")
  const recent = filtered.slice(-MAX_RECENT_MESSAGES)
  const parts = [
    system,
    userProfile ? `用户偏好:\n${userProfile}` : "",
    params.memory.summary?.trim() ?? "",
    ...recent.map((m) => String(m.content ?? "")),
  ].filter(Boolean)
  const blob = parts.join("\n")
  return blob.length > MAX_CONTEXT_CHARS_BEFORE_COMPRESS
}

async function updateSessionSummary(params: {
  client: OpenAI
  model: string
  sessionKey: string
  memory: SessionMemory
  fullMessages: ChatCompletionMessageParam[]
}) {
  const { client, model, sessionKey, memory, fullMessages } = params

  // 只总结「不在最近窗口」的历史片段，避免把“活跃上下文”变成摘要后丢细节
  const summarizeUntil = Math.max(0, fullMessages.length - MAX_RECENT_MESSAGES)
  const newChunk = fullMessages.slice(memory.summarizedUntil, summarizeUntil)
  if (newChunk.length <= 0) return memory

  const summarizerMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: [
        "你是一个对话记忆压缩器。",
        "任务：把对话中对后续回答最重要的信息压缩成「可追加更新」的摘要。",
        "要求：",
        "- 只保留关键信息：用户目标/偏好、已确认事实、关键决策、未解决问题、重要上下文。",
        "- 不要加入你自己的新推断；不确定就标注不确定。",
        "- 中文输出，尽量短，最多 10 条要点。",
        "- 仅输出摘要正文，不要加标题。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "已有摘要（可能为空）：",
        memory.summary?.trim() ? memory.summary.trim() : "(空)",
        "",
        "需要纳入摘要的新对话片段：",
        ...newChunk.map((m) => `${m.role}: ${m.content}`),
        "",
        "请输出更新后的摘要：",
      ].join("\n"),
    },
  ]

  const completion = await client.chat.completions.create({
    model,
    messages: summarizerMessages,
    stream: false,
  })

  const choice = completion.choices[0]
  const content =
    typeof choice.message.content === "string" ? choice.message.content : ""

  const next: SessionMemory = {
    summary: clampSummary(content.trim()),
    summarizedUntil: summarizeUntil,
    updatedAt: Date.now(),
  }

  if (sessionKey === "default") {
    sessionMemoryStore.set(sessionKey, next)
  } else {
    await updateSessionContextMemory(sessionKey, {
      summary: next.summary,
      summarizedMessageCount: next.summarizedUntil,
    })
  }
  return next
}

function buildModelMessages(params: {
  body: LlmChatRequest
  mode?: "chat" | "code" | "explain" | "analyze" | "write" | "translate"
  memory?: SessionMemory
  incoming: ChatCompletionMessageParam[]
}) {
  const { body, mode, memory, incoming } = params
  const system = buildSystemPrompt(mode)

  // 防注入：忽略客户端传来的 system 消息，系统提示词由服务端统一控制
  const filtered = incoming.filter((m) => m.role !== "system")
  const recent = filtered.slice(-MAX_RECENT_MESSAGES)

  const out: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
  ]

  const userProfile = body.memory?.userProfile?.trim()
  if (userProfile) {
    out.push({
      role: "system",
      content: `已知用户偏好/画像（请遵守）：\n${userProfile}`,
    })
  }

  if (memory?.summary?.trim()) {
    out.push({
      role: "system",
      content: `会话记忆摘要（用于延续上下文，可能不完整）：\n${memory.summary.trim()}`,
    })
  }

  out.push(...recent)
  return out
}

function getCachedClient(apiKey: string, baseURL: string, cacheKey: string) {
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!
  }
  const client = new OpenAI({ apiKey, baseURL })
  clientCache.set(cacheKey, client)
  return client
}

async function handleStreamChat(params: {
  client: OpenAI
  model: string
  body: LlmChatRequest
}) {
  const { client, model, body } = params
  const mode = body.mode as
    | "chat"
    | "code"
    | "explain"
    | "analyze"
    | "write"
    | "translate"
    | undefined
  const sessionKey = buildSessionKey(body)
  const incoming = toChatMessages(body.messages)
  const existing = await loadPersistedMemory(sessionKey)

  const messages = buildModelMessages({
    body,
    mode,
    memory: existing,
    incoming,
  })

  const stream = await client.chat.completions.create({
    model,
    messages: messages,
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      let assistantText = ""
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta
          if (!delta?.content) continue
          assistantText += delta.content
          controller.enqueue(encoder.encode(delta.content))
        }
        // 流式结束后：把 assistant 回复纳入会话摘要
        const fullAfter: ChatCompletionMessageParam[] = [
          ...incoming.filter((m) => m.role !== "system"),
          { role: "assistant", content: assistantText },
        ]
        const current = await loadPersistedMemory(sessionKey)
        const needCompress = shouldCompressContext({
          body,
          mode,
          memory: current,
          fullMessages: fullAfter,
        })
        if (needCompress) {
          await updateSessionSummary({
            client,
            model,
            sessionKey,
            memory: current,
            fullMessages: fullAfter,
          })
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}

async function handleNonStreamChat(params: {
  client: OpenAI
  model: string
  body: LlmChatRequest
}) {
  const { client, model, body } = params

  const mode = body.mode as
    | "chat"
    | "code"
    | "explain"
    | "analyze"
    | "write"
    | "translate"
    | undefined
  const sessionKey = buildSessionKey(body)
  const incoming = toChatMessages(body.messages)
  const existing = await loadPersistedMemory(sessionKey)

  const messages = buildModelMessages({
    body,
    mode,
    memory: existing,
    incoming,
  })

  const completion = await client.chat.completions.create({
    model,
    messages: messages,
    stream: false,
  })

  const choice = completion.choices[0]
  const content =
    typeof choice.message.content === "string" ? choice.message.content : ""

  // 非流式：把 assistant 回复纳入会话摘要
  const fullAfter: ChatCompletionMessageParam[] = [
    ...incoming.filter((m) => m.role !== "system"),
    { role: "assistant", content },
  ]
  const current = await loadPersistedMemory(sessionKey)
  if (
    shouldCompressContext({
      body,
      mode,
      memory: current,
      fullMessages: fullAfter,
    })
  ) {
    await updateSessionSummary({
      client,
      model,
      sessionKey,
      memory: current,
      fullMessages: fullAfter,
    })
  }

  const resp: LlmChatResponse = {
    id: completion.id,
    createdAt: Date.now(),
    model,
    message: {
      role: "assistant",
      content,
    },
    usage: completion.usage
      ? {
          inputTokens: completion.usage?.prompt_tokens ?? 0,
          outputTokens: completion.usage?.completion_tokens ?? 0,
          totalTokens: completion.usage?.total_tokens ?? 0,
        }
      : undefined,
  }

  return NextResponse.json(resp, { status: 200 })
}

export async function POST(req: NextRequest) {
  let body: LlmChatRequest
  try {
    body = (await req.json()) as LlmChatRequest
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    )
  }

  const model = body.model
  if (!model) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "model is required" } },
      { status: 400 }
    )
  }

  const provider = providerStore.getProviderByModel(model)
  if (!provider) {
    return NextResponse.json(
      {
        error: {
          code: "PROVIDER_NOT_FOUND",
          message: `No provider for model ${model}`,
        },
      },
      { status: 400 }
    )
  }

  const cacheKey = `${provider.name}:${provider.base_url}`
  const client = getCachedClient(provider.api_key, provider.base_url, cacheKey)

  // 流式模式：返回 text 流，前端做打字机效果
  if (body.stream) {
    return handleStreamChat({ client, model, body })
  }

  // 非流式：一次性返回完整 JSON
  return handleNonStreamChat({ client, model, body })
}
