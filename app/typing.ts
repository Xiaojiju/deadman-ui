export type TextPart = { type: "text"; text: string }
export type ImagePart = { type: "image_url"; image_url: { url: string } }
export type ContentPart = TextPart | ImagePart

/**
 * 大模型消息格式
 * 符合openai多模态消息格式
 * https://platform.openai.com/docs/guides/text-generation/multimodal-chat-completions
 */
export type LlmMessage = {
  /**
   * 消息角色
   * system: 系统角色，用于设置大模型的行为和偏好
   * user: 用户角色，用于发送用户消息
   * assistant: 助手角色，用于发送大模型回复的消息
   */
  role: "system" | "user" | "assistant"
  /**
   * 消息内容
   * 可以是文本、图片、音频等
   * 也可以是数组，用于支持多模态消息
   */
  content: string | ContentPart[] | null
}

/**
 * 大模型对话请求体
 */
export type LlmChatRequest = {
  /**
   * 模型名称
   * 例如："gpt-4o-mini"
   */
  model?: string
  /**
   * 消息列表
   * 消息列表，用于发送给大模型
   */
  messages: LlmMessage[]
  /**
   * 是否流式输出
   * 是否流式输出，默认false
   */
  stream?: boolean
  /**
   * 温度
   * 温度，默认1
   */
  temperature?: number
  /**
   * 最大输出token数
   * 最大输出token数，默认1000
   */
  maxOutputTokens?: number
  /**
   * 工具
   * 工具，用于调用大模型内置的工具
   */
  tools?: unknown[]
  /**
   * 工具选择
   * 工具选择，用于选择大模型内置的工具
   */
  toolChoice?: unknown
  /**
   * 响应格式
   * 响应格式，用于选择大模型内置的响应格式
   */
  responseFormat?: "text" | "json"
}

export type LlmChatResponse = {
  id: string
  createdAt: number
  model: string
  message: LlmMessage
  usage?:
    | {
        inputTokens: number
        outputTokens: number
        totalTokens: number
      }
    | undefined
}

export type LlmModel = {
  provider: string
  model: string
}
