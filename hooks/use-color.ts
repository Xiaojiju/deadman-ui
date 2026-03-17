import * as React from "react"
import { useClient } from "./use-client"

export type ColorTheme =
  | "blue"
  | "green"
  | "neutral"
  | "orange"
  | "red"
  | "rose"
  | "violet"
  | "yellow"

const DEFAULT_COLOR = "blue"
const STORAGE_KEY = "color-theme"
const THEME_LINK_ID = "theme-stylesheet"

export function useColorTheme() {
  // 从 localStorage 初始化主题，不存在则使用默认主题
  const [colorTheme, setColorTheme] = React.useState<ColorTheme>(() => {
    // 检查 localStorage 是否存在（在服务器端渲染时不存在）
    if (typeof window !== "undefined" && localStorage) {
      const savedTheme = localStorage.getItem(STORAGE_KEY) as ColorTheme | null
      return savedTheme || DEFAULT_COLOR
    }
    return DEFAULT_COLOR
  })
  const isClient = useClient()

  // 加载主题 CSS 文件
  const loadThemeCSS = (theme: ColorTheme) => {
    // 确保只在客户端运行（在服务器端渲染时不存在 document）
    if (isClient && document) {
      // 移除现有的主题样式链接
      const existingLink = document.getElementById(
        THEME_LINK_ID
      ) as HTMLLinkElement | null
      if (existingLink) {
        existingLink.remove()
      }

      // 创建新的主题样式链接
      const link = document.createElement("link")
      link.id = THEME_LINK_ID
      link.rel = "stylesheet"
      link.href = `/_theme/${theme}.css`
      document.head.appendChild(link)
    }
  }

  // 当主题变化时，更新 DOM 属性、localStorage 并加载主题 CSS
  React.useEffect(() => {
    // 确保只在客户端运行
    if (isClient && document && localStorage) {
      document.documentElement.setAttribute("data-color-theme", colorTheme)
      localStorage.setItem(STORAGE_KEY, colorTheme)
      loadThemeCSS(colorTheme)
    }
  }, [colorTheme])

  // 初始化时加载默认主题，当 isClient 变为 true 时也加载
  React.useEffect(() => {
    loadThemeCSS(colorTheme)
  }, [isClient, colorTheme])

  // 提供一个方法来切换主题
  const toggleColorTheme = (theme: ColorTheme) => {
    setColorTheme(theme)
  }

  return {
    colorTheme,
    setColorTheme,
    toggleColorTheme,
  }
}
