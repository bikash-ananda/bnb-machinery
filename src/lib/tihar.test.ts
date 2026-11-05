import { describe, expect, it } from "vitest";
import { TIHAR_STAGES, getDayPeriod, getNepalHour, getTiharGreeting, getTiharTheme } from "./tihar";

const at = (iso: string) => Date.parse(`${iso}+05:45`);

describe("Nepal time", () => {
  it("uses UTC+5:45 whatever the visitor's zone", () => {
    expect(getNepalHour(Date.parse("2026-11-08T00:00:00Z"))).toBe(5);
    expect(getNepalHour(Date.parse("2026-11-07T18:15:00Z"))).toBe(0);
  });

  it("splits the day into four periods", () => {
    expect(getDayPeriod(at("2026-11-08T04:59:00"))).toBe("night");
    expect(getDayPeriod(at("2026-11-08T05:00:00"))).toBe("morning");
    expect(getDayPeriod(at("2026-11-08T12:00:00"))).toBe("afternoon");
    expect(getDayPeriod(at("2026-11-08T17:00:00"))).toBe("evening");
    expect(getDayPeriod(at("2026-11-08T21:00:00"))).toBe("night");
  });
});

describe("festival stages", () => {
  it("are in order and never overlap", () => {
    for (let i = 0; i < TIHAR_STAGES.length; i++) {
      expect(Date.parse(TIHAR_STAGES[i].from)).toBeLessThan(Date.parse(TIHAR_STAGES[i].to));
      if (i > 0) expect(Date.parse(TIHAR_STAGES[i - 1].to)).toBeLessThanOrEqual(Date.parse(TIHAR_STAGES[i].from));
    }
  });

  it("picks the right theme for each day", () => {
    expect(getTiharTheme(at("2026-11-05T10:00:00"))).toBe("general");
    expect(getTiharTheme(at("2026-11-07T09:00:00"))).toBe("kaag");
    expect(getTiharTheme(at("2026-11-08T10:00:00"))).toBe("kukur");
    expect(getTiharTheme(at("2026-11-08T17:00:00"))).toBe("laxmi");
    expect(getTiharTheme(at("2026-11-09T09:00:00"))).toBe("laxmi");
    expect(getTiharTheme(at("2026-11-10T09:00:00"))).toBe("goru");
    expect(getTiharTheme(at("2026-11-11T11:39:00"))).toBe("bhaitika");
    expect(getTiharTheme(at("2026-11-12T00:00:00"))).toBe("general");
  });
});

describe("greetings", () => {
  const now = at("2026-11-08T19:00:00");

  it("is Nepali only", () => {
    for (const visit of [0, 1, 2]) {
      const g = getTiharGreeting(now, visit);
      for (const text of [g.salutation, g.title, g.message, g.signature]) {
        expect(text).toMatch(/[\u0900-\u097F]/);
        expect(text).not.toMatch(/[A-Za-z]/);
      }
    }
  });

  it("rotates wishes on repeat visits and wraps around", () => {
    const messages = [0, 1, 2].map((v) => getTiharGreeting(now, v).message);
    expect(new Set(messages).size).toBe(3);
    expect(getTiharGreeting(now, 3).message).toBe(messages[0]);
  });

  it("survives odd visit counts", () => {
    expect(getTiharGreeting(now, -1).variant).toBe(2);
    expect(getTiharGreeting(now, Number.NaN).variant).toBe(0);
    expect(getTiharGreeting(now, 1.9).variant).toBe(1);
  });

  it("changes the salutation with the time of day", () => {
    const morning = getTiharGreeting(at("2026-11-07T08:00:00")).salutation;
    const night = getTiharGreeting(at("2026-11-07T23:00:00")).salutation;
    expect(morning).not.toBe(night);
  });
});
