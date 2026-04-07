import { NextRequest, NextResponse } from "next/server"
import { appendMessage } from "@/app/server/chat-store"

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await ctx.params

  let body: { role: string; content: string }
  try {
    body = (await req.json()) as { role: string; content: string }
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    )
  }

  const role = body?.role
  const content = body?.content
  if (
    (role !== "user" && role !== "assistant") ||
    typeof content !== "string"
  ) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "role/content is required" } },
      { status: 400 }
    )
  }

  const msg = await appendMessage({ sessionId, role, content })
  return NextResponse.json(msg, { status: 201 })
}
