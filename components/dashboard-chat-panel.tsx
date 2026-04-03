"use client"

import * as React from "react"
import {
  ArrowUp,
  History,
  MessageSquarePlus,
  Paperclip,
  Sparkles,
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
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { callLlmChat, getLlmModels } from "@/app/client/api"
import { LlmChatRequest, LlmModel } from "@/app/typing"

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
  const [models, setModels] = React.useState<LlmModel[]>([])
  const [selectedModel, setSelectedModel] = React.useState<string>("")
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

  React.useEffect(() => {
    const fetchModels = async () => {
      const models = await getLlmModels()
      console.log("models", models)
      setModels(models)
    }
    void fetchModels()
  }, [])

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

  const onModelChange = (model: string) => {
    setSelectedModel(model)
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
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message…"
            rows={6}
            className="h-32 w-full resize-none"
          />
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <ToolbarIconButton label={t("attachFile")} icon={Paperclip} />
              <LlmModelSelect
                models={models}
                value={selectedModel}
                onChange={onModelChange}
                placeholder={t("selectModel")}
              />
            </div>
            <Button
              type="button"
              size="icon-sm"
              className="h-8 w-8 rounded-full"
              onClick={send}
              aria-label={t("send")}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-right text-[10px] text-muted-foreground">
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

function LlmModelSelect({
  models,
  value,
  onChange,
  placeholder,
}: Readonly<{
  models: LlmModel[]
  value: string
  onChange: (value: string) => void
  placeholder: string
}>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 min-w-28 justify-between px-2 text-[11px]"
        >
          <span className="truncate">{value || placeholder}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuLabel className="text-xs">Models</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {models.map((m) => (
            <DropdownMenuRadioItem
              key={`${m.provider}:${m.model}`}
              value={m.model}
            >
              <span className="flex flex-col">
                <span className="truncate text-xs font-medium">{m.model}</span>
                <span className="text-[10px] text-muted-foreground">
                  {m.provider}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
