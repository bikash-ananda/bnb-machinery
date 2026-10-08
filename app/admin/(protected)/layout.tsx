import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { navFor, ROLE_LABEL } from "@/lib/admin/access";
import { requireAdmin } from "@/lib/server/admin-auth";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const s = await requireAdmin();
  return (
    <AdminShell user={{ name: s.name, email: s.email, roleLabel: ROLE_LABEL[s.role] }} nav={navFor(s.role)}>
      {children}
    </AdminShell>
  );
}
