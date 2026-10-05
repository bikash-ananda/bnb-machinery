# Handoff (rewrite at the end of every task; <=15 lines)

Done: Phase 0 tasks 0.1 and 0.2a (foundation libs + config + locales + tests; shop update 2: compare, saved, brands, bilingual shop UI, order emails).
Next: 0.2b (migrate inline tr() strings to locales keys), then 0.3 (Drizzle + dev compose + CI), then 0.4 (Docker run of the current site).
Gotchas: imports use `@/src/...` and `@/config/...` (alias `@/*` = repo root). Money is bigint paisa. tsconfig target is ES2022 (delete tsconfig.tsbuildinfo if stale errors appear).
Rule: i18n keys must exist in BOTH locales/en.json and locales/ne.json (test fails otherwise).
Commands: pnpm typecheck && pnpm lint && pnpm test
Still on Supabase: lib/server/{supabase,inventory,auth}.ts (removed in Phase 1).
