export interface Provider {
  name: string
  base_url: string
  api_key: string
  models: string[]
}

/**
 * 从环境变量 PROVIDERS 读取 Provider 配置（JSON 数组）
 * 例如：
 * PROVIDERS=[{"name":"alibaba","base_url":"https://dashscope.aliyuncs.com/compatible-mode/v1","api_key":"sk-xxx","models":["bailian/kimi-k2.5"]}]
 */
function loadProvidersFromEnv(): Provider[] {
  const raw = process.env.PROVIDERS
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as Provider[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

class ProviderStore {
  private providers: Provider[]

  constructor() {
    this.providers = loadProvidersFromEnv()
  }

  getProviders(): Provider[] {
    return this.providers
  }

  getProviderByModel(model: string): Provider | undefined {
    return this.providers.find((p) => p.models?.includes(model))
  }
}

export const providerStore = new ProviderStore()
