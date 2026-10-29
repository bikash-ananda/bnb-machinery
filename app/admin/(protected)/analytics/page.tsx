import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { orders } from "@/src/modules/sales/schema";
import { products } from "@/src/modules/catalog/schema";
import { stockBalances, stockReservations } from "@/src/modules/inventory/schema";
import { formatNPR } from "@/src/lib/money";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireAdmin("analytics");
  let orderStats = { count: 0, revenue: 0n, open: 0 };
  let productCount = 0, lowStock = 0, inventoryValue = 0n, failed = false;
  try {
    const [ordersAgg, productAgg, balances, reservations] = await Promise.all([
      db.select({count:sql<number>`count(*)::int`,revenue:sql<string>`coalesce(sum(total_paisa),0)::text`,open:sql<number>`count(*) filter (where status not in ('COMPLETED','CANCELLED'))::int`}).from(orders),
      db.select({count:sql<number>`count(*)::int`}).from(products),
      db.select({productId:stockBalances.productId,qty:sql<string>`coalesce(sum(${stockBalances.onHand}),0)::text`}).from(stockBalances).groupBy(stockBalances.productId),
      db.select({productId:stockReservations.productId,qty:sql<string>`coalesce(sum(${stockReservations.qty}),0)::text`}).from(stockReservations).where(sql`${stockReservations.status} = 'ACTIVE'`).groupBy(stockReservations.productId),
    ]);
    orderStats = {count:ordersAgg[0]?.count??0,revenue:BigInt(ordersAgg[0]?.revenue??"0"),open:ordersAgg[0]?.open??0};
    productCount = productAgg[0]?.count??0;
    const bmap=new Map(balances.map(b=>[b.productId,Number(b.qty)]));
    const rmap=new Map(reservations.map(b=>[b.productId,Number(b.qty)]));
    const tracked=await db.select({id:products.id,cost:products.costPaisa,reorder:products.reorderLevel,track:products.trackStock}).from(products).where(sql`${products.trackStock} = true`).limit(1000);
    for(const p of tracked){const onHand=bmap.get(p.id)??0; const available=onHand-(rmap.get(p.id)??0); if(available<=p.reorder)lowStock++; if(p.cost!==null) inventoryValue+=(BigInt(Math.max(0,Math.round(onHand*1000)))*p.cost)/1000n;}
  } catch { failed = true; }
  return <div className="space-y-5"><div><h1 className="text-2xl font-black text-slate-950">Analytics</h1><p className="mt-1 text-sm text-slate-600">Live summary from orders, catalogue and stock ledgers. Revenue is order value, not profit.</p></div>{failed&&<p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Some analytics data could not be loaded. Verify database migrations.</p>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{label:"Orders",value:String(orderStats.count)},{label:"Order value (all statuses)",value:formatNPR(orderStats.revenue)},{label:"Open orders",value:String(orderStats.open)},{label:"Catalogue products",value:String(productCount)},{label:"Low / reorder stock",value:String(lowStock)},{label:"Estimated inventory cost",value:formatNPR(inventoryValue)}].map(x=><div key={x.label} className="rounded-2xl border bg-white p-5"><p className="text-sm font-semibold text-slate-500">{x.label}</p><p className="mt-2 text-2xl font-black">{failed?"—":x.value}</p></div>)}</div><p className="text-xs text-slate-500">Inventory cost is estimated from current on-hand quantity and current product cost for up to 1,000 tracked products. No profit claim is made; historical cost-at-sale is not stored.</p></div>;
}
