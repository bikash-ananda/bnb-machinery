import { describe, expect, it } from "vitest";
import { adToBs, bsToAd, fiscalYearOfAd, fiscalYearOfBs, formatBs, nepalToday, toIso, toNepaliDigits } from "@/src/lib/dates-bs";

describe("BS dates", () => {
  it("converts known dates (Shrawan 1, 2083 = 17 July 2026; Baisakh 1, 2080 = 14 April 2023)", () => {
    expect(adToBs({ year: 2026, month: 7, day: 17 })).toEqual({ year: 2083, month: 4, day: 1 });
    expect(bsToAd({ year: 2083, month: 4, day: 1 })).toEqual({ year: 2026, month: 7, day: 17 });
    expect(adToBs({ year: 2023, month: 4, day: 14 })).toEqual({ year: 2080, month: 1, day: 1 });
  });

  it("round-trips every day of two years", () => {
    let t = Date.UTC(2025, 0, 1);
    for (let i = 0; i < 731; i++, t += 86400000) {
      const d = new Date(t);
      const ad = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
      expect(bsToAd(adToBs(ad))).toEqual(ad);
    }
  });

  it("fiscal year runs Shrawan 1 to Ashadh end and rolls over on 17 July 2026", () => {
    expect(fiscalYearOfAd({ year: 2026, month: 7, day: 16 }).label).toBe("2082/83");
    expect(fiscalYearOfAd({ year: 2026, month: 7, day: 17 }).label).toBe("2083/84");
    expect(fiscalYearOfBs({ year: 2083, month: 12, day: 30 }).label).toBe("2083/84");
    expect(fiscalYearOfBs({ year: 2084, month: 3, day: 15 }).label).toBe("2083/84");
    const fy = fiscalYearOfBs({ year: 2083, month: 4, day: 1 });
    expect(toIso(fy.startAd)).toBe("2026-07-17");
    const next = fiscalYearOfBs({ year: 2084, month: 4, day: 1 });
    // the day after this fiscal year ends is the first day of the next one
    const after = new Date(Date.UTC(fy.endAd.year, fy.endAd.month - 1, fy.endAd.day + 1));
    expect(toIso({ year: after.getUTCFullYear(), month: after.getUTCMonth() + 1, day: after.getUTCDate() })).toBe(toIso(next.startAd));
  });

  it("formats in English and Nepali", () => {
    expect(formatBs({ year: 2083, month: 4, day: 17 })).toBe("17 Shrawan 2083");
    expect(formatBs({ year: 2083, month: 4, day: 17 }, "ne")).toBe("१७ श्रावण २०८३");
    expect(toNepaliDigits(2026)).toBe("२०२६");
  });

  it("reads Nepal's calendar date regardless of server time zone", () => {
    // 2026-07-16 20:00 UTC is already 17 July in Nepal (UTC+5:45)
    expect(nepalToday(new Date(Date.UTC(2026, 6, 16, 20, 0, 0)))).toEqual({ year: 2026, month: 7, day: 17 });
    expect(nepalToday(new Date(Date.UTC(2026, 6, 16, 5, 0, 0)))).toEqual({ year: 2026, month: 7, day: 16 });
  });
});
