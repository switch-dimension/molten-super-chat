# Molten Super Chat

A ChatGPT-style web app with multi-model support. Pick any model when starting a chat, or run one prompt against multiple models and compare outputs side by side.

## Stack

- **Next.js 16** (App Router)
- **Vercel AI SDK** (`ai`, `@ai-sdk/react`) with direct providers: **OpenAI**, **Anthropic**, **Google** (Gemini)
- **Drizzle** + **Postgres** for chat and compare persistence

## Setup

1. Install dependencies: `pnpm install`
2. Copy `.env.example` to `.env.local` and set:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `DATABASE_URL` (Postgres connection string)
3. Push schema: `pnpm db:push` (or run migrations)
4. Run dev: `pnpm dev`

## Features

- **Single-model chat**: New chat → choose provider/model → conversation with persistence.
- **Compare mode**: One prompt → 2–4 models → parallel streamed outputs in columns.
- **Persistent compare branches**: Each model column is a branch; you can “Continue this branch” with a follow-up prompt.
- **Promote**: Turn a compare response into a new chat (Start chat from this).

## Deploy (Railway)

- **Project**: `molten-super-chat` (linked via `railway link` in this directory).
- **Service**: `web`. Set `DATABASE_URL` and the three AI API keys as service variables (or use Railway Postgres and `${{Postgres.DATABASE_URL}}`).
- **Domain**: Generate or view the default `*.railway.app` domain in the service’s Networking settings. Custom domain: `railway domain <your-domain.com> --service web`.
- **Migrations**: Before or after first deploy, run schema against the deployment DB: `DATABASE_URL='<url>' pnpm db:push` (or your migrate command). Use the same `DATABASE_URL` as configured on Railway.

## Scripts

- `pnpm dev` – development server
- `pnpm build` / `pnpm start` – production
- `pnpm db:generate` – generate Drizzle migrations
- `pnpm db:push` – push schema to DB (no migrations)
- `pnpm db:migrate` – run migrations
