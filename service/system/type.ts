import { LucideIcon } from "lucide-react"
/**
 * 导航项
 * @template T 导航项类型，默认值为 NavItem
 * @property title 导航项标题
 * @property url 导航项 URL
 * @property icon 导航项图标
 * @property isActive 是否激活
 * @property items 子导航项
 */
export interface NavChildren {
  key?: string
  title: string
  url: string
  isActive?: boolean
}

/**
 * 导航项
 * @template T 导航项类型，默认值为 NavItem
 * @property title 导航项标题
 * @property url 导航项 URL
 * @property icon 导航项图标
 * @property isActive 是否激活
 * @property items 子导航项
 */
export interface NavItem<T extends NavChildren = NavChildren> {
  key?: string
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: T[]
}

export type NavMainGroup<T extends NavChildren = NavChildren> = NavItem<T>[]
