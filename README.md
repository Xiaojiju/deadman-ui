# deadman-ui

**[中文说明](README.zh.md)**

## About

**deadman-ui** is a **Next.js** dashboard with a built-in **AI assistant**: connect **OpenAI-compatible** endpoints via env, **switch models** on the fly, and get **streaming** answers. **Sessions** persist as local files with **smart titles** (short text or LLM summary). The server applies **unified system prompts**, optional **per-session memory**, and **context compression** when input grows—so you get a usable chat product locally without wiring a separate backend first.

---

## Features (current)

- **UI**: React 19, Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/), [next-intl](https://next-intl-docs.vercel.app/) for i18n
- **Chat**: Provider-driven model list from env; streaming and non-streaming; unified system prompts and per-session summary on the server
- **Sessions**: Stored under `.data/chat-sessions/*.json` (good for local/self-hosted; use a database or blob store on ephemeral serverless)
- **Titles**: First user message can rename the session (short text as-is; longer text can use a model-generated title)

---

## Prerequisites

This repo does **not** include `.env.local` (it may contain private API keys). **Create it yourself** before running the app.

1. Copy or create a file named **`.env.local`** in the project root.
2. Add your variables there (at minimum **`PROVIDERS`** — see below).
3. Ensure `.env.local` is **not** committed (it is listed in `.gitignore`).

Example shape for `PROVIDERS` (JSON array; matches `app/server/provider.ts`):

```bash
PROVIDERS='[{"name":"openai","base_url":"https://api.openai.com/v1","api_key":"YOUR_KEY","models":["gpt-4o-mini"]}]'
```

Adjust `name`, `base_url`, `api_key`, and `models` to your provider.

---

## Local development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|--------|-------------|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build and run |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |

---

## Roadmap

- **MCP**: Model Context Protocol for tools and external integrations  
- **RAG**: Retrieval-augmented generation with a vector store and citations  
- **Auth**: Java backend for accounts, tenants, and API-level permissions  
- **Local models**: Python-side loading/inference, wired via a gateway or this UI  

---

## License

If no `LICENSE` file is present in the repo, add one for your use case.
