"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string; sku: string; barcode: string | null; slug: string; nameEn: string; nameNe: string | null;
  model: string | null; unit: string; categoryId: string | null; category: string | null; brandId: string | null; brand: string | null;
  price: string; mrp: string; cost: string; reorderLevel: number; trackStock: boolean; isPublished: boolean;
  isFeatured: boolean; vatApplicable: boolean; taxCategory: string; images: string[];
};
type FormFields = {
  sku: string; barcode: string; nameEn: string; nameNe: string; descriptionEn: string; descriptionNe: string;
  category: string; brand: string; model: string; unit: string; price: string; mrp: string; cost: string;
  priceIncludesVat: boolean; vatApplicable: boolean; taxCategory: string; hsCode: string;
  reorderLevel: string; trackStock: boolean; isFeatured: boolean; specs: string; images: string;
};
const blank: FormFields = {
  sku: "", barcode: "", nameEn: "", nameNe: "", descriptionEn: "", descriptionNe: "", category: "", brand: "",
  model: "", unit: "pcs", price: "", mrp: "", cost: "", priceIncludesVat: true, vatApplicable: true,
  taxCategory: "STANDARD", hsCode: "", reorderLevel: "0", trackStock: false, isFeatured: false, specs: "", images: "",
};
const money = (value: string) => value.trim() ? value.trim() : null;
const moneyText = (value: string) => value ? "Rs " + Number(value).toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Price on request";

export default function CatalogManager() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categories, setCategories] = useState<{id:string;name:string}[]>([]);
  const [brands, setBrands] = useState<{id:string;name:string}[]>([]);
  const [fields, setFields] = useState<FormFields>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25", status });
      if (q.trim()) params.set("q", q.trim());
      if (categoryId) params.set("categoryId", categoryId);
      if (brandId) params.set("brandId", brandId);
      const response = await fetch("/api/admin/catalog?" + params.toString(), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load catalogue.");
      setItems(data.items); setTotal(data.total); setCategories(data.categories); setBrands(data.brands);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load catalogue."); }
    finally { setLoading(false); }
  }, [page, q, status, categoryId, brandId]);

  useEffect(() => { void load(); }, [load]);

  const filteredHint = useMemo(() => total ? `Showing ${(page - 1) * 25 + 1}–${Math.min(page * 25, total)} of ${total}` : "No products found", [page, total]);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function startEdit(id: string) {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/catalog/" + encodeURIComponent(id), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open product.");
      const p = data.product;
      setFields({
        sku:p.sku, barcode:p.barcode ?? "", nameEn:p.nameEn, nameNe:p.nameNe ?? "",
        descriptionEn:p.descriptionEn ?? "", descriptionNe:p.descriptionNe ?? "", category:p.category ?? "", brand:p.brand ?? "",
        model:p.model ?? "", unit:p.unit, price:p.price, mrp:p.mrp, cost:p.cost,
        priceIncludesVat:p.priceIncludesVat, vatApplicable:p.vatApplicable, taxCategory:p.taxCategory,
        hsCode:p.hsCode ?? "", reorderLevel:String(p.reorderLevel), trackStock:p.trackStock, isFeatured:p.isFeatured,
        specs:(p.specs ?? []).map((s:{name:string;value:string})=>s.name + ": " + s.value).join("\n"),
        images:p.images.join("\n"),
      });
      setEditing(id); setOpenForm(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open product."); }
  }

  function startNew() { setFields(blank); setEditing(null); setOpenForm(true); setError(""); setNotice(""); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const specs = fields.specs.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
        const i = line.indexOf(":");
        if (i < 1 || i === line.length - 1) throw new Error("Specifications must use one “name: value” pair per line.");
        return { name: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
      });
      const payload = {
        sku: fields.sku, barcode: fields.barcode || null, nameEn: fields.nameEn, nameNe: fields.nameNe || null,
        descriptionEn: fields.descriptionEn || null, descriptionNe: fields.descriptionNe || null,
        category: fields.category || null, brand: fields.brand || null, model: fields.model || null, unit: fields.unit,
        price: money(fields.price), mrp: money(fields.mrp), cost: money(fields.cost),
        priceIncludesVat: fields.priceIncludesVat, vatApplicable: fields.vatApplicable, taxCategory: fields.taxCategory,
        hsCode: fields.hsCode || null, reorderLevel: fields.reorderLevel, trackStock: fields.trackStock,
        isFeatured: fields.isFeatured, specs,
        images: fields.images.split("\n").map((x) => x.trim()).filter(Boolean),
      };
      const response = await fetch(editing ? "/api/admin/catalog/" + encodeURIComponent(editing) : "/api/admin/catalog", {
        method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Product could not be saved.");
      setNotice(editing ? "Product details saved." : "Product created as a draft.");
      setOpenForm(false); setEditing(null); setPage(1); await load(); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Product could not be saved."); }
    finally { setBusy(false); }
  }

  async function togglePublished(product: Product) {
    const action = product.isPublished ? "unpublish" : "publish";
    if (!window.confirm(`${action === "publish" ? "Publish" : "Unpublish"} “${product.nameEn}”? ${action === "publish" ? "It may appear on the public website." : "It will be hidden from the public catalogue."}`)) return;
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/catalog/" + encodeURIComponent(product.id), {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Publication status could not be changed.");
      setNotice(action === "publish" ? "Product published." : "Product unpublished."); await load(); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Publication status could not be changed."); }
  }

  const inputClass = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900";
  const labelClass = "block text-xs font-bold text-slate-700";
  const checkClass = "flex items-center gap-2 text-sm font-semibold text-slate-700";

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-black text-slate-950">Products & catalogue</h1><p className="mt-1 text-sm text-slate-600">Manage product details, pricing, categories, brands and website visibility.</p></div>
      <button onClick={startNew} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">+ Add product</button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p>}

    {openForm && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">{editing ? "Edit product" : "Create product"}</h2><p className="mt-1 text-xs text-slate-500">New products remain unpublished until you explicitly publish them. Stock quantity is managed in Inventory.</p></div><button type="button" onClick={()=>setOpenForm(false)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Close</button></div>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className={labelClass}>SKU *<input required maxLength={80} value={fields.sku} onChange={e=>update("sku",e.target.value)} className={inputClass} placeholder="e.g. PUMP-001" /></label>
          <label className={labelClass}>Barcode<input maxLength={80} value={fields.barcode} onChange={e=>update("barcode",e.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Model / part model<input maxLength={120} value={fields.model} onChange={e=>update("model",e.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Product name (English) *<input required maxLength={160} value={fields.nameEn} onChange={e=>update("nameEn",e.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Product name (Nepali)<input maxLength={160} value={fields.nameNe} onChange={e=>update("nameNe",e.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Unit *<input required maxLength={24} value={fields.unit} onChange={e=>update("unit",e.target.value)} className={inputClass} placeholder="pcs, kg, litre" /></label>
          <label className={labelClass}>Category<input list="catalog-categories" maxLength={100} value={fields.category} onChange={e=>update("category",e.target.value)} className={inputClass} placeholder="Type or choose a category" /><datalist id="catalog-categories">{categories.map(c=><option key={c.id} value={c.name}/>)}</datalist></label>
          <label className={labelClass}>Brand<input list="catalog-brands" maxLength={100} value={fields.brand} onChange={e=>update("brand",e.target.value)} className={inputClass} placeholder="Type or choose a brand" /><datalist id="catalog-brands">{brands.map(b=><option key={b.id} value={b.name}/>)}</datalist></label>
          <label className={labelClass}>HS code<input maxLength={24} value={fields.hsCode} onChange={e=>update("hsCode",e.target.value)} className={inputClass} /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Description (English)<textarea rows={4} maxLength={5000} value={fields.descriptionEn} onChange={e=>update("descriptionEn",e.target.value)} className={inputClass}/></label><label className={labelClass}>Description (Nepali)<textarea rows={4} maxLength={5000} value={fields.descriptionNe} onChange={e=>update("descriptionNe",e.target.value)} className={inputClass}/></label></div>
        <div><h3 className="mb-3 font-black">Pricing & tax</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>Selling price (Rs)<input type="number" min="0" step="0.01" value={fields.price} onChange={e=>update("price",e.target.value)} className={inputClass} placeholder="Leave blank for quote" /></label>
          <label className={labelClass}>MRP (Rs)<input type="number" min="0" step="0.01" value={fields.mrp} onChange={e=>update("mrp",e.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Unit cost (Rs)<input type="number" min="0" step="0.01" value={fields.cost} onChange={e=>update("cost",e.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Tax category<select value={fields.taxCategory} onChange={e=>update("taxCategory",e.target.value)} className={inputClass}><option value="STANDARD">Standard</option><option value="ZERO_RATED">Zero rated</option><option value="EXEMPT">Exempt</option></select></label>
        </div><div className="mt-3 flex flex-wrap gap-5"><label className={checkClass}><input type="checkbox" checked={fields.priceIncludesVat} onChange={e=>update("priceIncludesVat",e.target.checked)}/>Price includes VAT</label><label className={checkClass}><input type="checkbox" checked={fields.vatApplicable} onChange={e=>update("vatApplicable",e.target.checked)}/>VAT applicable</label><label className={checkClass}><input type="checkbox" checked={fields.isFeatured} onChange={e=>update("isFeatured",e.target.checked)}/>Featured product</label></div></div>
        <div><h3 className="mb-3 font-black">Stock settings</h3><div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Reorder level (whole units)<input type="number" min="0" max="1000000000" step="1" value={fields.reorderLevel} onChange={e=>update("reorderLevel",e.target.value)} className={inputClass}/></label><label className={checkClass+" mt-5"}><input type="checkbox" checked={fields.trackStock} onChange={e=>update("trackStock",e.target.checked)}/>Track stock for sales</label></div><p className="mt-2 text-xs text-slate-500">Do not enter opening quantities here. Use Inventory to post a ledger-backed opening balance or stock count.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Specifications (one “name: value” per line)<textarea rows={5} value={fields.specs} onChange={e=>update("specs",e.target.value)} className={inputClass} placeholder={"Power: 2 HP\nVoltage: 220 V"}/></label><label className={labelClass}>Product images (HTTPS URL, one per line; max 8)<textarea rows={5} value={fields.images} onChange={e=>update("images",e.target.value)} className={inputClass} placeholder="https://example.com/product.jpg"/></label></div>
        <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : editing ? "Save changes" : "Create draft"}</button><button type="button" onClick={()=>setOpenForm(false)} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold">Cancel</button></div>
      </form>
    </section>}

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-4">
        <label className={labelClass}>Search<input type="search" value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} className={inputClass} placeholder="Name, SKU, barcode, model"/></label>
        <label className={labelClass}>Publication<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}} className={inputClass}><option value="all">All products</option><option value="published">Published</option><option value="draft">Draft / unpublished</option></select></label>
        <label className={labelClass}>Category<select value={categoryId} onChange={e=>{setCategoryId(e.target.value);setPage(1)}} className={inputClass}><option value="">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className={labelClass}>Brand<select value={brandId} onChange={e=>{setBrandId(e.target.value);setPage(1)}} className={inputClass}><option value="">All brands</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{filteredHint}</span><button onClick={()=>void load()} className="font-bold text-slate-800 underline">Refresh</button></div>
      {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading catalogue…</p> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No products match. Add a product to start your catalogue.</p> :
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Category / brand</th><th className="p-3 text-right">Selling price</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(p=><tr key={p.id} className="hover:bg-slate-50"><td className="p-3"><div className="font-bold">{p.nameEn}</div><div className="text-xs text-slate-500">{p.model ?? "No model"} · {p.unit}</div></td><td className="p-3 font-semibold">{p.sku}<div className="text-xs text-slate-500">{p.barcode ?? ""}</div></td><td className="p-3">{p.category ?? "—"}<div className="text-xs text-slate-500">{p.brand ?? "—"}</div></td><td className="p-3 text-right font-bold">{moneyText(p.price)}</td><td className="p-3"><span className={p.isPublished?"rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800":"rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"}>{p.isPublished?"Published":"Draft"}</span></td><td className="p-3"><div className="flex gap-2"><button onClick={()=>void startEdit(p.id)} className="rounded-md border px-2.5 py-1.5 text-xs font-bold">Edit</button><button onClick={()=>void togglePublished(p)} className="rounded-md border px-2.5 py-1.5 text-xs font-bold">{p.isPublished?"Unpublish":"Publish"}</button></div></td></tr>)}</tbody></table></div>}
      <div className="mt-4 flex justify-end gap-2"><button disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40">Previous</button><span className="px-2 py-2 text-sm">Page {page} / {Math.max(1,Math.ceil(total/25))}</span><button disabled={page*25>=total||loading} onClick={()=>setPage(p=>p+1)} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40">Next</button></div>
    </section>
  </div>;
}
