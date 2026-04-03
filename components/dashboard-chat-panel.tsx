"use client"

import * as React from "react"
import {
  History,
  MessageSquarePlus,
  Paperclip,
  SendHorizontal,
  Sparkles,
  Globe,
  ImageIcon,
  Mic,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { callLlmChat, OpenAiCompletionApi } from "@/app/client/api"
import { LlmChatRequest, LlmMessage } from "@/app/typing"

type ChatRole = "user" | "assistant"

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

type ChatSession = {
  id: string
  title: string
}

const initialSessions: ChatSession[] = [
  { id: "s1", title: "Dashboard walkthrough" },
  { id: "s2", title: "API error troubleshooting" },
]

const EMPTY_MESSAGES: ChatMessage[] = []

const seedMessages: Record<string, ChatMessage[]> = {
  s1: [
    {
      id: "m1",
      role: "assistant",
      content:
        "Hi — I can help you explore this dashboard. Ask about navigation, settings, or data tables.",
    },
  ],
  s2: [
    {
      id: "m2",
      role: "assistant",
      content:
        "I see you were debugging an API issue. Paste the response body or status code when you are ready.",
    },
    {
      id: "m3",
      role: "user",
      content: "Getting 429 after a few requests — any ideas?",
    },
    {
      id: "m4",
      role: "assistant",
      content:
        "That usually means rate limiting. Check your provider dashboard for quotas, add backoff retries, or cache read-heavy calls.",
    },
  ],
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function DashboardChatPanel({
  className,
}: Readonly<{ className?: string }>) {
  const t = useTranslations("Chat")
  const tDefault = useTranslations("Default")
  const [sessions, setSessions] = React.useState<ChatSession[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = React.useState(
    initialSessions[0]!.id
  )
  const [messagesBySession, setMessagesBySession] = React.useState<
    Record<string, ChatMessage[]>
  >(() => ({ ...seedMessages }))
  const [draft, setDraft] = React.useState("")
  /**
   * @description 获取当前会话
   */
  const activeSession = sessions.find((s) => s.id === activeSessionId)
  /**
   * @description 获取当前会话的消息
   */
  const messages = React.useMemo(
    () => messagesBySession[activeSessionId] ?? EMPTY_MESSAGES,
    [messagesBySession, activeSessionId]
  )
  /**
   * @description 滚动条引用
   */
  const scrollRef = React.useRef<HTMLDivElement>(null)

  /**
   * @description 滚动到最底部
   */
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, activeSessionId])

  /**
   * @description 处理新会话
   */
  const handleNewChat = React.useCallback(() => {
    const id = newId()
    const session: ChatSession = { id, title: "New chat" }
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(id)
    setMessagesBySession((prev) => ({
      ...prev,
      [id]: [
        {
          id: newId(),
          role: "assistant",
          content: "New conversation started. What would you like to work on?",
        },
      ],
    }))
  }, [])

  const send = React.useCallback(async () => {
    const text = draft.trim()
    if (!text) return
    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: text,
    }
    // 1. 先乐观更新本地消息
    setMessagesBySession((prev) => ({
      ...prev,
      [activeSessionId]: [...(prev[activeSessionId] ?? []), userMsg],
    }))
    setDraft("")
    // 2. 调用服务端 LLM API
    try {
      const req: LlmChatRequest = {
        model: "kimi-k2.5", // 或从设置里拿
        messages: [
          // 这里简单起见只发当前 user 消息，后面你可以带上历史
          { role: "user", content: text },
        ],
        stream: false,
      }
      const resp = await callLlmChat(req)
      const assistantMsg: ChatMessage = {
        id: newId(),
        role: "assistant",
        content:
          typeof resp.message.content === "string" ? resp.message.content : "",
      }
      setMessagesBySession((prev) => ({
        ...prev,
        [activeSessionId]: [...(prev[activeSessionId] ?? []), assistantMsg],
      }))
    } catch (e) {
      // 你可以在这里加一条 error 消息或 toast
      console.error(e)
    }
  }, [draft, activeSessionId])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t bg-background lg:h-full lg:w-[min(100%,420px)] lg:border-s lg:border-t-0",
        className
      )}
      aria-label="Assistant chat"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-none font-medium">
            {activeSession?.title ?? t("chat")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {t("assistant")} · {t("chatPanel")}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
              <History className="size-3.5" />
              {t("history")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{t("conversations")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={activeSessionId}
              onValueChange={setActiveSessionId}
            >
              {sessions.map((s) => (
                <DropdownMenuRadioItem key={s.id} value={s.id}>
                  {s.title}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleNewChat}>
              <MessageSquarePlus className="size-4" />
              {t("newChat")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex gap-2",
              m.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {m.role === "assistant" ? (
              <Avatar size="sm" className="mt-0.5">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Sparkles className="size-3.5" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar size="sm" className="mt-0.5">
                <AvatarImage
                  src="https://github.com/shadcn.png"
                  alt="@shadcn"
                  className="grayscale"
                />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {tDefault("you")}
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <span className="me-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            {t("tools")}
          </span>
          <ToolbarIconButton label={t("attachFile")} icon={Paperclip} />
          <ToolbarIconButton label={t("webSearch")} icon={Globe} />
          <ToolbarIconButton label={t("image")} icon={ImageIcon} />
          <ToolbarIconButton label={t("voice")} icon={Mic} />
          <Separator orientation="vertical" className="mx-1 h-6" />
          <span className="text-[10px] text-muted-foreground">
            {t("placeholders")} — {t("placeholdersDescription")}
          </span>
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message…"
          rows={6}
          className="h-32 resize-none"
        />
        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" className="gap-1.5" onClick={send}>
            {t("send")}
            <SendHorizontal className="size-3.5" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          {t("enterToSend")} · {t("shiftEnterForNewLine")}
        </p>
      </div>
    </aside>
  )
}

function ToolbarIconButton({
  label,
  icon: Icon,
}: Readonly<{
  label: string
  icon: React.ComponentType<{ className?: string }>
}>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label}>
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
