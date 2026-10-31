# Start prompt for repository work

Read `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ARCHITECTURE.md` and the current roadmap. Inspect the existing implementation before changing files.

Use pnpm and the current Next.js, TypeScript, PostgreSQL, Drizzle and Redis architecture. PostgreSQL is the sole application database. Do not reintroduce hosted database, auth or storage SDKs.

Work in a focused branch. Before coding, summarize the intended changes briefly. Preserve working functionality and existing production data. Never read or print private environment files. Never drop, truncate, reset databases or delete persistent volumes.

Run typecheck, lint, tests and production build. Update the handoff and roadmap when work is complete.
