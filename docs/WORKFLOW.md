# Working with Claude Code cheaply (verified against the official Claude Code cost docs, Oct 2026)

Why: cost grows with context size, because earlier messages are re-read every turn.

## The loop (one roadmap task = one short session)
1. `git checkout -b erp-rebuild` (once). Commit before each session so every task can be reverted.
2. `claude` in the repo root. Type `/clear` if the session has old work in it (costs nothing).
3. Type `/next-task`. For anything on auth, billing, tax or stock ledger press **Shift+Tab** to use plan mode first, read the plan, then approve.
4. Click-test in the browser, then `git add -A && git commit -m "task 0.1 ..."`.
5. `/clear` and repeat. Never keep one session running for days.

## Cheap habits
- `/clear` between tasks; `/compact Focus on <what matters>` only mid-task (it reads the whole conversation, so it is not free).
- `/usage` shows tokens and cost; `/context` shows what is filling the window.
- `/model` and `/effort`: use a stronger model/higher effort for design, auth, tax, stock-ledger; a faster model/lower effort for forms, CRUD pages, copy changes.
- Name files in your prompt ("edit src/modules/catalog/service.ts") instead of "find where products are saved".
- Paste only the error lines, or tell Claude the log file path. Do not paste whole terminal output.
- Keep CLAUDE.md under 200 lines (it is loaded every turn). Long reference stays in docs/ and is read only when needed.
- Ask for one thing at a time; ask Claude to stop after each task (the /next-task command already does).
- Use the security-reviewer / tax-reviewer sub-agents for reviews: they run in their own context and return only a summary.

## When to come back to the chat assistant
Business and legal questions (tax rules, wording), architecture decisions, or if Claude Code is stuck after two attempts. Bring the error lines and HANDOFF.md.
