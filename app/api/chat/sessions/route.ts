import { NextRequest, NextResponse } from "next/server"
import { createSession, listSessions } from "@/app/server/chat-store"

export async function GET() {
  const sessions = await listSessions()
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  let body: any = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const session = await createSession({
    id: typeof body?.id === "string" ? body.id : undefined,
    title: typeof body?.title === "string" ? body.title : undefined,
  })
  return NextResponse.json(session, { status: 201 })
}

