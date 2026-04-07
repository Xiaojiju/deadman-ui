"use client"

import * as React from "react"
import {
  ArrowUp,
  BarChart3,
  Bot,
  Brain,
  ChevronDown,
  Cloud,
  Cpu,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  History,
  Languages,
  MessageSquarePlus,
  Paperclip,
  PenLine,
  Sparkles,
  Trash2,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Image from "next/image"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
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
import type { ContentPart } from "@/app/typing"
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

type Attachment = {
  id: string
  kind: "image" | "file"
  name: string
  mime: string
  size: number
  /** Only for kind=image */
  dataUrl?: string
}

type SelectOption = {
  value: string
  label: string
  provider: string
  icon: React.ComponentType<{ className?: string }>
  /** Shown in tooltip on hover */
  description: string
}

function bytesToHuman(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  const fixed = i === 0 ? String(Math.round(v)) : v.toFixed(v >= 10 ? 1 : 2)
  return `${fixed} ${units[i]}`
}

function iconForFile(name: string, mime: string) {
  const ext = name.toLowerCase().split(".").pop() ?? ""
  if (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)
  )
    return FileImage
  if (
    mime.includes("spreadsheet") ||
    ["xls", "xlsx", "csv", "tsv"].includes(ext)
  )
    return FileSpreadsheet
  if (mime.startsWith("text/") || ["md", "txt", "json", "log"].includes(ext))
    return FileText
  return File
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

function iconForProvider(provider: string) {
  const p = provider.toLowerCase()
  if (p.includes("openai") || p.includes("gpt")) return Sparkles
  if (p.includes("anthropic") || p.includes("claude")) return Bot
  if (p.includes("google") || p.includes("gemini")) return Cloud
  if (p.includes("meta") || p.includes("llama")) return Brain
  return Cpu
}

function buildModelOptionDescription(provider: string, model: string) {
  if (!provider && !model) return ""
  if (!provider) return model
  if (!model) return provider
  return `${provider} · ${model}`
}

export function DashboardChatPanel({
  className,
}: Readonly<{ className?: string }>) {
  const t = useTranslations("Chat")
  const tDefault = useTranslations("Default")
  const [models, setModels] = React.useState<SelectOption[]>([])
  const [selectedModel, setSelectedModel] = React.useState<string>("")
  const [streamMode, setStreamMode] = React.useState<boolean>(true)
  const [selectedMode, setSelectedMode] =
    React.useState<NonNullable<LlmChatRequest["mode"]>>("chat")
  const [attachments, setAttachments] = React.useState<Attachment[]>([])
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [sessions, setSessions] = React.useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = React.useState<string>("")
  const [messagesBySession, setMessagesBySession] = React.useState<
    Record<string, ChatMessage[]>
  >(() => ({}))
  const [draft, setDraft] = React.useState("")

  const modes: SelectOption[] = React.useMemo(
    () => [
      {
        label: t("modes.writing"),
        value: "write",
        provider: t("mode"),
        icon: PenLine,
        description: t("modes.writingDescription"),
      },
      {
        label: t("modes.dataAnalysis"),
        value: "analyze",
        provider: t("mode"),
        icon: BarChart3,
        description: t("modes.dataAnalysisDescription"),
      },
      {
        label: t("modes.translation"),
        value: "translate",
        provider: t("mode"),
        icon: Languages,
        description: t("modes.translationDescription"),
      },
    ],
    [t]
  )

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
      const list: LlmModel[] = await getLlmModels()
      const mapped: SelectOption[] = list.map((m) => {
        const model = m.model ?? ""
        const provider = m.provider ?? ""
        return {
          value: model,
          label: model,
          provider,
          icon: iconForProvider(provider),
          description: buildModelOptionDescription(provider, model),
        }
      })
      setModels(mapped)
      setSelectedModel(list[0]?.model ?? "")
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

  const addFiles = React.useCallback(async (files: File[]) => {
    const next: Attachment[] = []
    for (const file of files) {
      const id = newId()
      const mime = file.type || ""
      const name = file.name || "untitled"
      const size = file.size || 0
      if (mime.startsWith("image/")) {
        try {
          const dataUrl = await fileToDataUrl(file)
          next.push({ id, kind: "image", name, mime, size, dataUrl })
        } catch {
          next.push({ id, kind: "file", name, mime, size })
        }
      } else {
        next.push({ id, kind: "file", name, mime, size })
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next])
  }, [])

  const send = React.useCallback(async () => {
    const text = draft.trim()
    if (!text && attachments.length === 0) return

    const model = selectedModel || models[0]?.value
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

    const conversation: LlmChatRequest["messages"] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      (() => {
        const parts: ContentPart[] = []
        if (text) parts.push({ type: "text", text })
        for (const a of attachments) {
          if (a.kind === "image" && a.dataUrl) {
            parts.push({ type: "image_url", image_url: { url: a.dataUrl } })
          } else if (a.kind === "file") {
            parts.push({
              type: "text",
              text: `Attached file: ${a.name} (${a.mime || "unknown"}, ${bytesToHuman(
                a.size
              )}). Content not included; ask me to paste relevant parts if needed.`,
            })
          }
        }
        return { role: "user" as const, content: parts.length ? parts : text }
      })(),
    ]

    const baseReq: LlmChatRequest = {
      model,
      sessionId: activeSessionId,
      mode: selectedMode,
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
      setAttachments([])
    } catch (e) {
      console.error(e)
    }
  }, [
    draft,
    attachments,
    activeSessionId,
    models,
    selectedModel,
    selectedMode,
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

  const onModeChange = (mode: string) => {
    setSelectedMode(mode as NonNullable<LlmChatRequest["mode"]>)
  }

  const onPickFiles = () => {
    fileInputRef.current?.click()
  }

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items ?? [])
    const images = items
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter(Boolean) as File[]
    if (images.length > 0) void addFiles(images)
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t bg-background lg:h-full lg:border-s lg:border-t-0",
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={handleNewChat}
        >
          <MessageSquarePlus className="size-3.5" />
          {t("newChat")}
        </Button>
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
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ""
              void addFiles(files)
            }}
          />
          <ToolbarIconButton
            label={t("attachFile")}
            icon={Paperclip}
            onClick={onPickFiles}
          />
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
        {attachments.length > 0 ? (
          <div className="mb-2 flex max-w-full flex-wrap items-center gap-2 overflow-x-auto">
            {attachments.map((a) => {
              const Icon = iconForFile(a.name, a.mime)
              return a.kind === "image" && a.dataUrl ? (
                <Dialog key={a.id}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="group relative inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-left text-xs hover:bg-muted"
                      aria-label={a.name}
                    >
                      <Image
                        src={a.dataUrl}
                        alt={a.name}
                        width={32}
                        height={32}
                        unoptimized
                        className="h-8 w-8 rounded object-cover ring-1 ring-border"
                      />
                      <span className="max-w-44 truncate">{a.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="ms-1"
                        onClick={(ev) => {
                          ev.preventDefault()
                          ev.stopPropagation()
                          setAttachments((prev) =>
                            prev.filter((x) => x.id !== a.id)
                          )
                        }}
                        aria-label="Remove"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle className="truncate">{a.name}</DialogTitle>
                      <DialogDescription>
                        {a.mime || "image"} · {bytesToHuman(a.size)}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-auto">
                      <Image
                        src={a.dataUrl}
                        alt={a.name}
                        width={1200}
                        height={800}
                        unoptimized
                        className="h-auto w-full rounded-md object-contain"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Badge
                  key={a.id}
                  variant="outline"
                  className="h-8 gap-2 rounded-md px-2 py-1 text-xs"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="max-w-52 truncate">{a.name}</span>
                  <button
                    type="button"
                    className="ms-1 inline-flex items-center justify-center"
                    onClick={() =>
                      setAttachments((prev) =>
                        prev.filter((x) => x.id !== a.id)
                      )
                    }
                    aria-label="Remove"
                  >
                    <Trash2 className="size-3 text-muted-foreground" />
                  </button>
                </Badge>
              )
            })}
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder="Message…"
            rows={6}
            className="h-32 w-full resize-none"
          />
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <ToolbarIconButton
                label={t("attachFile")}
                icon={Paperclip}
                onClick={onPickFiles}
              />
              <OptionSelect
                title={t("models")}
                options={models}
                value={selectedModel}
                onChange={onModelChange}
                placeholder={t("selectModel")}
              />
              <OptionSelect
                title={t("mode")}
                options={modes}
                value={selectedMode ?? ""}
                onChange={onModeChange}
                placeholder={t("selectMode")}
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
  onClick,
}: Readonly<{
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
}>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
        >
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

function OptionSelect({
  options,
  value,
  title,
  onChange,
  placeholder,
}: Readonly<{
  title?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
}>) {
  const selected = options.find((o) => o.value === value)
  const TriggerIcon = selected?.icon ?? Cpu

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 max-w-48 min-w-30 cursor-pointer gap-1.5 px-2 text-[11px]"
          aria-label={
            selected
              ? `${title ? `${title}: ` : ""}${selected.label}`
              : placeholder
          }
        >
          <TriggerIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-start">
            {selected?.label || placeholder}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {title && (
          <DropdownMenuLabel className="text-xs">{title}</DropdownMenuLabel>
        )}
        {title && <DropdownMenuSeparator />}
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((m) => {
            const ItemIcon = m.icon
            return (
              <DropdownMenuRadioItem
                key={`${m.provider}:${m.value}`}
                value={m.value}
                className="items-start gap-0 py-2"
              >
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div className="flex w-full min-w-0 cursor-default items-start gap-2">
                      <ItemIcon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
                        <span className="truncate text-xs leading-tight font-medium">
                          {m.label}
                        </span>
                        {m.provider ? (
                          <span className="truncate text-[10px] leading-tight text-muted-foreground">
                            {m.provider}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </TooltipTrigger>
                  {m.description ? (
                    <TooltipContent
                      side="left"
                      sideOffset={8}
                      className="z-100 max-w-xs text-pretty"
                    >
                      {m.description}
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
