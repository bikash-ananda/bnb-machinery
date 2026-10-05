---
description: Safe schema change (usage: /db-change <what to change>)
---
Change the Drizzle schema for: $ARGUMENTS. Run `pnpm db:generate`, show me the generated SQL and call out anything destructive or slow on a big table.
Add a data backfill if needed, update services/tests/seed, run `pnpm db:migrate` on the dev DB, and run tests. Never edit an already-applied migration file.
