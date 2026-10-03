import { redirect } from "next/navigation";
import { LocalizedText } from "@/components/i18n/LanguageProvider";
import { getStaffSession } from "@/lib/server/auth";

export default async function StaffProfilePage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700"><LocalizedText id="profile" /></p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--brand-primary)]">
        {session.role === "OWNER" ? <LocalizedText id="owner" /> : <LocalizedText id="accountName" />}
      </h1>
      <p className="mt-2 break-all text-sm text-[var(--text-muted)]">{session.email}</p>
      <div className="mt-6 rounded-xl bg-[var(--surface)] p-4 text-sm">
        <p className="text-[var(--text-muted)]"><LocalizedText id="productStatus" /></p>
        <p className="mt-1 font-semibold text-[var(--brand-primary)]">
          {session.role === "OWNER" ? <LocalizedText id="owner" /> : <LocalizedText id="inventoryEditor" />}
        </p>
      </div>
      <p className="mt-5 text-sm leading-6 text-[var(--text-muted)]">
        <LocalizedText id="codeExpiry" />
      </p>
    </section>
  );
}
