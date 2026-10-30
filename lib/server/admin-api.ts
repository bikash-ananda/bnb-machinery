import "server-only";
import { NextResponse } from "next/server";
import { canAccess, type ModuleId } from "@/lib/admin/access";
import { rateLimited } from "@/lib/server/ai";
import { isAllowedOrigin } from "@/lib/server/auth";
import { getAdminSession, type AdminSession } from "@/lib/server/admin-auth";

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function adminApi(request: Request, module: ModuleId): Promise<{ session: AdminSession } | { error: NextResponse }> {
  if (!isAllowedOrigin(request)) return { error: fail("Request blocked.", 403) };
  if (rateLimited(request, "admin-api", 60)) return { error: fail("Too many requests.", 429) };
  const session = await getAdminSession();
  if (!session || session.mustChange) return { error: fail("Not signed in.", 401) };
  if (!canAccess(session.role, module)) return { error: fail("Not allowed.", 403) };
  return { session };
}