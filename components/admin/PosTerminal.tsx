"use client";

import { useRef, useState } from "react";

type Tax = "STANDARD" | "EXEMPT" | "ZERO";
type Prod = { id: string; sku: string; barcode: string | null; name: string; price: string | null; tax: Tax; incl: boolean; track: boolean; available: number | null };
type Line = { id: string; name: string; unit: number; qty: number; discPct: number; tax: Tax; incl: boolean; available: number | null; edited: boolean };
type Done = { invoiceId: string; invoiceNo: string; orderNo: string; totalPaisa: string; changePaisa: string; duePaisa: string };

const rs = (paisa: number | string) => "Rs " + (Number(paisa) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const METHODS: [string, string][] = [["CASH", "Cash"], ["QR", "QR"], ["ESEWA", "eSewa"], ["KHALTI", "Khalti"], ["CARD", "Card"], ["BANK", "Bank"]];

function calc(l: Line) {
  const base = Math.round(l.qty * l.unit);
  const eff = base - Math.round((base * Math.round(l.discPct * 100)) / 10000);
  if (l.tax !== "STANDARD") return { vat: 0, total: eff };
  if (l.incl) return { vat: eff - Math.round((eff * 10000) / 11300), total: eff };
  const vat = Math.round((eff * 1300) / 10000);
  return { vat, total: eff + vat };
}

export default function PosTerminal({ canOverride }: { canOverride: boolean }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Prod[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pan, setPan] = useState("");
  const [method, setMethod] = useState("CASH");
  const [tendered, setTendered] = useState("");
  const [onCredit, setOnCredit] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = lines.reduce((a, l) => a + calc(l).total, 0);
  const vat = lines.reduce((a, l) => a + calc(l).vat, 0);
  const tenderedPaisa = tendered === "" ? null : Math.round(Number(tendered) * 100);
  const change = tenderedPaisa !== null && method === "CASH" && tenderedPaisa > total ? tenderedPaisa - total : 0;

  function add(p: Prod) {
    setErr(""); setFound([]); setQ("");
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === p.id);
      if (i >= 0) return ls.map((l, k) => (k === i ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { id: p.id, name: p.name, unit: p.price ? Number(p.price) : 0, qty: 1, discPct: 0, tax: p.tax, incl: p.incl, available: p.available, edited: p.price === null }];
    });
  }
  async function search(term: string, enter: boolean) {
    if (term.trim().length < 2) { setFound([]); return; }
    try {
      const r = await fetch("/api/admin/pos/products?q=" + encodeURIComponent(term));
      const d = (await r.json()) as { items?: Prod[]; exact?: boolean };
      const items = d.items ?? [];
      if (enter && items.length >= 1 && (d.exact || items.length === 1)) add(items[0]);
      else setFound(items);
    } catch { setErr("Search failed. Check the connection."); }
  }
  function onQ(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void search(v, false), 300);
  }
  async function lookup() {
    if (phone.replace(/\D/g, "").length < 7) return;
    try {
      const r = await fetch("/api/admin/pos/customer?phone=" + encodeURIComponent(phone));
      const d = (await r.json()) as { name?: string; panNo?: string | null };
      if (d.name) { setName(d.name); setPan(d.panNo ?? ""); }
    } catch { /* optional */ }
  }
  const patch = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));

  async function submit() {
    if (busy || lines.length === 0) return;
    setBusy(true); setErr("");
    const payments = onCredit && tendered === "" ? [] : [{ method, amountPaisa: tenderedPaisa === null ? "ALL" : String(tenderedPaisa) }];
    try {
      const r = await fetch("/api/admin/pos/sale", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name, phone, panNo: pan },
          items: lines.map((l) => ({ productId: l.id, qty: l.qty, discountPct: l.discPct, ...(l.edited ? { unitPaisa: String(Math.round(l.unit)) } : {}) })),
          payments, onCredit,
        }),
      });
      const d = (await r.json()) as Done & { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Could not complete the sale.");
      setDone(d);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not complete the sale."); }
    setBusy(false);
  }
  function reset() { setDone(null); setLines([]); setPhone(""); setName(""); setPan(""); setTendered(""); setOnCredit(false); setMethod("CASH"); setErr(""); }

  if (done) {
    const wa = phone.replace(/\D/g, "");
    const num = wa.length === 10 ? "977" + wa : wa;
    const text = encodeURIComponent(`Thank you for shopping at Machinery Tools Nepal. Invoice ${done.invoiceNo}, total ${rs(done.totalPaisa)}.`);
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-emerald-200 bg-white p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Sale complete</p>
        <p className="text-3xl font-black">{rs(done.totalPaisa)}</p>
        <p className="text-sm text-slate-600">{done.invoiceNo} / {done.orderNo}</p>
        {Number(done.changePaisa) > 0 && <p className="text-xl font-black text-amber-600">Give change: {rs(done.changePaisa)}</p>}
        {Number(done.duePaisa) > 0 && <p className="font-bold text-red-600">On credit: {rs(done.duePaisa)}</p>}
        <div className="flex flex-wrap justify-center gap-2">
          <a href={`/print/invoice/${done.invoiceId}`} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Print A4</a>
          <a href={`/print/invoice/${done.invoiceId}?fmt=thermal`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Print 80mm</a>
          {num && <a href={`https://wa.me/${num}?text=${text}`} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">WhatsApp</a>}
        </div>
        <button type="button" onClick={reset} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950">New sale</button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]" onKeyDown={(e) => { if (e.key === "F9") { e.preventDefault(); void submit(); } }}>
      <section className="space-y-3">
        <div className="relative">
          <input autoFocus value={q} onChange={(e) => onQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(q, true); } }}
            placeholder="Scan barcode or type product name / SKU, then Enter" aria-label="Search products"
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-amber-400" />
          {found.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {found.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => add(p)} className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-amber-50">
                    <span><b>{p.name}</b> <span className="text-xs text-slate-500">{p.sku}</span></span>
                    <span className="text-sm font-bold">{p.price ? rs(p.price) : "No price"}{p.available !== null ? ` / ${p.available} in stock` : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {lines.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Scan or search to add items.</p> : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Item</th><th className="p-3">Qty</th><th className="p-3">Price</th><th className="p-3">Disc %</th><th className="p-3 text-right">Amount</th><th /></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="p-3 font-semibold">{l.name}<span className="block text-xs font-normal text-slate-500">{l.tax === "STANDARD" ? "VAT 13%" : l.tax === "EXEMPT" ? "VAT exempt" : "Zero rated"}{l.available !== null && l.qty > l.available ? " / low stock" : ""}</span></td>
                    <td className="p-3"><input type="number" min="0.001" step="any" value={l.qty} onChange={(e) => patch(i, { qty: Number(e.target.value) })} aria-label="Quantity" className="w-20 rounded-lg border border-slate-300 px-2 py-1" /></td>
                    <td className="p-3">{canOverride ? <input type="number" min="0" step="any" value={l.unit / 100} onChange={(e) => patch(i, { unit: Math.round(Number(e.target.value) * 100), edited: true })} aria-label="Price" className="w-28 rounded-lg border border-slate-300 px-2 py-1" /> : l.unit ? rs(l.unit) : "No price"}</td>
                    <td className="p-3"><input type="number" min="0" max={canOverride ? 100 : 5} step="any" value={l.discPct} onChange={(e) => patch(i, { discPct: Number(e.target.value) })} aria-label="Discount percent" className="w-16 rounded-lg border border-slate-300 px-2 py-1" /></td>
                    <td className="p-3 text-right font-bold">{rs(calc(l).total)}</td>
                    <td className="p-3"><button type="button" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} aria-label="Remove" className="font-bold text-red-600">x</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => void lookup()} placeholder="Customer phone (optional)" inputMode="tel" className="rounded-lg border border-slate-300 px-3 py-2" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" className="rounded-lg border border-slate-300 px-3 py-2" />
          <input value={pan} onChange={(e) => setPan(e.target.value)} placeholder="Customer PAN (for VAT bill)" className="rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          <p className="flex justify-between text-slate-600"><span>VAT included</span><span>{rs(vat)}</span></p>
          <p className="flex justify-between text-2xl font-black"><span>Total</span><span>{rs(total)}</span></p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {METHODS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setMethod(k)} aria-pressed={method === k}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${method === k ? "bg-slate-900 text-white" : "border border-slate-300"}`}>{label}</button>
          ))}
        </div>
        <input value={tendered} onChange={(e) => setTendered(e.target.value)} type="number" min="0" step="any" placeholder={`Amount received (blank = exactly ${rs(total)})`} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        {change > 0 && <p className="text-lg font-black text-amber-600">Change: {rs(change)}</p>}
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={onCredit} onChange={(e) => setOnCredit(e.target.checked)} /> Remaining on credit (needs customer phone)</label>
        {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
        <button type="button" disabled={busy || lines.length === 0} onClick={() => void submit()} className="w-full rounded-xl bg-amber-400 px-4 py-4 text-lg font-black text-slate-950 disabled:opacity-50">
          {busy ? "Saving..." : "Complete sale (F9)"}
        </button>
        <p className="text-xs text-slate-500">One click updates stock, creates the VAT invoice, posts the accounts and records the payment.</p>
      </aside>
    </div>
  );
}
