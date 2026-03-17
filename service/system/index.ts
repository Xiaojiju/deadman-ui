import { BookOpen, Bot, Settings2, SquareTerminal } from "lucide-react"
import { NavChildren, NavMainGroup } from "./type"

const navMainData: NavMainGroup = [
  {
    title: "Playground",
    url: "#",
    icon: SquareTerminal,
    isActive: true,
    items: [
      {
        key: "history",
        title: "History",
        url: "#",
        isActive: true,
      },
      {
        key: "starred",
        title: "Starred",
        url: "#",
      },
      {
        key: "settings",
        title: "Settings",
        url: "#",
      },
    ],
  },
  {
    title: "Models",
    url: "#",
    icon: Bot,
    items: [
      {
        key: "genesis",
        title: "Genesis",
        url: "#",
      },
      {
        key: "explorer",
        title: "Explorer",
        url: "#",
      },
      {
        key: "quantum",
        title: "Quantum",
        url: "#",
      },
    ],
  },
  {
    title: "Documentation",
    url: "#",
    icon: BookOpen,
    items: [
      {
        key: "introduction",
        title: "Introduction",
        url: "#",
      },
      {
        key: "get-started",
        title: "Get Started",
        url: "#",
      },
      {
        key: "tutorials",
        title: "Tutorials",
        url: "#",
      },
      {
        key: "changelog",
        title: "Changelog",
        url: "#",
      },
    ],
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings2,
    items: [
      {
        title: "General",
        url: "#",
      },
      {
        title: "Team",
        url: "#",
      },
      {
        title: "Billing",
        url: "#",
      },
      {
        title: "Limits",
        url: "#",
      },
    ],
  },
]

/**
 * 系统服务
 */
export const SystemService = {
  /**
   * 获取导航主菜单数据
   * @returns 导航主菜单数据
   */
  async getNavMainData<T extends NavChildren = NavChildren>(): Promise<
    NavMainGroup<T>
  > {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(navMainData as NavMainGroup<T>)
      }, 1000)
    })
  },
}
