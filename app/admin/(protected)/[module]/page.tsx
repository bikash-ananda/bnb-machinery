import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULES } from "@/lib/admin/access";
import { requireAdmin } from "@/lib/server/admin-auth";

type Props = { params: Promise<{ module: string }> };

export async function generateMetadata({ params }: Props) {
  const { module: id } = await params;
  const m = MODULES.find((x) => x.id === id);
  return { title: m?.label ?? "Admin" };
}

export default async function PlannedModulePage({ params }: Props) {
  const { module: id } = await params;
  const m = MODULES.find((x) => x.id === id);
  if (!m || m.ready) notFound();
  await requireAdmin(m.id);
  return (
    <div className="max-w-2xl space-y-5">
      <p className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">Planned module · not built yet</p>
      <h1 className="text-2xl font-black text-slate-950">{m.label}</h1>
      <p className="text-slate-700">{m.summary}</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold text-slate-500">What this section will cover</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-800">{m.features.map((f) => <li key={f}>{f}</li>)}</ul>
      </div>
      <p className="text-sm text-slate-500">No sample data is shown here on purpose. This section will only show real records once it is built.</p>
      {m.id === "catalog" && <Link href="/staff" className="inline-block rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">Open the staff inventory portal (separate email-code login)</Link>}
    </div>
  );
}