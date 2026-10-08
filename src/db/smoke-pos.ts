export {};
async function main() {
  try { process.loadEnvFile(".env.local"); } catch {}
  const { db } = await import("./client");
  const s = await import("./schema");
  const pos = await import("../modules/sales/pos");
  const adj = await import("../modules/inventory/adjust");
  const { formatNPR } = await import("../lib/money");
  const { eq } = await import("drizzle-orm");
  const [p] = await db.select().from(s.products).where(eq(s.products.slug, "corn-sheller"));
  if (!p?.pricePaisa) throw new Error("Run pnpm db:smoke first (it prices corn-sheller)");
  await db.transaction((tx) => adj.adjustStock(tx, { productId: p.id, qty: 5, reason: "OPENING", unitCostPaisa: 3200000n, createdBy: "smoke" }));

  const a = await pos.completePosSale({ customer: { name: "Ram", phone: "9841000001" }, items: [{ productId: p.id, qty: 1, discountBp: 1000 }], payments: [{ method: "CASH", amountPaisa: 5000000n }], createdBy: "smoke" });
  console.log("cash sale", a.invoiceNo, "total", formatNPR(a.totalPaisa), "change", formatNPR(a.changePaisa), "(10% off Rs 45,000 = Rs 40,500, change Rs 9,500)");

  try {
    await pos.completePosSale({ customer: { name: "Hari", phone: "9841000002" }, items: [{ productId: p.id, qty: 1 }], payments: [], onCredit: true, createdBy: "smoke" });
    console.log("FAIL: credit allowed without a limit");
  } catch (e) { console.log("credit blocked:", (e as Error).message); }

  await db.update(s.customers).set({ creditLimitPaisa: 10000000n }).where(eq(s.customers.phone, "9841000002"));
  const c = await pos.completePosSale({ customer: { name: "Hari", phone: "9841000002" }, items: [{ productId: p.id, qty: 1 }], payments: [{ method: "CASH", amountPaisa: 1000000n }], onCredit: true, createdBy: "smoke" });
  console.log("part-credit sale", c.invoiceNo, "paid", formatNPR(c.paidPaisa), "due", formatNPR(c.duePaisa));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
