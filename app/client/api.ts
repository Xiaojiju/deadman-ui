import { LlmChatRequest, LlmChatResponse, LlmModel } from "@/app/typing"

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

export async function getLlmModels(): Promise<LlmModel[]> {
  const res = await fetch("/api/llm/models")
  if (!res.ok) {
    throw new Error(`LLM models request failed: ${res.status}`)
  }
  return (await res.json()) as LlmModel[]
}
