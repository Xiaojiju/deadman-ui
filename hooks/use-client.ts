/**
 * 检测当前是否在客户端运行
 * 在浏览器环境下返回 true，SSR/Node 环境返回 false
 */
export function useClient() {
  return typeof window !== "undefined"
}

/**
 * 检测当前是否在服务器端运行
 */
export function useServer() {
  return typeof window === "undefined"
}

/**
 * 安全地访问浏览器 API 的工具函数
 * @param callback 要在客户端执行的回调函数（建议使用 useCallback 包裹）
 * @returns 回调函数的返回值，或在服务器端返回 undefined
 */
export function useBrowserApi<T>(callback: () => T): T | undefined {
  if (typeof window === "undefined") {
    return undefined
  }

  return callback()
}
