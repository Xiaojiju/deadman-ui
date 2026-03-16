"use client"

import { Languages, Moon, Palette, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname, useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColorTheme, useColorTheme } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
/**
 * 主题切换组件
 * @returns 主题切换组件
 */
export function ModeToggle() {
  const { setTheme } = useTheme()
  const t = useTranslations("Theme")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {t("light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {t("dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {t("system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
/**
 * 语言切换组件
 * @returns 语言切换组件
 */
export function LanguageToggle() {
  const router = useRouter()
  const currentLocale = useLocale()
  const currentPath = usePathname()

  function handleLocaleChange(locale: string) {
    if (locale === currentLocale) return

    let newPath = currentPath

    // 替换路径中的语言前缀
    if (currentPath.startsWith(`/${currentLocale}/`)) {
      newPath = currentPath.replace(`/${currentLocale}/`, `/${locale}/`)
    } else if (currentPath === `/${currentLocale}`) {
      newPath = `/${locale}`
    } else if (currentPath === "/") {
      newPath = `/${locale}`
    } else {
      newPath = `/${locale}${currentPath}`
    }

    router.push(newPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleLocaleChange("en")}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLocaleChange("zh")}>
          中文
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
/**
 * 颜色主题切换组件
 * @returns 颜色主题切换组件
 */
export function ColorThemeToggle() {
  const { colorTheme, toggleColorTheme } = useColorTheme()
  const t = useTranslations("Theme")
  const [isClient, setIsClient] = React.useState(false)

  const colorOptions: { value: ColorTheme; label: string; color: string }[] = [
    { value: "blue", label: t("blue"), color: "bg-blue-500" },
    { value: "green", label: t("green"), color: "bg-green-500" },
    { value: "neutral", label: t("neutral"), color: "bg-gray-500" },
    { value: "orange", label: t("orange"), color: "bg-orange-500" },
    { value: "red", label: t("red"), color: "bg-red-500" },
    { value: "rose", label: t("rose"), color: "bg-rose-500" },
    { value: "violet", label: t("violet"), color: "bg-violet-500" },
    { value: "yellow", label: t("yellow"), color: "bg-yellow-500" },
  ]

  // 确保只在客户端更新状态，避免 hydration 错误
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  // 根据当前主题获取对应的颜色类名
  const currentColor =
    colorOptions.find((option) => option.value === colorTheme)?.color ||
    "bg-blue-500"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isClient ? "default" : "outline"}
          size="icon"
          className={
            isClient ? `${currentColor} text-white hover:opacity-90` : undefined
          }
        >
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t("toggleTheme")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {colorOptions.map(({ value, label, color }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => toggleColorTheme(value)}
            className="flex items-center justify-between"
          >
            <span>{label}</span>
            <div
              className={`h-4 w-4 rounded-full ${color} border border-border`}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
