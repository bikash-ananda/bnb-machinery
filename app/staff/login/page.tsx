import { redirect } from "next/navigation";
import StaffLoginForm from "@/components/staff/StaffLoginForm";
import { getStaffSession } from "@/lib/server/auth";

export const metadata = {
  title: "Staff sign in | B & B Machinery",
  robots: { index: false, follow: false },
};

export default async function StaffLoginPage() {
  const session = await getStaffSession().catch(() => null);
  if (session) redirect(session.role === "OWNER" ? "/staff/review" : "/staff");

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -left-12 top-32 h-48 w-48 rounded-full border border-amber-400/20" />
        <div className="absolute bottom-0 right-0 h-80 w-80 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12),transparent_65%)]" />
      </div>
      <StaffLoginForm />
    </main>
  );
}
