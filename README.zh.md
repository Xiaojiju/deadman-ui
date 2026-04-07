# deadman-ui

**[English](README.md)**

## About

**deadman-ui** 是一套 **Next.js 仪表盘 + 内置 AI 对话**：通过环境变量接入 **OpenAI 兼容接口**，**多模型切换**、**流式回复**；**会话**落盘持久化，并支持**首句自动标题**（短句直出、长句可摘要）。服务端统一**系统提示**、**会话级记忆摘要**，并在上下文过长时**压缩**，让你在本地就能跑通可用的对话能力，而不必先搭一整套后端。

---

## 当前能力

- **前端**：React 19、Tailwind CSS、[shadcn/ui](https://ui.shadcn.com/)、[next-intl](https://next-intl-docs.vercel.app/) 多语言
- **对话**：模型列表来自环境变量中的 Provider；支持流式 / 非流式；服务端统一系统提示与会话级摘要
- **会话**：数据位于 `.data/chat-sessions/*.json`（适合本地与自托管；无持久磁盘的 Serverless 需另选存储）
- **标题**：首条用户消息可更新会话标题（短句直用，长句可走模型摘要）

---

## 环境变量（必读）

仓库**不包含** `.env.local`，该文件通常放**个人密钥**，请勿提交到 Git（已在 `.gitignore` 中忽略）。

**启动前请自行在项目根目录创建 `.env.local`**，并写入所需变量（至少需要 **`PROVIDERS`**，与 `app/server/provider.ts` 一致）。

示例（请替换为你的真实配置）：

```bash
PROVIDERS='[{"name":"openai","base_url":"https://api.openai.com/v1","api_key":"你的密钥","models":["gpt-4o-mini"]}]'
```

按需修改 `name`、`base_url`、`api_key`、`models`。

若历史上曾误提交过密钥，请轮换密钥，并从 Git 历史中移除敏感文件（必要时使用 `git filter-repo` 等工具）。

---

## 本地运行

```bash
pnpm install
pnpm dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)。

---

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发（Turbopack） |
| `pnpm build` / `pnpm start` | 构建与生产启动 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript 检查 |

---

## 后续规划

- **MCP**：接入 Model Context Protocol，扩展工具与外部系统  
- **RAG**：检索增强生成，向量库与知识库，回答可溯源  
- **权限**：与 **Java 后端** 对接账号、租户与接口级权限  
- **本地模型**：**Python** 侧加载与推理，经网关或与本 UI 对接  

---

## 许可

若仓库根目录暂无 `LICENSE`，请自行补充。
