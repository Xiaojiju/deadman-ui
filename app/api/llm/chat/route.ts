import { NextRequest } from "next/server"
import OpenAI from "openai"

import { providerStore } from "@/app/server/provider"
import { LlmChatRequest, LlmChatResponse } from "@/app/typing" // 你已有的类型
import { ChatCompletionMessageParam } from "openai/resources"

export async function POST(req: NextRequest) {
  let body: LlmChatRequest
  try {
    body = (await req.json()) as LlmChatRequest
  } catch {
    return new Response(
      JSON.stringify({
        error: { code: "BAD_REQUEST", message: "Invalid JSON" },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const model = body.model
  if (!model) {
    return new Response(
      JSON.stringify({
        error: { code: "BAD_REQUEST", message: "model is required" },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const provider = providerStore.getProviderByModel(model)
  if (!provider) {
    return new Response(
      JSON.stringify({
        error: {
          code: "PROVIDER_NOT_FOUND",
          message: `No provider for model ${model}`,
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const client = new OpenAI({
    apiKey: provider.api_key,
    baseURL: provider.base_url,
  })

  // 先给你非流式版（简单好接）
  const completion = await client.chat.completions.create({
    model,
    messages: body.messages as unknown as ChatCompletionMessageParam[],
    stream: false,
  })

  const choice = completion.choices[0]
  const content =
    typeof choice.message.content === "string" ? choice.message.content : "" // 多模态时你再扩展

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

  return new Response(JSON.stringify(resp), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
