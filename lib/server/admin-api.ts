import "server-only";
import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { canAccess, type ModuleId } from "@/lib/admin/access";
import { rateLimited } from "@/lib/server/ai";
import { isAllowedOrigin } from "@/lib/server/auth";
import { getAdminSession, type AdminSession } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { localAdminAuditEvents, localAdminUsers } from "@/src/modules/local-workflow/schema";
import { orders } from "@/src/modules/sales/schema";
import { productReviews } from "@/src/modules/catalog/extras-schema";

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

/** Small, allow-listed read adapter for the existing server-rendered admin pages. */
export async function safeSelect<T>(resource: string): Promise<T[] | null> {
  try {
    const [table, query = ""] = resource.split("?", 2);
    const params = new URLSearchParams(query);
    const limit = Math.min(Math.max(Number(params.get("limit") || 100), 1), 1000);
    if (table === "orders") {
      const status = params.get("status");
      const rows = await db.select().from(orders)
        .where(status?.startsWith("eq.") ? eq(orders.status, status.slice(3)) : undefined)
        .orderBy(params.get("order")?.includes("asc") ? asc(orders.createdAt) : desc(orders.createdAt)).limit(limit);
      return rows.map(row => ({
        id: row.id, order_no: row.orderNo, created_at: row.createdAt.toISOString(),
        customer_name: row.customerName, status: row.status,
        subtotal: Number(row.subtotalPaisa) / 100,
      })) as T[];
    }
    if (table === "admin_users") {
      const rows = await db.select().from(localAdminUsers).orderBy(asc(localAdminUsers.createdAt)).limit(limit);
      return rows.map(row => ({
        id: row.id, email: row.email, name: row.name, role: row.role, active: row.active,
        must_change_password: row.mustChangePassword, last_login_at: row.lastLoginAt?.toISOString() ?? null,
      })) as T[];
    }
    if (table === "product_reviews") {
      const status = params.get("status");
      const rows = await db.select().from(productReviews)
        .where(status?.startsWith("eq.") ? eq(productReviews.status, status.slice(3)) : undefined)
        .orderBy(params.get("order")?.includes("desc") ? desc(productReviews.createdAt) : asc(productReviews.createdAt)).limit(limit);
      return rows.map(row => ({
        id: row.id, product_slug: row.productSlug, name: row.name, rating: row.rating,
        comment: row.comment, created_at: row.createdAt.toISOString(),
      })) as T[];
    }
    if (table === "admin_audit_events") {
      const rows = await db.select().from(localAdminAuditEvents).orderBy(desc(localAdminAuditEvents.createdAt)).limit(limit);
      return rows.map(row => {
        const details = row.details as Record<string, unknown>;
        return {
          id: row.id, at: row.createdAt.toISOString(), actor_email: row.actorEmail,
          actor_role: typeof details.actorRole === "string" ? details.actorRole : null,
          action: row.action, entity: row.targetType, entity_id: row.targetId,
          detail: details.detail ?? details, ip: typeof details.ip === "string" ? details.ip : null,
        };
      }) as T[];
    }
    return null;
  } catch { return null; }
}