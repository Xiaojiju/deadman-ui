import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

import { providerStore } from "@/app/server/provider"
import { getSession, updateSessionTitle } from "@/app/server/chat-store"

const clientCache = new Map<string, OpenAI>()

function getCachedClient(apiKey: string, baseURL: string, cacheKey: string) {
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!
  }
  const client = new OpenAI({ apiKey, baseURL })
  clientCache.set(cacheKey, client)
  return client
}

/** 超过此长度则用模型生成摘要标题 */
const TITLE_PLAIN_MAX = 40
/** 无模型可用时，长文本截断展示长度 */
const TITLE_FALLBACK_LEN = 36

function sanitizeTitle(s: string) {
  return s.replace(/\s+/g, " ").trim().slice(0, 80)
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await ctx.params

  let body: { text?: string; model?: string }
  try {
    body = (await req.json()) as { text?: string; model?: string }
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    )
  }

  const text = typeof body.text === "string" ? body.text.trim() : ""
  const model = typeof body.model === "string" ? body.model.trim() : ""

  if (!text) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "text is required" } },
      { status: 400 }
    )
  }

  const data = await getSession(sessionId)
  if (!data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    )
  }

  const defaultTitle = "New chat"
  if (data.session.title !== defaultTitle) {
    return NextResponse.json({ title: data.session.title, unchanged: true })
  }

  let title: string
  if (text.length <= TITLE_PLAIN_MAX) {
    title = sanitizeTitle(text)
  } else if (!model) {
    title = sanitizeTitle(
      text.slice(0, TITLE_FALLBACK_LEN) + (text.length > TITLE_FALLBACK_LEN ? "…" : "")
    )
  } else {
    const provider = providerStore.getProviderByModel(model)
    if (!provider) {
      title = sanitizeTitle(
        text.slice(0, TITLE_FALLBACK_LEN) + (text.length > TITLE_FALLBACK_LEN ? "…" : "")
      )
    } else {
      const cacheKey = `${provider.name}:${provider.base_url}`
      const client = getCachedClient(provider.api_key, provider.base_url, cacheKey)
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "你是会话标题助手。只输出一句简短标题，用于在对话列表里显示。" +
                "要求：不超过 24 个字；不要引号；不要前缀或解释；与用户语言一致；概括用户意图。",
            },
            {
              role: "user",
              content: text,
            },
          ],
          temperature: 0.3,
          max_tokens: 80,
          stream: false,
        })
        const raw =
          typeof completion.choices[0]?.message?.content === "string"
            ? completion.choices[0].message.content
            : ""
        title = sanitizeTitle(raw.replace(/^["']|["']$/g, "").trim())
        if (!title) {
          title = sanitizeTitle(
            text.slice(0, TITLE_FALLBACK_LEN) +
              (text.length > TITLE_FALLBACK_LEN ? "…" : "")
          )
        }
      } catch {
        title = sanitizeTitle(
          text.slice(0, TITLE_FALLBACK_LEN) +
            (text.length > TITLE_FALLBACK_LEN ? "…" : "")
        )
      }
    }
  }

  const updated = await updateSessionTitle(sessionId, title)
  return NextResponse.json({
    title: updated?.title ?? title,
  })
}
