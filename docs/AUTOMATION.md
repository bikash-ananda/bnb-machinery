# Commerce automation

The engine turns committed commerce changes into durable events, then processes those events into email outbox records. A separate runner calls the private cron endpoint every minute. PostgreSQL is the queue and source of truth; Redis is not required for correctness.

## Starter workflows

- New customer: welcome message when a customer profile is created through checkout or POS.
- New order: buyer confirmation and a separate order desk alert.
- Order progress: customer update after confirmation, cancellation, dispatch, pickup readiness or completion.
- Invoice and payment: email an invoice link after posting, and a receipt with the remaining balance after each recorded payment.
- Inventory: alert when sellable quantity reaches the product's reorder level. Active reservations count against sellable stock.
- Accounts receivable: send one payment reminder after an unpaid or partially paid order has been open for 24 hours.
- Customer retention: check in seven days after the order reaches Completed.
- Daily operations: at 7 PM Nepal time, send the owner a Nepal-date summary of orders, collections, open customer balances and products at reorder level.

Each workflow can be paused in **Admin → Automation center**. Pausing stops new messages from that workflow; messages already in the email outbox remain queued. The center shows the last scheduler cycle, pending and failed work, recent events, and delivery attempts. Staff can run a cycle or retry failed items from the same page.

## Local setup

1. Apply the Drizzle migrations to the local commerce database with `npm run db:migrate`.
2. Set `RESEND_API_KEY`, `AUTOMATION_FROM_EMAIL` (or `OTP_FROM_EMAIL`) and `AUTOMATION_ALERT_EMAIL` in `.env.local` to enable email delivery. The sender domain must be verified with Resend.
3. Set a private `AUTOMATION_CRON_SECRET` of at least 32 characters in `.env.local` (for example, generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`).
4. Start the site with `npm run dev`, then start the scheduler in another terminal with `npm run automation:worker`.

Without email credentials, messages stay in the outbox as **Blocked** and are not discarded. Once the sender is configured, the next scheduler cycle resumes delivery.

## Production

Set `AUTOMATION_CRON_SECRET`, `AUTOMATION_FROM_EMAIL` and `AUTOMATION_ALERT_EMAIL` in `infra/.env.production`. Compose starts the private `automation` service automatically after the web health check. The runner uses an authenticated internal request and is not exposed through Caddy.

The Resend request includes the outbox idempotency key so retrying a timed-out request does not normally send the same email twice. Resend retains idempotency keys for 24 hours; the local outbox still keeps its own sent/failed state and retry history. See [Resend's idempotency-key guidance](https://resend.com/changelog/idempotency-keys).

## Safety and scope

Events are written in the same PostgreSQL transaction as order, invoice, payment, stock movement and reservation changes. Event keys and message keys prevent duplicate queue records. Email is plain text and sent only to customer contact details already on the business record, or the configured alert inbox. The finance digest is an operational summary; accounting records remain the source of truth. Payment status is never changed based on a scanned QR or an email send.

Workflows are predefined and staff-toggleable, not an arbitrary code or email-template editor. This keeps automated actions limited to reviewed business cases while the customer, inventory, procurement and accounting modules continue to evolve.
