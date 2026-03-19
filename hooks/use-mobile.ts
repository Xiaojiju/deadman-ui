import * as React from "react"
import { useClient } from "./use-client"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const isClient = useClient()
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (!isClient) return
    if (typeof window === "undefined") return

    const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    const mql = window.matchMedia(query)

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches)
    }

    // 初始值
    handleChange(mql)

    // 兼容性处理：新旧 API
    if ("addEventListener" in mql) {
      mql.addEventListener(
        "change",
        handleChange as (e: MediaQueryListEvent) => void
      )
      return () =>
        mql.removeEventListener(
          "change",
          handleChange as (e: MediaQueryListEvent) => void
        )
    } else {
      // @ts-expect-error: 兼容较老的浏览器类型定义
      mql.addListener(handleChange)
      return () => {
        // @ts-expect-error: 兼容较老的浏览器类型定义
        mql.removeListener(handleChange)
      }
    }
  }, [isClient])

  return isMobile
}
