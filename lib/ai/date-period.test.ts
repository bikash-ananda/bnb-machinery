import { describe, expect, it } from "vitest";
import { dateWindowsForQuestion } from "@/lib/ai/date-period";

const fixedNow = new Date("2026-10-27T00:00:00.000Z");

describe("Nepal-local AI report windows", () => {
  it("uses Kathmandu midnight for daily sales", () => {
    expect(dateWindowsForQuestion("today's sales", fixedNow)).toEqual([{
      start: "2026-10-26T18:15:00.000Z", end: "2026-10-27T18:15:00.000Z",
      startDay: "2026-10-27", endDay: "2026-10-28", label: "2026-10-27 (Nepal time)",
    }]);
  });

  it("compares month to date against the same elapsed days of the prior month", () => {
    const [current, previous] = dateWindowsForQuestion("Compare this month's sales with last month", fixedNow);
    expect([current.startDay, current.endDay]).toEqual(["2026-10-01", "2026-10-28"]);
    expect([previous.startDay, previous.endDay]).toEqual(["2026-09-01", "2026-09-28"]);
  });

  it("keeps a prior-month request on the full previous calendar month", () => {
    const [previous] = dateWindowsForQuestion("sales last month", fixedNow);
    expect([previous.startDay, previous.endDay]).toEqual(["2026-09-01", "2026-10-01"]);
  });
});