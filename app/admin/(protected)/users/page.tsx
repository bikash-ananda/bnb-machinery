import UsersManager, { type AdminUserRow } from "@/components/admin/UsersManager";
import { requireAdmin } from "@/lib/server/admin-auth";
import { safeSelect } from "@/lib/server/admin-api";

export const metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const s = await requireAdmin("users");
  const rows = await safeSelect<AdminUserRow>("admin_users?select=id,email,name,role,active,must_change_password,last_login_at&order=created_at.asc&limit=200");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-slate-950">Users & roles</h1>
      {rows === null ? <p className="rounded-2xl bg-amber-50 p-5 text-sm font-semibold text-amber-900">Users could not be loaded.</p> : <UsersManager initial={rows} selfId={s.userId} />}
    </div>
  );
}