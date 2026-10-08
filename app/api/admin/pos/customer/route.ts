import { eq } from "drizzle-orm";
import { canAccess } from "@/lib/admin/access";
import { getAdminSession } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { jsonSafe } from "@/src/lib/json";
import { customers } from "@/src/modules/customers/schema";

export const runtime = "nodejs";

/** Type a phone number once: name and PAN fill in for every later sale. */
export async function GET(request: Request) {
  const s = await getAdminSession();
  if (!s || s.mustChange || !canAccess(s.role, "pos")) return jsonSafe({ error: "Not allowed." }, 401);
  const phone = (new URL(request.url).searchParams.get("phone") ?? "").replace(/[^\d+]/g, "");
  if (phone.length < 7) return jsonSafe({});
  const [c] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return jsonSafe(c ? { name: c.name, panNo: c.panNo, creditLimitPaisa: c.creditLimitPaisa } : {});
}
