# Automation specs

## Stock (module `inventory`)
- Ledger-only: `postMovement({product, location, qtyDelta, type, ref})` inside the caller's DB transaction; negative stock blocked unless setting allows backorder.
- Web order -> `reserve`; invoice issued -> `release` + `sale`; cancel -> `release`; purchase GRN -> `purchase`; stock count variance -> `adjust` (needs reason + permission).
- Reorder: nightly + on every movement, if `on_hand - reserved <= min_qty` -> `stock.low` event (once per cycle). Suggested qty = `max_qty - available`. Group suggestions by preferred supplier -> draft PO.
- Weighted-average cost kept per product/location for valuation; FIFO optional later.
- Serial/batch: machines (tillers, reapers, chainsaws) get serial numbers recorded at sale -> warranty expiry reminders.
- Dashboards: low stock, dead stock (no sale 90 days), valuation, fast movers.

## Quotations (module `sales`)
- Sources: website quote list, chat, WhatsApp, staff counter.
- Auto-price: price list -> customer discount tier -> margin floor check. Below floor or unknown price -> stays `draft` for staff.
- Auto-send rule (setting): if total <= limit and all lines priced and in stock -> send PDF by email/WhatsApp.
- Follow-ups via delayed jobs: +2 days, +5 days, expire at `valid_until`. Accept link -> converts to order.
- Quote and invoice share the same line/tax engine.

## Customer replies (module `assistant`)
- Channels: website chat, WhatsApp Business Cloud API, email inbox, (later) Messenger/Viber. One `message_threads` model.
- Bot may only state facts from: catalog (name, specs, price/stock when allowed), `assistant_policies`, company settings. Anything else -> "I'll ask our team" + handoff.
- Never invents price, stock, delivery time, warranty. Pricing disclosure is a setting (public price vs "price on request").
- Languages: reply in the customer's language (Nepali/English/Romanized Nepali). Voice notes -> transcribe -> answer.
- Handoff: staff inbox with full thread, bot pauses when a human replies; SLA alert if no human response in X minutes in business hours.
- After-hours auto-reply with opening hours (from settings). Order status auto-updates via approved WhatsApp templates.
- Abuse limits: per-sender rate limit, max bot turns before handoff, profanity/PII guard.

## Notifications matrix (templates in DB, per locale)
order.placed -> customer + staff | quote.sent -> customer | invoice.issued -> customer (PDF) | payment.received -> customer receipt |
stock.low -> manager | po.overdue -> manager | warranty.expiring -> customer | backup.failed / security alerts -> owner.
