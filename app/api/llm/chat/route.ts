import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

import { providerStore } from "@/app/server/provider"
import { LlmChatRequest, LlmChatResponse } from "@/app/typing"
import { ChatCompletionMessageParam } from "openai/resources"

// 简单的本地缓存，避免频繁创建 OpenAI 实例
const clientCache = new Map<string, OpenAI>()

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

  const stream = await client.chat.completions.create({
    model,
    messages: body.messages as unknown as ChatCompletionMessageParam[],
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta
          if (!delta?.content) continue
          controller.enqueue(encoder.encode(delta.content))
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

  const completion = await client.chat.completions.create({
    model,
    messages: body.messages as unknown as ChatCompletionMessageParam[],
    stream: false,
  })

  const choice = completion.choices[0]
  const content =
    typeof choice.message.content === "string" ? choice.message.content : ""

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
