"use client"

import * as React from "react"
import {
  ArrowUp,
  History,
  MessageSquarePlus,
  Paperclip,
  Sparkles,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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
import {
  appendChatMessage,
  createChatSession,
  getChatSession,
  getLlmModels,
  listChatSessions,
  callLlmChat,
  callLlmChatStream,
  finalizeSessionTitle,
  previewSessionTitle,
} from "@/app/client/api"
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

const EMPTY_MESSAGES: ChatMessage[] = []

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
  const [streamMode, setStreamMode] = React.useState<boolean>(true)
  const [sessions, setSessions] = React.useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = React.useState<string>("")
  const [messagesBySession, setMessagesBySession] = React.useState<
    Record<string, ChatMessage[]>
  >(() => ({}))
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

  // 初始化：拉取服务端会话列表；若没有则创建一个新会话
  React.useEffect(() => {
    const init = async () => {
      const list = await listChatSessions()
      if (list.length === 0) {
        const created = await createChatSession({ title: "New chat" })
        setSessions([{ id: created.id, title: created.title }])
        setActiveSessionId(created.id)
        setMessagesBySession({ [created.id]: [] })
        return
      }

      const mapped = list.map((s) => ({ id: s.id, title: s.title }))
      setSessions(mapped)
      setActiveSessionId(mapped[0]!.id)
    }
    void init()
  }, [])

  // 切换会话：从服务端拉取当前会话消息
  React.useEffect(() => {
    if (!activeSessionId) return
    const load = async () => {
      const data = await getChatSession(activeSessionId)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, title: data.session.title } : s
        )
      )
      setMessagesBySession((prev) => ({
        ...prev,
        [activeSessionId]: data.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      }))
    }
    void load()
  }, [activeSessionId])

  /**
   * @description 处理新会话
   */
  const handleNewChat = React.useCallback(() => {
    const run = async () => {
      const created = await createChatSession({ title: "New chat" })
      const session: ChatSession = { id: created.id, title: created.title }
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(created.id)
      setMessagesBySession((prev) => ({ ...prev, [created.id]: [] }))
    }
    void run()
  }, [])

  const send = React.useCallback(async () => {
    const text = draft.trim()
    if (!text) return

    const model = selectedModel || models[0]?.model
    if (!model) return
    if (!activeSessionId) return

    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: text,
    }

    const isFirstUserMessage = messages.length === 0
    const shouldRenameTitle =
      isFirstUserMessage && activeSession?.title === "New chat"

    // 1. 先乐观更新本地消息
    setMessagesBySession((prev) => ({
      ...prev,
      [activeSessionId]: [...(prev[activeSessionId] ?? []), userMsg],
    }))
    setDraft("")

    if (shouldRenameTitle) {
      const preview = previewSessionTitle(text)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, title: preview } : s
        )
      )
      const sid = activeSessionId
      void finalizeSessionTitle({
        sessionId: sid,
        text,
        model,
      })
        .then(({ title }) => {
          setSessions((prev) =>
            prev.map((s) => (s.id === sid ? { ...s, title } : s))
          )
        })
        .catch((e) => console.error(e))
    }

    const conversation = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const baseReq: LlmChatRequest = {
      model,
      sessionId: activeSessionId,
      mode: "chat",
      messages: conversation,
    }

    // 2. 调用服务端 LLM API
    try {
      // 将用户消息写入服务端（持久化）
      void appendChatMessage({
        sessionId: activeSessionId,
        role: "user",
        content: text,
      })

      if (!streamMode) {
        const resp = await callLlmChat({ ...baseReq, stream: false })
        const assistantMsg: ChatMessage = {
          id: newId(),
          role: "assistant",
          content:
            typeof resp.message.content === "string"
              ? resp.message.content
              : "",
        }
        setMessagesBySession((prev) => ({
          ...prev,
          [activeSessionId]: [...(prev[activeSessionId] ?? []), assistantMsg],
        }))
        void appendChatMessage({
          sessionId: activeSessionId,
          role: "assistant",
          content: assistantMsg.content,
        })
      } else {
        const assistantId = newId()
        // 流式内容：必须在回调里累积；不能依赖 await 后的 React state（异步更新，读不到完整回复）
        let streamedAssistant = ""
        // 先插入一个空的 assistant 消息，占位用于流式更新
        setMessagesBySession((prev) => ({
          ...prev,
          [activeSessionId]: [
            ...(prev[activeSessionId] ?? []),
            {
              id: assistantId,
              role: "assistant",
              content: "",
            },
          ],
        }))

        await callLlmChatStream({ ...baseReq, stream: true }, (chunk) => {
          streamedAssistant += chunk
          setMessagesBySession((prev) => {
            const current = prev[activeSessionId] ?? []
            return {
              ...prev,
              [activeSessionId]: current.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m
              ),
            }
          })
        })

        if (streamedAssistant.length > 0) {
          void appendChatMessage({
            sessionId: activeSessionId,
            role: "assistant",
            content: streamedAssistant,
          })
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [
    draft,
    activeSessionId,
    models,
    selectedModel,
    streamMode,
    messages,
    activeSession?.title,
  ])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return
    // 中文等 IME：回车常用于确认候选词/上屏，不应触发发送
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    e.preventDefault()
    send()
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
              <ChatMessageContent content={m.content} />
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
          {/* 预留：网页搜索 / 图片 / 语音等工具 */}
          <span className="mx-1 h-3 w-px bg-border" />
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="h-6 px-2 text-[10px]"
            onClick={() => setStreamMode((v) => !v)}
          >
            {streamMode ? "Stream" : "Complete"}
          </Button>
        </div>
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

function ChatMessageContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="mb-1.5 ml-4 list-disc space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        code: ({ children, className }) => {
          const text = String(children ?? "")
          const isBlock =
            /\n/.test(text) || Boolean(className?.includes("language-"))
          return isBlock ? (
            <code className="block rounded-md bg-background/90 p-2 font-mono text-xs whitespace-pre-wrap shadow-inner ring-1 ring-border">
              {children}
            </code>
          ) : (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em]">
              {children}
            </code>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
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
