import { notFound } from "next/navigation";
import PrintButton from "@/components/admin/PrintButton";
import { company } from "@/config/site";
import { canAccess } from "@/lib/admin/access";
import { UUID } from "@/lib/server/admin-api";
import { requireAdmin } from "@/lib/server/admin-auth";
import { formatNPR } from "@/src/lib/money";
import { getInvoiceView } from "@/src/modules/sales/queries";

export const metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";
const D = { tax: "\u0915\u0930 \u092c\u0940\u091c\u0915", date: "\u092e\u093f\u0924\u093f", cust: "\u0917\u094d\u0930\u093e\u0939\u0915", total: "\u091c\u092e\u094d\u092e\u093e", thanks: "\u0927\u0928\u094d\u092f\u0935\u093e\u0926" };
const catLabel = (c: string) => (c === "STANDARD" ? "13%" : c === "EXEMPT" ? "Exempt" : "0%");

export default async function InvoicePrint({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fmt?: string }> }) {
  const s = await requireAdmin();
  if (!canAccess(s.role, "pos") && !canAccess(s.role, "billing")) notFound();
  const { id } = await params;
  const { fmt } = await searchParams;
  if (!UUID.test(id)) notFound();
  const v = await getInvoiceView(id);
  if (!v) notFound();
  const { invoice: inv, items } = v;
  const thermal = fmt === "thermal";
  const legal = (company as { legalName?: string }).legalName ?? company.name;
  const pan = process.env.COMPANY_PAN?.trim();
  const paid = v.payments.reduce((a, p) => a + p.amountPaisa, 0n);
  const exempt = items.filter((i) => i.taxCategory !== "STANDARD").reduce((a, i) => a + i.linePaisa, 0n);

  return (
    <div className={`mx-auto bg-white p-4 text-slate-900 ${thermal ? "max-w-[80mm] text-[11px]" : "max-w-[794px] text-sm"}`}>
      <style>{`@page { size: ${thermal ? "80mm auto" : "A4"}; margin: ${thermal ? "3mm" : "12mm"}; } @media print { .no-print, .fixed { display: none !important; } body { background: #fff; } }`}</style>
      <div className="no-print mb-3 flex justify-end gap-2"><PrintButton /></div>
      <header className="border-b border-slate-300 pb-3 text-center">
        <h1 className="text-xl font-black">{company.name}</h1>
        <p className="text-xs">{legal}</p>
        <p className="text-xs">{company.location.address}, {company.location.city} / {company.contact.phone}</p>
        <p className="text-xs font-bold">PAN/VAT: {pan || "__________"}</p>
        <p className="mt-2 text-base font-black">TAX INVOICE / {D.tax}</p>
      </header>
      <section className="my-3 grid gap-1 sm:grid-cols-2">
        <p><b>Invoice no:</b> {inv.invoiceNo}</p>
        <p><b>Date (BS) / {D.date}:</b> {inv.bsDate} <span className="text-xs">({inv.issuedAt.toISOString().slice(0, 10)})</span></p>
        <p><b>{D.cust}:</b> {inv.buyer.name}{inv.buyer.phone ? " / " + inv.buyer.phone : ""}</p>
        <p><b>Buyer PAN:</b> {inv.buyer.panNo || "-"}</p>
      </section>
      <table className="w-full border-collapse">
        <thead><tr className="border-y border-slate-400 text-left"><th className="py-1">#</th><th>Item</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Disc</th><th className="text-right">VAT</th><th className="text-right">Amount</th></tr></thead>
        <tbody>
          {items.map((i, k) => (
            <tr key={i.id} className="border-b border-slate-200 align-top">
              <td className="py-1">{k + 1}</td><td>{i.name}</td><td className="text-right">{i.qty}</td>
              <td className="text-right">{formatNPR(i.unitPaisa, { symbol: false })}</td>
              <td className="text-right">{i.discountPaisa > 0n ? formatNPR(i.discountPaisa, { symbol: false }) : "-"}</td>
              <td className="text-right">{catLabel(i.taxCategory)}</td>
              <td className="text-right">{formatNPR(i.linePaisa, { symbol: false })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="ml-auto mt-3 w-full max-w-xs space-y-0.5">
        <p className="flex justify-between"><span>Taxable value</span><span>{formatNPR(inv.taxablePaisa)}</span></p>
        {exempt > 0n && <p className="flex justify-between"><span>Exempt / zero-rated</span><span>{formatNPR(exempt)}</span></p>}
        {inv.discountPaisa > 0n && <p className="flex justify-between"><span>Discount given</span><span>{formatNPR(inv.discountPaisa)}</span></p>}
        <p className="flex justify-between"><span>VAT 13%</span><span>{formatNPR(inv.vatPaisa)}</span></p>
        <p className="flex justify-between border-t border-slate-400 pt-1 text-base font-black"><span>{D.total} Total</span><span>{formatNPR(inv.totalPaisa)}</span></p>
        <p className="flex justify-between"><span>Paid</span><span>{formatNPR(paid)}</span></p>
        {inv.totalPaisa > paid && <p className="flex justify-between font-bold"><span>Balance due</span><span>{formatNPR(inv.totalPaisa - paid)}</span></p>}
      </section>
      <footer className="mt-6 border-t border-slate-300 pt-2 text-center text-xs"><p>{D.thanks}! Goods once sold are returnable only as per shop policy.</p><p>Computer generated invoice.</p></footer>
    </div>
  );
}
