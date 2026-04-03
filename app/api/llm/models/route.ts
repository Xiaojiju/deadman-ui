// app/api/llm/models/route.ts
import { NextResponse } from "next/server"
import { providerStore } from "@/app/server/provider"
import { LlmModel } from "@/app/typing"

export async function GET(): Promise<NextResponse<LlmModel[]>> {
  const providers = providerStore.getProviders()

  const models = providers.flatMap((p) =>
    (p.models ?? []).map((m) => ({
      provider: p.name,
      model: m,
    }))
  )
  return NextResponse.json(models)
}
