"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { NavChildren, NavMainGroup } from "@/service/system/type"
import { useColorTheme } from "@/hooks/use-color"

export interface NavMainProps {
  items: NavMainGroup<NavChildren>
  actions?: {
    onClick?: (key: string) => void
  }
}

export function NavMain({ items, actions }: NavMainProps) {
  const { colorTheme } = useColorTheme()
  console.log(colorTheme)
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        onClick={() => {
                          actions?.onClick?.(subItem.key || subItem.title)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <a
                            href={subItem.url}
                            className={"flex items-center gap-2"}
                          >
                            <span>{subItem.title}</span>
                          </a>
                          <div
                            className={cn(
                              subItem.isActive &&
                                `h-2 w-2 rounded-full bg-${colorTheme}-500 border border-border`
                            )}
                          />
                        </div>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
