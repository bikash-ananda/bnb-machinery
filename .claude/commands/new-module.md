---
description: Scaffold a new domain module (usage: /new-module <name>)
---
Create `src/modules/$ARGUMENTS/` with: `schema.ts` (Drizzle), `service.ts` (all DB access, permission checks, audit calls), `actions.ts` (server actions that call service),
`events.ts` (emit + handlers), `ui/` (components), `index.ts` (public exports: service + events only), and `service.test.ts`.
Register permissions (`$ARGUMENTS.read`, `$ARGUMENTS.write`), add locale keys to locales/en.json and ne.json, add the migration, and add a ROADMAP line. Follow CLAUDE.md rules exactly.
