import "server-only";

import { AUTHORIZED_STAFF_EMAIL } from "@/lib/server/auth";

/** Emails the shop when a new order arrives. Never throws: a failed email must not fail the order. */
export async function notifyNewOrder(subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.OTP_FROM_EMAIL?.trim();
  if (!apiKey || !from) return false;
  const to = process.env.ORDER_NOTIFY_EMAIL?.trim() || process.env.OWNER_EMAIL?.trim() || AUTHORIZED_STAFF_EMAIL;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
