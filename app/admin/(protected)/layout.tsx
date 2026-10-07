import AdminShell from "@/components/admin/AdminShell";
import { navFor, ROLE_LABEL } from "@/lib/admin/access";
import { requireAdmin } from "@/lib/server/admin-auth";

export const metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireAdmin();
  return (
    <AdminShell user={{ name: s.name, email: s.email, roleLabel: ROLE_LABEL[s.role] }} nav={navFor(s.role)}>
      {children}
    </AdminShell>
  );
}