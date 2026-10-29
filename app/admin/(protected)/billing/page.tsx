import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { invoices, payments } from "@/src/modules/sales/schema";
import { formatNPR } from "@/src/lib/money";

export const metadata = { title: "Billing & accounts" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  await requireAdmin("billing");
  let invoiceRows: {id:string;invoiceNo:string;fiscalYear:string;buyer:{name:string;phone?:string};issuedAt:Date;bsDate:string;totalPaisa:bigint;vatPaisa:bigint;status:string}[] = [];
  let paymentRows: {id:string;method:string;amountPaisa:bigint;reference:string|null;receivedAt:Date;createdBy:string|null}[] = [];
  let failed = false;
  try {
    [invoiceRows, paymentRows] = await Promise.all([
      db.select({id:invoices.id,invoiceNo:invoices.invoiceNo,fiscalYear:invoices.fiscalYear,buyer:invoices.buyer,issuedAt:invoices.issuedAt,bsDate:invoices.bsDate,totalPaisa:invoices.totalPaisa,vatPaisa:invoices.vatPaisa,status:invoices.status}).from(invoices).orderBy(desc(invoices.issuedAt)).limit(100),
      db.select({id:payments.id,method:payments.method,amountPaisa:payments.amountPaisa,reference:payments.reference,receivedAt:payments.receivedAt,createdBy:payments.createdBy}).from(payments).orderBy(desc(payments.receivedAt)).limit(50),
    ]);
  } catch { failed = true; }
  const total = invoiceRows.reduce((n,r)=>n+r.totalPaisa,0n);
  const vat = invoiceRows.reduce((n,r)=>n+r.vatPaisa,0n);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-black text-slate-950">Billing & accounts</h1><p className="mt-1 text-sm text-slate-600">Issued tax invoices and received payments from the ERP ledger.</p></div>
    {failed&&<p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Billing data could not be loaded. Verify the sales and accounting migrations.</p>}
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Invoices listed</p><p className="mt-2 text-2xl font-black">{invoiceRows.length}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Invoice value (listed)</p><p className="mt-2 text-xl font-black">{formatNPR(total)}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">VAT (listed)</p><p className="mt-2 text-xl font-black">{formatNPR(vat)}</p></div></div>
    <section><h2 className="mb-3 text-lg font-black">Recent issued invoices</h2><div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[800px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Invoice</th><th className="p-3">Buyer</th><th className="p-3">AD date</th><th className="p-3">BS date</th><th className="p-3">Fiscal year</th><th className="p-3">VAT</th><th className="p-3">Total</th></tr></thead><tbody className="divide-y">{invoiceRows.map(i=><tr key={i.id}><td className="p-3 font-bold">{i.invoiceNo}</td><td className="p-3">{i.buyer.name}</td><td className="p-3 whitespace-nowrap">{new Date(i.issuedAt).toLocaleDateString()}</td><td className="p-3">{i.bsDate}</td><td className="p-3">{i.fiscalYear}</td><td className="p-3">{formatNPR(i.vatPaisa)}</td><td className="p-3">{formatNPR(i.totalPaisa)}</td></tr>)}</tbody></table>{!failed&&!invoiceRows.length&&<p className="p-6 text-sm text-slate-600">No invoices issued yet.</p>}</div></section>
    <section><h2 className="mb-3 text-lg font-black">Recent payments</h2><div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[600px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Received</th><th className="p-3">Method</th><th className="p-3">Reference</th><th className="p-3">Amount</th></tr></thead><tbody className="divide-y">{paymentRows.map(p=><tr key={p.id}><td className="p-3">{new Date(p.receivedAt).toLocaleString()}</td><td className="p-3">{p.method}</td><td className="p-3">{p.reference||"—"}</td><td className="p-3">{formatNPR(p.amountPaisa)}</td></tr>)}</tbody></table>{!failed&&!paymentRows.length&&<p className="p-6 text-sm text-slate-600">No payments recorded yet.</p>}</div></section>
    <p className="text-xs text-slate-500">Issued invoices are immutable. Refunds and credit-note workflows are not exposed here.</p>
  </div>;
}
