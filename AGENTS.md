# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Molten Super Chat is a single Next.js 16 application (not a monorepo). It provides a ChatGPT-style multi-model chat interface with single-model chat, compare mode, branch continuation, and promote-to-chat features.

### Services

| Service | How to run | Port | Notes |
|---|---|---|---|
| Next.js dev server | `pnpm dev` | 3457 | Serves both frontend and API routes |
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | 5432 | Must be running before dev server or db:push |

### Key commands

See `package.json` scripts and `README.md` for the full list. Quick reference:

- **Dev server**: `pnpm dev` (port 3457)
- **Lint**: `pnpm lint` (ESLint, warnings are expected — no errors)
- **Build**: `pnpm build`
- **DB schema push**: `pnpm db:push` (requires `DATABASE_URL` in env or `.env.local`)

### Non-obvious caveats

- **esbuild postinstall**: pnpm blocks esbuild build scripts by default. Run `pnpm rebuild esbuild` after `pnpm install` to download platform binaries — `drizzle-kit` needs them.
- **DATABASE_URL precedence**: The Drizzle config loads `.env.local` via dotenv, but a `DATABASE_URL` environment variable (from secrets) takes precedence. If using a local Postgres, unset the env var or adjust `.env.local` accordingly.
- **PostgreSQL local setup**: If using a local DB, create user/database: `sudo -u postgres psql -c "CREATE USER molten WITH PASSWORD 'molten' CREATEDB;"` then `sudo -u postgres psql -c "CREATE DATABASE molten_super_chat OWNER molten;"`. The local connection string is `postgresql://molten:molten@localhost:5432/molten_super_chat`.
- **AI API keys**: At least one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY` must be set for any chat functionality. All three are needed for full compare-mode testing.
