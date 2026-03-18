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
        key: "dashboard",
        title: "Dashboard",
        url: "/dashboard",
        isActive: true,
      },
      {
        key: "starred",
        title: "Starred",
        url: "/dashboard/starred",
      },
      {
        key: "settings",
        title: "Settings",
        url: "/dashboard/settings",
      },
    ],
  }
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
