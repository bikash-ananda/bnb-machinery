import PosTerminal from "@/components/admin/PosTerminal";
import { requireAdmin } from "@/lib/server/admin-auth";

export const metadata = { title: "Point of sale" };
const MANAGERS = ["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "SALES_MANAGER"];

export default async function PosPage() {
  const s = await requireAdmin("pos");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-slate-950">Point of sale</h1>
      <PosTerminal canOverride={MANAGERS.includes(s.role)} />
    </div>
  );
}
