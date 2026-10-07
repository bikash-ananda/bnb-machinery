import { describe, expect, it } from "vitest";
import type { Notice } from "@/config/notices";
import { activeNotices } from "@/src/lib/notices";

const base = { title: { en: "t", ne: "ट" }, text: { en: "x", ne: "क" } };
const list: Notice[] = [
  { id: "a", kind: "notice", enabled: true, ...base },
  { id: "b", kind: "notice", enabled: false, ...base },
  { id: "c", kind: "offer", enabled: true, ...base },
  { id: "d", kind: "offer", enabled: true, startsAt: "2026-12-01T00:00:00Z", ...base },
  { id: "e", kind: "offer", enabled: true, endsAt: "2026-01-01T00:00:00Z", ...base },
];
const now = Date.parse("2026-10-07T00:00:00Z");

describe("activeNotices", () => {
  it("returns only enabled notices of the requested kind", () => {
    expect(activeNotices("notice", now, list).map((n) => n.id)).toEqual(["a"]);
  });
  it("respects start and end dates", () => {
    expect(activeNotices("offer", now, list).map((n) => n.id)).toEqual(["c"]);
    expect(activeNotices("offer", Date.parse("2026-12-02T00:00:00Z"), list).map((n) => n.id)).toEqual(["c", "d"]);
  });
});