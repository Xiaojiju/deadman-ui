import { useEffect, useState } from "react"

/**
 * 检测当前是否在客户端运行的钩子函数
 * @returns 是否在客户端运行的布尔值
 */
export function useClient() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // 当组件在客户端挂载时，设置为 true
    setIsClient(true)
  }, [])

  return isClient
}

/**
 * 检测当前是否在服务器端运行的钩子函数
 * @returns 是否在服务器端运行的布尔值
 */
export function useServer() {
  const [isServer, setIsServer] = useState(true)

  useEffect(() => {
    // 当组件在客户端挂载时，设置为 false
    setIsServer(false)
  }, [])

  return isServer
}

/**
 * 安全地访问浏览器 API 的工具函数
 * @param callback 要在客户端执行的回调函数
 * @returns 回调函数的返回值，或在服务器端返回 undefined
 */
export function useBrowserApi<T>(callback: () => T): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setResult(callback())
    }
  }, [callback])

  return result
}
