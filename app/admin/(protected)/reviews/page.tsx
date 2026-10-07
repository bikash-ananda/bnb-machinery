import ReviewsModeration, { type PendingReview } from "@/components/admin/ReviewsModeration";
import { requireAdmin } from "@/lib/server/admin-auth";
import { safeSelect } from "@/lib/server/admin-api";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  await requireAdmin("reviews");
  const rows = await safeSelect<PendingReview>("product_reviews?select=id,product_slug,name,rating,comment,created_at&status=eq.PENDING&order=created_at.asc&limit=100");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-slate-950">Reviews waiting for approval</h1>
      {rows === null ? <p className="rounded-2xl bg-amber-50 p-5 text-sm font-semibold text-amber-900">Reviews could not be loaded. Has the reviews migration been run?</p> : <ReviewsModeration initial={rows} />}
    </div>
  );
}