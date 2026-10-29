import CatalogManager from "@/components/admin/CatalogManager";
import { requireAdmin } from "@/lib/server/admin-auth";

export const metadata = { title: "Products & catalogue" };
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  await requireAdmin("catalog");
  return <CatalogManager />;
}
