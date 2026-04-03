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
