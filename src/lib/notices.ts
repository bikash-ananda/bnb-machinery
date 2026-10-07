import { notices, type Notice } from "@/config/notices";

/** Notices of one kind that are enabled and inside their date window. */
export function activeNotices(kind: Notice["kind"], now: number = Date.now(), list: readonly Notice[] = notices): Notice[] {
  return list.filter(
    (n) => n.enabled && n.kind === kind && (!n.startsAt || Date.parse(n.startsAt) <= now) && (!n.endsAt || Date.parse(n.endsAt) >= now),
  );
}