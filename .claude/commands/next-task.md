---
description: Do the next unchecked task from docs/ROADMAP.md (cheap, one task per session)
---
1) Read docs/HANDOFF.md, CLAUDE.md, and the FIRST unchecked task in docs/ROADMAP.md (or the one in $ARGUMENTS). Read only the docs that task needs.
2) Give a plan in <=8 lines (files to add/change). If it touches auth, billing, tax, deletes data, or deploys: stop and wait for my OK. Otherwise continue.
3) Implement with tests. Add Nepali + English strings. Include the DB migration. Use Grep/Glob and file ranges; do not read whole large files.
4) Run typecheck, lint, tests quietly; show only failures; fix them.
5) Tick the checkbox in docs/ROADMAP.md, update docs if a rule changed, rewrite docs/HANDOFF.md (<=15 lines: done, next, gotchas, commands to run).
6) Reply with: what changed, what I should click-test in the browser. Then stop (I will /clear).
