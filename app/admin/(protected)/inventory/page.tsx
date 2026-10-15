import InventoryBoard from "@/components/admin/InventoryBoard";
import { requireAdmin } from "@/lib/server/admin-auth";
import { listInventory, type InventoryRow, type InventoryLocation, type InventoryMovement } from "@/src/modules/inventory/queries";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

const ADJUSTERS = new Set(["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "INVENTORY_MANAGER"]);

export default async function InventoryPage() {
  const session = await requireAdmin("inventory");
  let data: { items: InventoryRow[]; locations: InventoryLocation[]; movements: InventoryMovement[] } | null = null;
  try { data = await listInventory(); } catch (error) { console.error("inventory load failed", error); }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Inventory</h1>
        <p className="mt-1 text-sm text-slate-600">Stock, reservations and ledger-backed adjustments across your stock locations.</p>
      </div>
      {data === null
        ? <p className="rounded-2xl bg-amber-50 p-5 text-sm font-semibold text-amber-900">Inventory could not be loaded. Check that the database is running and migrated.</p>
        : <InventoryBoard items={data.items} locations={data.locations} movements={data.movements} canAdjust={ADJUSTERS.has(session.role)} />}
    </div>
  );
}
