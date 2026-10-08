import { sql } from "drizzle-orm";

async function main() {
  try { process.loadEnvFile(".env.local"); } catch {}
  const { db } = await import("./client");
  const s = await import("./schema");
  const inv = await import("../modules/inventory/service");
  const adj = await import("../modules/inventory/adjust");
  const sales = await import("../modules/sales/orders");
  const { formatNPR } = await import("../lib/money");
  const { eq } = await import("drizzle-orm");

  const [p] = await db.select().from(s.products).where(eq(s.products.slug, "corn-sheller"));
  if (!p) throw new Error("Run pnpm db:seed first");
  await db.update(s.products).set({ pricePaisa: 4500000n, costPaisa: 3200000n, trackStock: true }).where(eq(s.products.id, p.id));
  await db.transaction((tx) => adj.adjustStock(tx, { productId: p.id, qty: 10, reason: "OPENING", unitCostPaisa: 3200000n, note: "smoke test", createdBy: "smoke" }));
  const avail = (label: string) => db.transaction(async (tx) => console.log(label, (await inv.getAvailability(tx, [p.id])).get(p.id)));

  await avail("available after purchase (expect 10):");
  const o = await sales.createOrder({ customer: { name: "Smoke Test", phone: "9800000000" }, delivery: "pickup", payment: "shop", items: [{ slug: "corn-sheller", qty: 2 }] });
  console.log("order", o.orderNo, formatNPR(o.totalPaisa));
  await avail("available after reserve (expect 8):");
  const invoice = await sales.confirmOrder(o.id, "smoke");
  console.log("invoice", invoice.invoiceNo, "net", formatNPR(invoice.taxablePaisa), "VAT", formatNPR(invoice.vatPaisa), "total", formatNPR(invoice.totalPaisa));
  const again = await sales.confirmOrder(o.id, "smoke");
  console.log("confirm twice gives same invoice:", again.id === invoice.id);
  await avail("available after confirm (expect 8):");
  console.log("payment status:", await sales.recordPayment(o.id, "CASH", invoice.totalPaisa, undefined, "smoke"));
  try { await sales.createOrder({ customer: { name: "X", phone: "9811111111" }, delivery: "pickup", payment: "shop", items: [{ slug: "corn-sheller", qty: 99 }] }); console.log("FAIL: oversell allowed"); }
  catch (e) { console.log("oversell blocked:", (e as Error).message); }
  try { await db.execute(sql`delete from stock_movements`); console.log("FAIL: ledger deletable"); }
  catch { console.log("ledger is tamper-proof: delete blocked"); }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
