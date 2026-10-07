import { redirect } from "next/navigation";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import { getAdminSession } from "@/lib/server/admin-auth";

export const metadata = { title: "Change password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");
  return (
    <main className="relative flex min-h-[100svh] items-center justify-center bg-slate-950 px-4 py-10">
      <ChangePasswordForm email={s.email} forced={s.mustChange} />
    </main>
  );
}