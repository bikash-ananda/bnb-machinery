import * as mod from "nepali-date-converter";

/** Calendar date parts. month is 1-12 for both AD and BS. */
export type YMD = { year: number; month: number; day: number };

type NepaliDateLike = { getYear(): number; getMonth(): number; getDate(): number; toJsDate(): Date };
type NepaliDateCtor = new (...args: unknown[]) => NepaliDateLike;

const m = mod as unknown as { default?: { default?: NepaliDateCtor } & NepaliDateCtor; NepaliDate?: NepaliDateCtor };
const NepaliDate = (m.default?.default ?? m.default ?? m.NepaliDate) as NepaliDateCtor;

export const BS_MONTHS_EN = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"] as const;
export const BS_MONTHS_NE = ["बैशाख", "जेठ", "असार", "श्रावण", "भदौ", "असोज", "कार्तिक", "मंसिर", "पौष", "माघ", "फागुन", "चैत"] as const;

/** Today's calendar date in Nepal (UTC+5:45), whatever the server time zone is. */
export function nepalToday(now: Date = new Date()): YMD {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(now).split("-");
  return { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) };
}

/** AD calendar date -> BS calendar date (time-zone independent). */
export function adToBs(ad: YMD): YMD {
  const n = new NepaliDate(new Date(ad.year, ad.month - 1, ad.day));
  return { year: n.getYear(), month: n.getMonth() + 1, day: n.getDate() };
}

/** BS calendar date -> AD calendar date (time-zone independent). */
export function bsToAd(bs: YMD): YMD {
  const d = new NepaliDate(bs.year, bs.month - 1, bs.day).toJsDate();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export const toIso = (d: YMD) => `${String(d.year).padStart(4, "0")}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

const NE_DIGITS = "०१२३४५६७८९";
export const toNepaliDigits = (s: string | number) => String(s).replace(/\d/g, (c) => NE_DIGITS[Number(c)]);

/** "17 Shrawan 2083" or "१७ श्रावण २०८३". */
export function formatBs(bs: YMD, locale: "en" | "ne" = "en"): string {
  if (locale === "ne") return toNepaliDigits(`${bs.day} `) + BS_MONTHS_NE[bs.month - 1] + " " + toNepaliDigits(bs.year);
  return `${bs.day} ${BS_MONTHS_EN[bs.month - 1]} ${bs.year}`;
}

export type FiscalYear = { label: string; startBs: YMD; startAd: YMD; endAd: YMD };

const addDaysAd = (d: YMD, days: number): YMD => {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
};

/** Nepal fiscal year: Shrawan 1 to Ashadh end. Label like "2083/84". */
export function fiscalYearOfBs(bs: YMD): FiscalYear {
  const startYear = bs.month >= 4 ? bs.year : bs.year - 1;
  const startBs: YMD = { year: startYear, month: 4, day: 1 };
  const startAd = bsToAd(startBs);
  const nextStartAd = bsToAd({ year: startYear + 1, month: 4, day: 1 });
  return { label: `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`, startBs, startAd, endAd: addDaysAd(nextStartAd, -1) };
}

export const fiscalYearOfAd = (ad: YMD) => fiscalYearOfBs(adToBs(ad));
