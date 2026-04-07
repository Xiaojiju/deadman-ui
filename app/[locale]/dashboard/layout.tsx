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

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [chatPanelOpen, setChatPanelOpen] = React.useState(true)
  const chatPanelRef = usePanelRef()
  const isLg = React.useSyncExternalStore(
    subscribeLg,
    getLgSnapshot,
    getServerLgSnapshot
  )

  const [defaultLayout] = React.useState<Layout | undefined>(() => {
    if (typeof window === "undefined") return undefined
    try {
      const raw = localStorage.getItem(DASHBOARD_RESIZABLE_LAYOUT_KEY)
      if (!raw) return undefined
      return JSON.parse(raw) as Layout
    } catch {
      return undefined
    }
  })

  React.useLayoutEffect(() => {
    if (!isLg) return
    const apply = () => {
      const panel = chatPanelRef.current
      if (!panel) return
      if (chatPanelOpen) panel.expand()
      else panel.collapse()
    }
    apply()
    const id = requestAnimationFrame(apply)
    return () => cancelAnimationFrame(id)
  }, [chatPanelOpen, isLg, chatPanelRef])

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
      {/* max-h-full: respect flex parent; avoid max-h-svh + md:m-2 on inset (extra margin overflows viewport) */}
      <SidebarInset className="max-h-full min-h-0 flex-1 overflow-hidden">
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
            <ResizablePanelGroup
              id="dashboard-main-chat"
              orientation="horizontal"
              className="flex min-h-0 flex-1"
              defaultLayout={defaultLayout}
              onLayoutChanged={persistLayout}
            >
              <ResizablePanel
                id="main"
                minSize="200px"
                className="min-h-0 min-w-0"
              >
                <DashboardMainScroll>{children}</DashboardMainScroll>
              </ResizablePanel>
              <ResizableHandle
                withHandle
                className="max-w-1 bg-border hover:bg-primary/30 active:bg-primary/50"
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
                <DashboardChatPanel
                  className={cn(
                    "h-full min-h-0 w-full",
                    !chatPanelOpen && "select-none"
                  )}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
