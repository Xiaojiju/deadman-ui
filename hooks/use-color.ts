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

const DEFAULT_COLOR: ColorTheme = "blue"
const STORAGE_KEY = "color-theme"
const THEME_LINK_ID = "theme-stylesheet"

const getInitialTheme = (): ColorTheme => {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage?.getItem(
        STORAGE_KEY
      ) as ColorTheme | null
      if (saved) return saved
    } catch {
      // 读取失败时回退到默认主题
    }
  }
  return DEFAULT_COLOR
}

export function useColorTheme() {
  const [colorTheme, setColorTheme] =
    React.useState<ColorTheme>(getInitialTheme)
  const isClient = useClient()

  // 当主题变化时，更新 DOM 属性与 localStorage，并加载对应 CSS
  React.useEffect(() => {
    if (!isClient) return
    if (typeof document === "undefined" || typeof window === "undefined") return

    document.documentElement.setAttribute("data-color-theme", colorTheme)

    try {
      window.localStorage?.setItem(STORAGE_KEY, colorTheme)
    } catch {
      // 忽略存储失败
    }

    const existingLink = document.getElementById(
      THEME_LINK_ID
    ) as HTMLLinkElement | null

    const href = `/_theme/${colorTheme}.css`

    if (existingLink) {
      if (existingLink.getAttribute("href") === href) {
        return
      }
      existingLink.remove()
    }

    const link = document.createElement("link")
    link.id = THEME_LINK_ID
    link.rel = "stylesheet"
    link.href = href
    document.head.appendChild(link)
  }, [colorTheme, isClient])

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
