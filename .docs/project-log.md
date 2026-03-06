# Molten Super Chat — Project Log

---

## 2026-03-06 — Initial build complete

### Summary
Built the full Molten Super Chat application from scratch: a ChatGPT-style web app with multi-model support (OpenAI, Anthropic, Google Gemini). Includes single-model chat, compare mode (parallel streaming to 2–4 models), branch continuation, and promote-to-chat. All chat and compare data is persisted to Postgres via Drizzle ORM.

### Current State
[x] Working
[ ] In progress
[ ] Blocked
[ ] Broken

The app runs locally via `pnpm dev` on `http://localhost:3000`. The database schema has been pushed to a Neon Postgres instance. All core features (single chat, compare, continue branch, promote) are implemented and functional.

### Next Steps
1. Test all flows end-to-end (create chat, send messages, compare models, continue branch, promote to chat)
2. Add chat history sidebar or listing page so users can return to previous conversations
3. Add error handling UI (toast notifications, retry on failure)
4. Add loading/skeleton states for better UX during initial data fetches
5. Consider adding message editing and regeneration
6. Deploy to Vercel and configure environment variables

### Context
- **Stack**: Next.js 16 (App Router, Turbopack), React 19, Vercel AI SDK v6, Drizzle ORM, Neon Postgres, Tailwind CSS v4
- **Key files**:
  - `src/lib/db/schema.ts` — database schema (chats, chat_messages, chat_runs, compare_branches, compare_messages)
  - `src/lib/ai/provider-registry.ts` — AI SDK provider setup
  - `src/lib/ai/model-catalog.ts` — available models catalog
  - `src/app/api/chat/route.ts` — single-model chat streaming API
  - `src/app/api/compare/route.ts` — multi-model compare streaming API
  - `src/components/chat/chat-shell.tsx` — main chat UI
  - `src/components/compare/compare-shell.tsx` — compare mode UI
- **Environment**: Requires `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, and `DATABASE_URL` in `.env.local`. See `.env.example` for template.
- **Git**: 2 commits on `main` — initial Next.js scaffold + core functionality. Working tree is clean.
- **DB setup**: Run `pnpm db:push` to push schema to Postgres (no migrations needed for dev).

---
