import { NextResponse } from "next/server"
import { getSession } from "@/app/server/chat-store"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await ctx.params
  const data = await getSession(sessionId)
  if (!data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    )
  }
  return NextResponse.json(data)
}

