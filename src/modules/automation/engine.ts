import "server-only";

import { aliasedTable, and, asc, count, desc, eq, gte, inArray, isNull, lt, lte, notInArray, or, sql, sum } from "drizzle-orm";
import { db, type Tx } from "../../db/client";
import { customers } from "../customers/schema";
import { products } from "../catalog/schema";
import { invoices, orderItems, orders, payments } from "../sales/schema";
import { stockBalances, stockReservations } from "../inventory/schema";
import { enqueueAutomationEvent } from "./events";
import { automationEvents, automationRules, jobRuns, outbox } from "./schema";

const EVENT_BATCH = 30;
const EMAIL_BATCH = 10;
const MAX_ATTEMPTS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

type EventRow = typeof automationEvents.$inferSelect;
type RuleRow = typeof automationRules.$inferSelect;
type OutboxRow = typeof outbox.$inferSelect;

function ruleIsEnabled(rules: Map<string, RuleRow>, code: string) {
  return rules.get(code)?.enabled === true;
}

function validEmail(value: string | null | undefined): value is string {
  return !!value && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function money(value: bigint | number | string | null | undefined) {
  const amount = BigInt(String(value ?? 0));
  const negative = amount < 0n;
  const positive = negative ? -amount : amount;
  const rupees = (positive / 100n).toLocaleString("en-NP");
  const paisa = String(positive % 100n).padStart(2, "0");
  return "NPR " + (negative ? "-" : "") + rupees + "." + paisa;
}

function nepalDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (key: string) => parts.find((part) => part.type === key)?.value ?? "0";
  const year = Number(value("year"));
  const month = Number(value("month"));
  const day = Number(value("day"));
  const label = value("year") + "-" + value("month") + "-" + value("day");
  const start = new Date(Date.UTC(year, month - 1, day) - 345 * 60 * 1000);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", hourCycle: "h23" }).format(now));
  return { label, start, end: new Date(start.getTime() + DAY_MS), hour };
}

async function queueEmail(
  tx: Tx,
  rule: string,
  event: EventRow,
  recipient: string | null | undefined,
  subject: string,
  body: string,
) {
  if (!validEmail(recipient)) return;
  await tx.insert(outbox).values({
    channel: "EMAIL",
    toAddress: recipient,
    subject: subject.slice(0, 180),
    body: body.slice(0, 10_000),
    kind: rule,
    dedupeKey: rule + ":" + event.id,
  }).onConflictDoNothing({ target: outbox.dedupeKey });
}

async function orderBrief(tx: Tx, orderId: string) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const [paidRow] = await tx.select({ paid: sum(payments.amountPaisa) }).from(payments).where(eq(payments.orderId, orderId));
  const items = await tx.select({ name: orderItems.name, qty: orderItems.qty }).from(orderItems).where(eq(orderItems.orderId, orderId)).limit(20);
  const paid = BigInt(String(paidRow?.paid ?? 0));
  return { order, items, paid, due: order.totalPaisa - paid };
}

async function lowStockCount(tx: Tx) {
  const rows = await tx.select({ productId: products.id, reorderLevel: products.reorderLevel, onHand: sum(stockBalances.onHand) })
    .from(products)
    .leftJoin(stockBalances, eq(stockBalances.productId, products.id))
    .where(and(eq(products.trackStock, true), gte(products.reorderLevel, 1)))
    .groupBy(products.id, products.reorderLevel);
  const reservationRows = await tx.select({ productId: stockReservations.productId, reserved: sum(stockReservations.qty) })
    .from(stockReservations).where(eq(stockReservations.status, "ACTIVE")).groupBy(stockReservations.productId);
  const reservedByProduct = new Map(reservationRows.map((row) => [row.productId, Number(row.reserved ?? 0)]));
  return rows.filter((row) => Number(row.onHand ?? 0) - (reservedByProduct.get(row.productId) ?? 0) <= row.reorderLevel).length;
}

async function financeDigest(tx: Tx, event: EventRow, rules: Map<string, RuleRow>) {
  if (!ruleIsEnabled(rules, "finance_daily_digest")) return;
  const recipient = process.env.AUTOMATION_ALERT_EMAIL?.trim() || process.env.OWNER_EMAIL?.trim();
  if (!validEmail(recipient)) return;
  const eventDate = typeof event.payload.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.payload.date) ? event.payload.date : nepalDay().label;
  const [year, month, day] = eventDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - 345 * 60 * 1000);
  const end = new Date(start.getTime() + DAY_MS);
  const label = eventDate;
  const [sales] = await tx.select({ orders: count(), total: sum(orders.totalPaisa) }).from(orders)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end), notInArray(orders.status, ["CANCELLED"])));
  const [collections] = await tx.select({ total: sum(payments.amountPaisa) }).from(payments)
    .where(and(gte(payments.receivedAt, start), lt(payments.receivedAt, end)));
  const totalsByOrder = tx.select({ orderId: payments.orderId, paid: sum(payments.amountPaisa).as("paid") })
    .from(payments).groupBy(payments.orderId).as("totals_by_order");
  const openOrders = await tx.select({ total: orders.totalPaisa, paid: totalsByOrder.paid }).from(orders)
    .leftJoin(totalsByOrder, eq(orders.id, totalsByOrder.orderId))
    .where(and(inArray(orders.paymentStatus, ["UNPAID", "PARTIAL"]), notInArray(orders.status, ["CANCELLED"])));
  const outstanding = openOrders.reduce((amount, row) => amount + row.total - BigInt(String(row.paid ?? 0)), 0n);
  const lowStock = await lowStockCount(tx);
  const body = [
    "B&B Machinery daily operations summary",
    "Nepal business date: " + label,
    "",
    "Orders placed: " + String(sales?.orders ?? 0),
    "Order value: " + money(sales?.total),
    "Payments received: " + money(collections?.total),
    "Open customer balances: " + money(outstanding),
    "Products at or below reorder level: " + String(lowStock),
    "",
    "This is an automated operations summary; verify the accounting ledger before filing or reporting figures.",
  ].join("\n");
  await queueEmail(tx, "finance_daily_digest", event, recipient, "Daily business summary · " + label, body);
}

async function dispatchEvent(tx: Tx, event: EventRow, rules: Map<string, RuleRow>) {
  const site = (process.env.APP_ORIGIN?.trim() || "").replace(/\/+$/, "");

  if (event.eventType === "CUSTOMER_CREATED" && ruleIsEnabled(rules, "customer_welcome")) {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, event.aggregateId)).limit(1);
    if (customer?.email) {
      await queueEmail(tx, "customer_welcome", event, customer.email, "Welcome to B&B Machinery", [
        "Hello " + customer.name + ",", "", "Thank you for connecting with B&B Machinery.",
        "We supply machinery, spare parts and practical support for businesses across Nepal.",
        site ? "Explore our catalogue: " + site : "",
        "", "B&B Machinery",
      ].filter(Boolean).join("\n"));
    }
  }

  if (event.eventType === "ORDER_CREATED") {
    const brief = await orderBrief(tx, event.aggregateId);
    if (!brief) return;
    const { order, items } = brief;
    if (ruleIsEnabled(rules, "order_confirmation") && order.email) {
      const itemLines = items.map((item) => "• " + item.name + " × " + String(item.qty)).join("\n");
      await queueEmail(tx, "order_confirmation", event, order.email, "We received order " + order.orderNo, [
        "Hello " + order.customerName + ",", "", "Your order has been received and is waiting for our team to confirm it.",
        "Order: " + order.orderNo, "Items:", itemLines || "See your order with our team.",
        "Order total: " + money(order.totalPaisa), "Delivery: " + order.deliveryMethod,
        "Payment: " + order.paymentMethod, "", "We will contact you if we need any details.", "B&B Machinery",
      ].join("\n"));
    }
    if (ruleIsEnabled(rules, "new_order_alert")) {
      await queueEmail(tx, "new_order_alert", event, process.env.AUTOMATION_ALERT_EMAIL?.trim() || process.env.OWNER_EMAIL?.trim(),
        "New " + order.channel.toLowerCase() + " order · " + order.orderNo,
        "A new order is waiting for review.\n\nOrder: " + order.orderNo + "\nCustomer: " + order.customerName +
        "\nPhone: " + order.phone + "\nTotal: " + money(order.totalPaisa) + "\nStatus: " + order.status +
        (site ? "\n\nOpen admin: " + site + "/admin/orders" : ""));
    }
  }

  if (event.eventType === "ORDER_STATUS_CHANGED" && ruleIsEnabled(rules, "order_progress")) {
    const brief = await orderBrief(tx, event.aggregateId);
    if (!brief?.order.email) return;
    const status = String(event.payload.status ?? brief.order.status).replaceAll("_", " ").toLowerCase();
    await queueEmail(tx, "order_progress", event, brief.order.email, "Update for order " + brief.order.orderNo,
      "Hello " + brief.order.customerName + ",\n\nYour order " + brief.order.orderNo + " is now " + status + ".\n\nIf you have a question, reply to this email or contact B&B Machinery.");
  }

  if (event.eventType === "INVOICE_ISSUED" && ruleIsEnabled(rules, "invoice_email")) {
    const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, event.aggregateId)).limit(1);
    if (!invoice) return;
    const brief = invoice.orderId ? await orderBrief(tx, invoice.orderId) : null;
    if (!brief?.order.email) return;
    await queueEmail(tx, "invoice_email", event, brief.order.email, "Invoice " + invoice.invoiceNo + " from B&B Machinery",
      "Hello " + brief.order.customerName + ",\n\nInvoice " + invoice.invoiceNo + " has been issued for order " + brief.order.orderNo + ".\nTotal: " + money(invoice.totalPaisa) +
      (site ? "\nView/print invoice: " + site + "/print/invoice/" + invoice.id : "") + "\n\nThank you for your business.");
  }

  if (event.eventType === "PAYMENT_RECEIVED" && ruleIsEnabled(rules, "payment_receipt")) {
    const brief = await orderBrief(tx, event.aggregateId);
    if (!brief?.order.email) return;
    await queueEmail(tx, "payment_receipt", event, brief.order.email, "Payment received · " + brief.order.orderNo,
      "Hello " + brief.order.customerName + ",\n\nWe recorded a payment of " + money(String(event.payload.amountPaisa ?? 0)) +
      " for order " + brief.order.orderNo + ".\nBalance due: " + money(brief.due) + "\n\nKeep this email with your receipt.");
  }

  if (event.eventType === "STOCK_CHANGED" && ruleIsEnabled(rules, "reorder_alert")) {
    const [product] = await tx.select().from(products).where(eq(products.id, event.aggregateId)).limit(1);
    if (!product?.trackStock || product.reorderLevel <= 0) return;
    const [balance] = await tx.select({ onHand: sum(stockBalances.onHand) }).from(stockBalances).where(eq(stockBalances.productId, product.id));
    const [reservations] = await tx.select({ qty: sum(stockReservations.qty) }).from(stockReservations)
      .where(and(eq(stockReservations.productId, product.id), eq(stockReservations.status, "ACTIVE")));
    const available = Number(balance?.onHand ?? 0) - Number(reservations?.qty ?? 0);
    if (available > product.reorderLevel) return;
    const recipient = process.env.AUTOMATION_ALERT_EMAIL?.trim() || process.env.OWNER_EMAIL?.trim();
    const dailyKey = nepalDay().label;
    if (!validEmail(recipient)) return;
    await tx.insert(outbox).values({
      channel: "EMAIL", toAddress: recipient, kind: "reorder_alert",
      subject: "Reorder attention · " + product.nameEn,
      body: "Stock is at or below the reorder level.\n\nProduct: " + product.nameEn + "\nSKU: " + product.sku +
        "\nAvailable: " + String(Math.max(0, available)) + "\nReorder level: " + String(product.reorderLevel) +
        (site ? "\n\nOpen inventory: " + site + "/admin/inventory" : ""),
      dedupeKey: "reorder_alert:" + product.id + ":" + dailyKey,
    }).onConflictDoNothing({ target: outbox.dedupeKey });
  }

  if (event.eventType === "PAYMENT_DUE" && ruleIsEnabled(rules, "payment_reminder")) {
    const brief = await orderBrief(tx, event.aggregateId);
    if (!brief?.order.email || brief.due <= 0n || brief.order.status === "CANCELLED") return;
    await queueEmail(tx, "payment_reminder", event, brief.order.email, "Payment reminder · " + brief.order.orderNo,
      "Hello " + brief.order.customerName + ",\n\nOur records show a balance of " + money(brief.due) + " due for order " + brief.order.orderNo +
      ". If you have already paid, please reply with the payment reference so our team can update the order.\n\nB&B Machinery");
  }

  if (event.eventType === "POST_PURCHASE_FOLLOWUP" && ruleIsEnabled(rules, "customer_followup")) {
    const brief = await orderBrief(tx, event.aggregateId);
    if (!brief?.order.email) return;
    await queueEmail(tx, "customer_followup", event, brief.order.email, "How is your machinery working?",
      "Hello " + brief.order.customerName + ",\n\nWe hope your recent purchase is working well. If you need operating guidance, maintenance, spare parts or service, reply to this email and our team will help.\n\nB&B Machinery");
  }

  if (event.eventType === "DAILY_FINANCE_SUMMARY") await financeDigest(tx, event, rules);
}

async function enqueueScheduledEvents() {
  return db.transaction(async (tx) => {
    let scheduled = 0;
    const paymentDueEvents = aliasedTable(automationEvents, "payment_due_events");
    const oldOrders = await tx.select({ id: orders.id }).from(orders)
      .leftJoin(paymentDueEvents, and(eq(paymentDueEvents.eventType, "PAYMENT_DUE"), eq(paymentDueEvents.aggregateId, orders.id)))
      .where(and(inArray(orders.paymentStatus, ["UNPAID", "PARTIAL"]), notInArray(orders.status, ["CANCELLED"]), lte(orders.createdAt, new Date(Date.now() - DAY_MS)), isNull(paymentDueEvents.id)))
      .orderBy(asc(orders.createdAt)).limit(100);
    for (const order of oldOrders) {
      if (await enqueueAutomationEvent(tx, { eventType: "PAYMENT_DUE", aggregateType: "order", aggregateId: order.id, dedupeKey: "payment-due:" + order.id })) scheduled++;
    }

    const completionRows = await tx.execute(sql`SELECT event.aggregate_id
      FROM automation_events AS event
      WHERE event.event_type = 'ORDER_STATUS_CHANGED'
        AND event.payload ->> 'status' = 'COMPLETED'
        AND event.created_at <= ${new Date(Date.now() - 7 * DAY_MS)}
        AND NOT EXISTS (
          SELECT 1 FROM automation_events AS followup
          WHERE followup.event_type = 'POST_PURCHASE_FOLLOWUP'
            AND followup.aggregate_id = event.aggregate_id
        )
      ORDER BY event.created_at ASC
      LIMIT 200`);
    for (const completed of completionRows.rows as { aggregate_id: string }[]) {
      if (await enqueueAutomationEvent(tx, { eventType: "POST_PURCHASE_FOLLOWUP", aggregateType: "order", aggregateId: completed.aggregate_id, dedupeKey: "post-purchase:" + completed.aggregate_id })) scheduled++;
    }

    const localDay = nepalDay();
    if (localDay.hour >= 19) {
      if (await enqueueAutomationEvent(tx, { eventType: "DAILY_FINANCE_SUMMARY", aggregateType: "business_day", aggregateId: localDay.label, payload: { date: localDay.label }, dedupeKey: "finance-digest:" + localDay.label })) scheduled++;
    }
    return scheduled;
  });
}

async function processEventBatch() {
  return db.transaction(async (tx) => {
    const rules = new Map((await tx.select().from(automationRules)).map((rule) => [rule.code, rule]));
    const batch = await tx.select().from(automationEvents)
      .where(and(eq(automationEvents.status, "PENDING"), lte(automationEvents.availableAt, new Date())))
      .orderBy(asc(automationEvents.createdAt)).limit(EVENT_BATCH).for("update", { skipLocked: true });
    let processed = 0;
    let failed = 0;
    for (const event of batch) {
      const attempts = event.attempts + 1;
      await tx.update(automationEvents).set({ status: "PROCESSING", attempts }).where(eq(automationEvents.id, event.id));
      try {
        // Savepoints isolate one malformed event so it cannot block the rest of the queue.
        await tx.transaction((eventTx) => dispatchEvent(eventTx, event, rules));
        await tx.update(automationEvents).set({ status: "PROCESSED", processedAt: new Date(), lastError: null }).where(eq(automationEvents.id, event.id));
        processed++;
      } catch (error) {
        const retry = attempts < MAX_ATTEMPTS;
        await tx.update(automationEvents).set({
          status: retry ? "PENDING" : "FAILED",
          availableAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 1000),
          lastError: (error instanceof Error ? error.message : "Automation event failed.").slice(0, 500),
        }).where(eq(automationEvents.id, event.id));
        failed++;
      }
    }
    return { processed, failed };
  });
}

function emailConfig() {
  return {
    key: process.env.RESEND_API_KEY?.trim(),
    from: process.env.AUTOMATION_FROM_EMAIL?.trim() || process.env.OTP_FROM_EMAIL?.trim(),
  };
}

async function deliverEmail(row: OutboxRow, key: string, from: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + key, "content-type": "application/json", "idempotency-key": row.dedupeKey || row.id },
    body: JSON.stringify({ from, to: [row.toAddress], subject: row.subject || "B&B Machinery update", text: row.body }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).replace(/[\r\n]+/g, " ").slice(0, 300);
    throw new Error("Email provider returned " + response.status + (detail ? ": " + detail : ""));
  }
}

async function deliverOutboxBatch() {
  const config = emailConfig();
  if (!config.key || !config.from) {
    const blocked = await db.update(outbox).set({ status: "BLOCKED", lastError: "Email delivery needs RESEND_API_KEY and AUTOMATION_FROM_EMAIL." })
      .where(and(eq(outbox.channel, "EMAIL"), eq(outbox.status, "PENDING"))).returning({ id: outbox.id });
    return { sent: 0, failed: 0, blocked: blocked.length };
  }

  await db.update(outbox).set({ status: "PENDING", lastError: null, availableAt: new Date() })
    .where(and(eq(outbox.channel, "EMAIL"), eq(outbox.status, "BLOCKED")));
  const batch = await db.transaction(async (tx) => {
    const now = new Date();
    const staleSending = new Date(Date.now() - 15 * 60 * 1000);
    const rows = await tx.select().from(outbox).where(and(eq(outbox.channel, "EMAIL"), or(
      and(eq(outbox.status, "PENDING"), lte(outbox.availableAt, now)),
      and(eq(outbox.status, "SENDING"), lte(outbox.createdAt, staleSending)),
    ))).orderBy(asc(outbox.createdAt)).limit(EMAIL_BATCH).for("update", { skipLocked: true });
    for (const row of rows) {
      await tx.update(outbox).set({ status: "SENDING", attempts: row.attempts + 1 }).where(eq(outbox.id, row.id));
    }
    return rows.map((row) => ({ ...row, attempts: row.attempts + 1 }));
  });

  let sent = 0;
  let failed = 0;
  for (const row of batch) {
    try {
      await deliverEmail(row, config.key, config.from);
      await db.update(outbox).set({ status: "SENT", sentAt: new Date(), lastError: null }).where(eq(outbox.id, row.id));
      sent++;
    } catch (error) {
      const retry = row.attempts < MAX_ATTEMPTS;
      await db.update(outbox).set({
        status: retry ? "PENDING" : "FAILED",
        availableAt: new Date(Date.now() + Math.min(60, 2 ** row.attempts) * 60_000),
        lastError: (error instanceof Error ? error.message : "Email delivery failed.").slice(0, 500),
      }).where(eq(outbox.id, row.id));
      failed++;
    }
  }
  return { sent, failed, blocked: 0 };
}

export async function runAutomationCycle() {
  if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is not configured for the automation engine.");
  const startedAt = Date.now();
  try {
    const scheduled = await enqueueScheduledEvents();
    const events = await processEventBatch();
    const emails = await deliverOutboxBatch();
    const detail = JSON.stringify({ scheduled, eventsProcessed: events.processed, eventsFailed: events.failed, ...emails });
    await db.insert(jobRuns).values({ name: "commerce-automation", lastRunAt: new Date(), lastStatus: events.failed || emails.failed ? "DEGRADED" : "OK", lastDetail: detail })
      .onConflictDoUpdate({ target: jobRuns.name, set: { lastRunAt: new Date(), lastStatus: events.failed || emails.failed ? "DEGRADED" : "OK", lastDetail: detail } });
    return { scheduled, eventsProcessed: events.processed, eventsFailed: events.failed, emailsSent: emails.sent, emailsFailed: emails.failed, emailsBlocked: emails.blocked, durationMs: Date.now() - startedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation cycle failed.";
    try {
      await db.insert(jobRuns).values({ name: "commerce-automation", lastRunAt: new Date(), lastStatus: "ERROR", lastDetail: message.slice(0, 500) })
        .onConflictDoUpdate({ target: jobRuns.name, set: { lastRunAt: new Date(), lastStatus: "ERROR", lastDetail: message.slice(0, 500) } });
    } catch { /* preserve the original processing error */ }
    throw error;
  }
}

export async function retryFailedAutomations() {
  const now = new Date();
  const events = await db.update(automationEvents).set({ status: "PENDING", attempts: 0, lastError: null, availableAt: now })
    .where(eq(automationEvents.status, "FAILED")).returning({ id: automationEvents.id });
  const emails = await db.update(outbox).set({ status: "PENDING", attempts: 0, lastError: null, availableAt: now })
    .where(and(eq(outbox.channel, "EMAIL"), eq(outbox.status, "FAILED"))).returning({ id: outbox.id });
  return { events: events.length, emails: emails.length };
}

export async function getAutomationMetrics() {
  const [pendingEvents, failedEvents, pendingEmails, failedEmails, blockedEmails, lastRun] = await Promise.all([
    db.select({ value: count() }).from(automationEvents).where(inArray(automationEvents.status, ["PENDING", "PROCESSING"])),
    db.select({ value: count() }).from(automationEvents).where(eq(automationEvents.status, "FAILED")),
    db.select({ value: count() }).from(outbox).where(inArray(outbox.status, ["PENDING", "SENDING"])),
    db.select({ value: count() }).from(outbox).where(eq(outbox.status, "FAILED")),
    db.select({ value: count() }).from(outbox).where(eq(outbox.status, "BLOCKED")),
    db.select().from(jobRuns).where(eq(jobRuns.name, "commerce-automation")).limit(1),
  ]);
  return {
    pendingEvents: Number(pendingEvents[0]?.value ?? 0), failedEvents: Number(failedEvents[0]?.value ?? 0),
    pendingEmails: Number(pendingEmails[0]?.value ?? 0), failedEmails: Number(failedEmails[0]?.value ?? 0),
    blockedEmails: Number(blockedEmails[0]?.value ?? 0),
    lastRun: lastRun[0] ? { at: lastRun[0].lastRunAt.toISOString(), status: lastRun[0].lastStatus, detail: lastRun[0].lastDetail } : null,
  };
}

export async function getAutomationActivity() {
  const [events, messages] = await Promise.all([
    db.select({ id: automationEvents.id, eventType: automationEvents.eventType, aggregateType: automationEvents.aggregateType,
      status: automationEvents.status, attempts: automationEvents.attempts, createdAt: automationEvents.createdAt })
      .from(automationEvents).orderBy(desc(automationEvents.createdAt)).limit(8),
    db.select({ id: outbox.id, kind: outbox.kind, toAddress: outbox.toAddress, subject: outbox.subject,
      status: outbox.status, attempts: outbox.attempts, createdAt: outbox.createdAt })
      .from(outbox).orderBy(desc(outbox.createdAt)).limit(8),
  ]);
  return {
    events: events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    messages: messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() })),
  };
}

export async function listAutomationRules() {
  return db.select().from(automationRules).orderBy(asc(automationRules.area), asc(automationRules.name));
}
