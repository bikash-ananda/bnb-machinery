import Link from "next/link";
import { canAccess, ROLE_LABEL, type ModuleId } from "@/lib/admin/access";
import { requireAdmin } from "@/lib/server/admin-auth";
import { safeSelect } from "@/lib/server/admin-api";
import { getShopProducts } from "@/lib/server/catalog";

export const metadata = { title: "Dashboard" };

type OrderRow = { id: string; order_no: string; created_at: string; customer_name: string; status: string; subtotal: number };

export default async function AdminDashboard() {
  const s = await requireAdmin();
  const has = (m: ModuleId) => canAccess(s.role, m);
  const [newOrders, orders, pending, users, recent, products] = await Promise.all([
    has("orders") ? safeSelect<{ id: string }>("orders?select=id&status=eq.NEW&limit=1000") : null,
    has("orders") ? safeSelect<{ id: string }>("orders?select=id&limit=1000") : null,
    has("reviews") ? safeSelect<{ id: string }>("product_reviews?select=id&status=eq.PENDING&limit=1000") : null,
    has("users") ? safeSelect<{ id: string }>("admin_users?select=id&limit=1000") : null,
    has("orders") ? safeSelect<OrderRow>("orders?select=id,order_no,created_at,customer_name,status,subtotal&order=created_at.desc&limit=5") : null,
    getShopProducts().catch(() => null),
  ]);

  const cards: { label: string; value: number | null | undefined; href?: string; show: boolean }[] = [
    { label: "New orders", value: newOrders?.length, href: "/admin/orders", show: has("orders") },
    { label: "All orders", value: orders?.length, href: "/admin/orders", show: has("orders") },
    { label: "Reviews to approve", value: pending?.length, href: "/admin/reviews", show: has("reviews") },
    { label: "Products on the website", value: products?.length, show: true },
    { label: "Admin users", value: users?.length, href: "/admin/users", show: has("users") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Welcome, {s.name}</h1>
        <p className="text-sm text-slate-600">{ROLE_LABEL[s.role]} · figures below come from your live data. A dash means the data source is not available yet.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.filter((c) => c.show).map((c) => {
          const body = (<><p className="text-sm font-semibold text-slate-500">{c.label}</p><p className="mt-2 text-3xl font-black text-slate-950">{c.value ?? "—"}</p></>);
          return c.href
            ? <Link key={c.label} href={c.href} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-amber-400 hover:shadow-md">{body}</Link>
            : <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">{body}</div>;
        })}
      </div>
      {has("orders") && (
        <section>
          <h2 className="mb-3 text-lg font-black">Recent orders</h2>
          {recent && recent.length > 0 ? (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {recent.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <span><b>{o.order_no}</b> · {o.customer_name}</span>
                  <span className="text-slate-600">{o.status} · Rs {Number(o.subtotal).toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No orders yet.</p>}
        </section>
      )}
    </div>
  );
}