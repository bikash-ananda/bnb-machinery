import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { getAdminSession } from "@/lib/server/admin-auth";

export const metadata = { title: "Admin sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const s = await getAdminSession();
  if (s) redirect(s.mustChange ? "/admin/change-password" : "/admin");
  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute bottom-0 right-0 h-80 w-80 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.14),transparent_65%)]" />
      </div>
      <AdminLoginForm />
    </main>
  );
}