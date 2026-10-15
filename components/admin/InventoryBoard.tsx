"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { formatNPR } from "@/src/lib/money";
import type { InventoryLocation, InventoryMovement, InventoryRow } from "@/src/modules/inventory/queries";

const qtyFormat = new Intl.NumberFormat("en-NP", { maximumFractionDigits: 3 });
const dateFormat = new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" });
const quantity = (value: number) => qtyFormat.format(value);
const money = (value: string | null) => value === null ? "—" : formatNPR(BigInt(value));

export default function InventoryBoard({ items, locations, movements, canAdjust }: { items: InventoryRow[]; locations: InventoryLocation[]; movements: InventoryMovement[]; canAdjust: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState(items[0]?.id ?? "");
  const [locationId, setLocationId] = useState(locations.find((location) => location.isDefault)?.id ?? locations[0]?.id ?? "");
  const [reason, setReason] = useState<"COUNT" | "OPENING">("COUNT");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    if (!q) return items;
    return items.filter((item) => [item.name, item.sku, item.barcode, item.model].some((value) => value?.toLocaleLowerCase().includes(q)));
  }, [items, search]);
  const selected = items.find((item) => item.id === productId);
  const lowStockCount = items.filter((item) => item.trackStock && item.onHand <= item.reorderLevel).length;
  const totalUnits = items.reduce((sum, item) => sum + item.onHand, 0);
  const totalReserved = items.reduce((sum, item) => sum + item.reserved, 0);
  const locationName = (id: string) => locations.find((location) => location.id === id)?.name ?? "stock location";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess("");
    if (!productId || !locationId) { setError("Create a stock location and add a product before adjusting stock."); return; }
    if (reason === "OPENING" && (!unitCost || Number(unitCost) < 0)) { setError("Opening stock requires a valid unit cost."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, locationId, reason, qty, unitCost: unitCost || undefined, note }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not post the adjustment.");
      setSuccess(`${reason === "OPENING" ? "Opening stock" : "Stock count correction"} posted to ${locationName(locationId)}.`);
      setQty(""); setNote(""); setUnitCost("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not post the adjustment.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Products</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{items.length}</p>
          <p className="mt-1 text-xs text-slate-500">Showing up to 500 catalogue items</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Units on hand</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{quantity(totalUnits)}</p>
          <p className="mt-1 text-xs text-slate-500">Across all stock locations</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Low stock / reserved</p>
          <p className="mt-2 text-2xl font-black text-amber-950">{lowStockCount} <span className="text-base font-bold text-amber-800">/ {quantity(totalReserved)}</span></p>
          <p className="mt-1 text-xs text-amber-800">Products at/below reorder level / units reserved</p>
        </article>
      </section>

      {canAdjust && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-black text-slate-950">Post a stock adjustment</h2>
          <p className="mt-1 text-sm text-slate-600">Each adjustment updates the stock ledger and accounting together. Count corrections are signed differences, such as -2 or +3.5.</p>
        </div>
        {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}
        {success && <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{success}</p>}
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1 text-xs font-bold text-slate-700 xl:col-span-2">Product
            <select value={productId} onChange={(event) => setProductId(event.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium">
              {items.map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-700">Stock location
            <select value={locationId} onChange={(event) => setLocationId(event.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium">
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}{location.isDefault ? " (default)" : ""}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-700">Adjustment type
            <select value={reason} onChange={(event) => setReason(event.target.value as "COUNT" | "OPENING")} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium">
              <option value="COUNT">Stock count difference</option><option value="OPENING">Opening stock</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-700">{reason === "OPENING" ? "Opening quantity" : "Quantity difference"}
            <input type="number" step="0.001" min={reason === "OPENING" ? "0.001" : undefined} value={qty} onChange={(event) => setQty(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium" placeholder={reason === "OPENING" ? "e.g. 12" : "e.g. -2 or 3.5"} />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-700">Unit cost (Rs)
            <input type="number" step="0.01" min="0" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} required={reason === "OPENING"} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium" placeholder={selected?.costPaisa ? (Number(selected.costPaisa) / 100).toFixed(2) : "Required for opening"} />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-700 md:col-span-2 xl:col-span-4">Reason / reference
            <input value={note} onChange={(event) => setNote(event.target.value)} required minLength={3} maxLength={500} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium" placeholder="Physical count sheet, receiving reference, or other reason" />
          </label>
          <div className="flex items-end md:col-span-2 xl:col-span-2">
            <button disabled={busy || !items.length || !locations.length} className="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Posting…" : "Post adjustment"}</button>
          </div>
        </form>
        {reason === "COUNT" && selected && <p className="mt-3 text-xs text-slate-500">All-location total: {quantity(selected.onHand)} {selected.unit}; {quantity(selected.reserved)} reserved. The chosen location is checked before a reduction posts.</p>}
        {!locations.length && <p className="mt-3 text-xs font-semibold text-amber-800">No stock locations exist yet. Run the project seed before posting inventory.</p>}
      </section>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div><h2 className="font-black text-slate-950">Stock on hand</h2><p className="mt-1 text-xs text-slate-500">On hand and reserved quantities are combined across locations.</p></div>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU, barcode or model" aria-label="Search inventory" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-80" />
        </div>
        {items.length === 0 ? <p className="p-8 text-center text-sm text-slate-600">No products are in the catalogue yet.</p> : filtered.length === 0 ? <p className="p-8 text-center text-sm text-slate-600">No inventory matches that search.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                <th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU / model</th><th className="px-4 py-3 text-right">On hand</th><th className="px-4 py-3 text-right">Reserved</th><th className="px-4 py-3 text-right">Available</th><th className="px-4 py-3 text-right">Reorder at</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Price</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const available = item.onHand - item.reserved;
                  const low = item.trackStock && item.onHand <= item.reorderLevel;
                  return <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3"><div className="font-bold text-slate-900">{item.name}</div><div className="mt-0.5 text-xs text-slate-500">{item.barcode ? `Barcode ${item.barcode}` : item.trackStock ? "Stock tracked" : "Stock not tracked"}</div></td>
                    <td className="px-4 py-3"><div className="font-semibold text-slate-700">{item.sku}</div><div className="text-xs text-slate-500">{item.model || "—"}</div></td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{quantity(item.onHand)} <span className="text-xs font-normal text-slate-500">{item.unit}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums">{quantity(item.reserved)}</td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${available < 0 ? "text-red-700" : "text-emerald-800"}`}>{quantity(available)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.reorderLevel}{low && <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-900">Low</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(item.costPaisa)}</td><td className="px-4 py-3 text-right tabular-nums">{money(item.pricePaisa)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4"><h2 className="font-black text-slate-950">Recent stock movements</h2><p className="mt-1 text-xs text-slate-500">Latest 50 ledger entries across locations.</p></div>
        {movements.length === 0 ? <p className="p-6 text-sm text-slate-600">No stock movements have been recorded yet.</p> : <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Movement</th><th className="px-4 py-3 text-right">Quantity</th><th className="px-4 py-3">Note / user</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{movements.map((movement) => <tr key={movement.id}>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{dateFormat.format(new Date(movement.createdAt))}</td>
              <td className="px-4 py-3"><div className="font-bold text-slate-900">{movement.name}</div><div className="text-xs text-slate-500">{movement.sku}</div></td>
              <td className="px-4 py-3 text-slate-700">{movement.location}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{movement.type.replace(/_/g, " ")}</span></td>
              <td className={`px-4 py-3 text-right font-bold tabular-nums ${movement.qty < 0 ? "text-red-700" : "text-emerald-800"}`}>{movement.qty > 0 ? "+" : ""}{quantity(movement.qty)}</td>
              <td className="max-w-[280px] px-4 py-3 text-xs text-slate-600"><div className="truncate" title={movement.note ?? "No note"}>{movement.note || "No note"}</div><div className="mt-0.5 truncate text-slate-400">{movement.createdBy || "System"}</div></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
    </div>
  );
}
