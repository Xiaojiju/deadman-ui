"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardChatPanel } from "@/components/dashboard-chat-panel"
import { SiteHeader } from "@/components/site-header"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { Layout } from "react-resizable-panels"
import { usePanelRef } from "react-resizable-panels"
import React from "react"

const DASHBOARD_RESIZABLE_LAYOUT_KEY = "deadman-ui-dashboard-resizable-layout"
const CHAT_PANEL_MIN_PX = 280
const CHAT_PANEL_MAX_PX = 720
const CHAT_PANEL_DEFAULT_PX = 420
const MAIN_MIN_FOR_RESIZE_PX = 200

/** lg 聊天卡片进出场与关闭后再 `collapse` 的时长（需与 Tailwind `duration-*` 一致）。 */
const CHAT_LG_TRANSITION_MS = 400

/** 两个 ResizablePanel 内层卡片：与 `SidebarInset` 的 md 圆角/shadow 同级视觉；`h-full min-h-0` 保证纵向可滚动。 */
const dashboardResizablePanelCardClass =
  "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-background shadow-sm"

function subscribeLg(callback: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)")
  mq.addEventListener("change", callback)
  return () => mq.removeEventListener("change", callback)
}

function getLgSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches
}

function getServerLgSnapshot() {
  return false
}

function DashboardMainScroll({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="@container/main flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 outline-none md:gap-6 md:py-6 lg:px-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function readStoredLayout(): Layout | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const raw = localStorage.getItem(DASHBOARD_RESIZABLE_LAYOUT_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return undefined
    const layout: Layout = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) layout[k] = v
    }
    return Object.keys(layout).length > 0 ? layout : undefined
  } catch {
    return undefined
  }
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [chatPanelOpen, setChatPanelOpen] = React.useState(true)
  /** 用户是否曾关过聊天；用于首次进页不播进入动画，避免闪一下。 */
  const hasClosedChatOnceLg = React.useRef(false)
  /** lg 下聊天卡片是否处于「展开可见」过渡终态（用于滑入 + 淡入）。 */
  const [chatLgEntered, setChatLgEntered] = React.useState(true)
  const chatPanelRef = usePanelRef()

  const isLg = React.useSyncExternalStore(
    subscribeLg,
    getLgSnapshot,
    getServerLgSnapshot
  )

  const [defaultLayout] = React.useState<Layout | undefined>(() =>
    readStoredLayout()
  )

  React.useLayoutEffect(() => {
    if (!isLg) return
    const panel = chatPanelRef.current
    if (!panel) return
    if (chatPanelOpen) {
      panel.expand()
      const id = requestAnimationFrame(() => panel.expand())
      return () => cancelAnimationFrame(id)
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const delay = reduced ? 0 : CHAT_LG_TRANSITION_MS
    const t = window.setTimeout(() => panel.collapse(), delay)
    return () => window.clearTimeout(t)
  }, [chatPanelOpen, isLg, chatPanelRef])

  React.useEffect(() => {
    if (!isLg) return
    if (!chatPanelOpen) {
      hasClosedChatOnceLg.current = true
      setChatLgEntered(false)
      return
    }
    if (!hasClosedChatOnceLg.current) {
      setChatLgEntered(true)
      return
    }
    setChatLgEntered(false)
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setChatLgEntered(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [chatPanelOpen, isLg])

  const persistLayout = React.useCallback((layout: Layout) => {
    try {
      localStorage.setItem(
        DASHBOARD_RESIZABLE_LAYOUT_KEY,
        JSON.stringify(layout)
      )
    } catch {
      /* ignore */
    }
  }, [])

  const insetBody = (
    <>
      <SiteHeader
        chatPanelOpen={chatPanelOpen}
        onChatPanelOpenChange={setChatPanelOpen}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!isLg ? (
          <>
            <DashboardMainScroll>{children}</DashboardMainScroll>
            <div
              aria-hidden={!chatPanelOpen}
              className={cn(
                "shrink-0 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none",
                chatPanelOpen
                  ? "max-h-[min(50vh,520px)] w-full opacity-100"
                  : "pointer-events-none max-h-0 w-full opacity-0"
              )}
            >
              <DashboardChatPanel
                className={cn(
                  "h-full max-h-[inherit] min-h-0 w-full",
                  !chatPanelOpen && "select-none"
                )}
              />
            </div>
          </>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <DashboardMainScroll>{children}</DashboardMainScroll>
          </div>
        )}
      </div>
    </>
  )

  return (
    <SidebarProvider
      className="h-svh max-h-svh min-h-0 overflow-hidden overscroll-none"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      {!isLg ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <SidebarInset className="min-h-0 overflow-hidden">
            {insetBody}
          </SidebarInset>
        </div>
      ) : (
        <ResizablePanelGroup
          id="dashboard-main-chat"
          orientation="horizontal"
          className="flex min-h-0 min-w-0 flex-1"
          defaultLayout={defaultLayout}
          onLayoutChanged={persistLayout}
        >
          <ResizablePanel
            id="main"
            defaultSize="1fr"
            minSize={MAIN_MIN_FOR_RESIZE_PX}
            className="min-h-0 min-w-0"
          >
            <div className="box-border flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2">
              <div className={dashboardResizablePanelCardClass}>
                <SidebarInset className="min-h-0 overflow-hidden">
                  {insetBody}
                </SidebarInset>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle
            withHandle
            className={cn(
              "self-center shrink-0",
              "h-[min(18rem,46svh)] min-h-28 max-h-96",
              "hover:bg-primary/35 active:bg-primary/55"
            )}
          />
          <ResizablePanel
            id="chat"
            panelRef={chatPanelRef}
            defaultSize={CHAT_PANEL_DEFAULT_PX}
            minSize={CHAT_PANEL_MIN_PX}
            maxSize={CHAT_PANEL_MAX_PX}
            collapsible
            collapsedSize={0}
            className="min-h-0 min-w-0"
          >
            <div className="box-border flex h-full min-h-0 min-w-0 flex-col p-2">
              <div
                className={cn(
                  dashboardResizablePanelCardClass,
                  "origin-right ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  "transition-[opacity,transform] duration-400",
                  !chatPanelOpen
                    ? "pointer-events-none translate-x-4 opacity-0"
                    : chatLgEntered
                      ? "translate-x-0 opacity-100"
                      : "translate-x-4 opacity-0 motion-reduce:translate-x-0 motion-reduce:opacity-100"
                )}
              >
                <DashboardChatPanel
                  className={cn(
                    "h-full min-h-0 w-full",
                    !chatPanelOpen && "select-none"
                  )}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </SidebarProvider>
  )
}
