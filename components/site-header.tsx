"use client"

import { MessageSquare } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Toggle } from "@/components/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { NavigationHeaderMenu } from "./nav-menu"
import { ColorThemeToggle, LanguageToggle, ModeToggle } from "./mode-toggle"

type SiteHeaderProps = {
  /** When set with `onChatPanelOpenChange`, shows a toggle for the dashboard chat panel. */
  chatPanelOpen?: boolean
  onChatPanelOpenChange?: (open: boolean) => void
}

export function SiteHeader({
  chatPanelOpen,
  onChatPanelOpenChange,
}: SiteHeaderProps = {}) {
  const showChatToggle =
    typeof chatPanelOpen === "boolean" && typeof onChatPanelOpenChange === "function"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ms-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex w-full items-center justify-between">
          <NavigationHeaderMenu />
          <div className="flex items-center gap-2 sm:gap-4">
            {showChatToggle ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    variant="outline"
                    size="sm"
                    pressed={chatPanelOpen}
                    onPressedChange={onChatPanelOpenChange}
                    aria-label={
                      chatPanelOpen ? "Hide chat panel" : "Show chat panel"
                    }
                  >
                    <MessageSquare className="size-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {chatPanelOpen ? "Hide chat" : "Show chat"}
                </TooltipContent>
              </Tooltip>
            ) : null}
            <ModeToggle />
            <LanguageToggle />
            <ColorThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
