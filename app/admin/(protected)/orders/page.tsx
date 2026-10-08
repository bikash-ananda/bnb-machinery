import OrdersBoard from "@/components/admin/OrdersBoard";
import { requireAdmin } from "@/lib/server/admin-auth";
import { listOrders, type BoardOrder } from "@/src/modules/sales/queries";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requireAdmin("orders");
  let rows: BoardOrder[] | null = null;
  try { rows = await listOrders(); } catch (e) { console.error("orders load failed", e); }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-slate-950">Orders</h1>
      {rows === null
        ? <p className="rounded-2xl bg-amber-50 p-5 text-sm font-semibold text-amber-900">Orders could not be loaded. Check that the database is running.</p>
        : <OrdersBoard initial={rows} />}
    </div>
  );
}
