"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardChatPanel } from "@/components/dashboard-chat-panel"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import React from "react"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [chatPanelOpen, setChatPanelOpen] = React.useState(true)

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
        {/* flex-1 + min-h-0 + overflow-hidden: row height = viewport minus header; main scrolls inside */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="@container/main flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 outline-none md:gap-6 md:py-6 lg:px-6">
                {children}
              </div>
            </div>
          </div>
          <div
            aria-hidden={!chatPanelOpen}
            className={cn(
              "shrink-0 overflow-hidden transition-[width,max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none",
              chatPanelOpen
                ? "max-h-[min(50vh,520px)] w-full opacity-100 lg:h-full lg:max-h-none lg:w-[420px]"
                : "pointer-events-none max-h-0 w-full opacity-0 lg:h-full lg:max-h-none lg:w-0 lg:min-w-0"
            )}
          >
            <DashboardChatPanel
              className={cn(
                "h-full max-h-[inherit] min-h-0 w-full lg:w-full",
                !chatPanelOpen && "select-none"
              )}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
