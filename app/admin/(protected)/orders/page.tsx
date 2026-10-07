import OrdersTable, { type AdminOrder } from "@/components/admin/OrdersTable";
import { requireAdmin } from "@/lib/server/admin-auth";
import { safeSelect } from "@/lib/server/admin-api";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  await requireAdmin("orders");
  const rows = await safeSelect<AdminOrder>("orders?select=id,order_no,created_at,status,customer_name,phone,email,address,district,delivery_method,payment_method,note,items,subtotal,unpriced_items&order=created_at.desc&limit=100");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-slate-950">Orders</h1>
      {rows === null ? <p className="rounded-2xl bg-amber-50 p-5 text-sm font-semibold text-amber-900">Orders could not be loaded. Check the database connection.</p> : <OrdersTable initial={rows} />}
    </div>
  );
}