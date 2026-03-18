"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  CameraIcon,
  FileTextIcon,
  Settings2Icon,
  CircleHelpIcon,
  SearchIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  CommandIcon,
  Settings2,
  BookOpen,
  Bot,
  SquareTerminal,
} from "lucide-react"
import { NavChildren, NavMainGroup } from "@/service/system/type"
import { SystemService } from "@/service/system"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar:
      "https://q6.itc.cn/q_70/images03/20250306/355fba6a5cb049f5b98c2ed9f03cc5e1.jpeg",
  },
  navClouds: [
    {
      title: "Capture",
      icon: <CameraIcon />,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: <FileTextIcon />,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: <FileTextIcon />,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: <Settings2Icon />,
    },
    {
      title: "Get Help",
      url: "#",
      icon: <CircleHelpIcon />,
    },
    {
      title: "Search",
      url: "#",
      icon: <SearchIcon />,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: <DatabaseIcon />,
    },
    {
      name: "Reports",
      url: "#",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: <FileIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [navActive, setNavActive] = React.useState<string>()
  const [navMainData, setNavMainData] =
    React.useState<NavMainGroup<NavChildren>>()

  React.useEffect(() => {
    const fetchNavData = async () => {
      const navItems = await SystemService.getNavMainData()
      // 这里可以处理获取到的导航数据
      setNavMainData(navItems)
    }
    fetchNavData()
  }, [])

  // 监听路由变化更新 navActive
  React.useEffect(() => {
    if (navMainData) {
      for (const group of navMainData) {
        // 检查父级项
        if (group.url === pathname) {
          const newActive = group.key || group.title
          if (newActive !== navActive) {
            setNavActive(newActive)
          }
          return
        }
        // 检查子项
        const matchingItem = group.items?.find((item) => item.url === pathname)
        if (matchingItem) {
          const newActive = matchingItem.key || matchingItem.title
          if (newActive !== navActive) {
            setNavActive(newActive)
          }
          return
        }
      }
    }
  }, [pathname, navMainData, navActive])

  React.useEffect(() => {
    if (navActive) {
      setNavMainData((prev) =>
        prev?.map((item) => {
          const isParentActive = (item.key || item.title) === navActive
          const updatedItems = item.items?.map((subItem) => ({
            ...subItem,
            isActive: (subItem.key || subItem.title) === navActive,
          }))
          const isAnyChildActive = updatedItems?.some((subItem) => subItem.isActive)
          return {
            ...item,
            items: updatedItems,
            isActive: isParentActive || isAnyChildActive,
          }
        })
      )
    }
  }, [navActive])

  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
      className="bg-[--color-sidebar-bg]"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navMainData || []}
          actions={{
            onClick: setNavActive,
          }}
        />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
