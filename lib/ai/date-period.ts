const TIME_ZONE = "Asia/Kathmandu";

export function addCalendarDays(day: string, count: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + count)).toISOString().slice(0, 10);
}
export function businessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function monthStart(day: string) { return `${day.slice(0, 7)}-01`; }
function startOfMonthOffset(day: string, offset: number) {
  const [year, month] = day.slice(0, 7).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
}
function utcAtNepalMidnight(day: string) { return new Date(`${day}T00:00:00+05:45`).toISOString(); }
function windowFor(startDay: string, endDay: string, label: string): DateWindow {
  return { start: utcAtNepalMidnight(startDay), end: utcAtNepalMidnight(endDay), startDay, endDay, label };
}

export type DateWindow = { start: string; end: string; startDay: string; endDay: string; label: string };
export function dateWindowsForQuestion(question: string, now = new Date()): DateWindow[] {
  const q = question.toLowerCase();
  const today = businessDate(now);
  const tomorrow = addCalendarDays(today, 1);
  const compareMonths = /\b(compare|versus|\bvs\b|compared)\b/.test(q) && /\b(month|monthly)\b/.test(q);
  if (compareMonths || /\b(this month|month to date|monthly|current month)\b|यो महिना/i.test(q)) {
    const current = monthStart(today);
    const previous = startOfMonthOffset(today, -1);
    if (compareMonths) {
      const elapsedDays = Number(today.slice(8, 10));
      const previousLastDay = addCalendarDays(current, -1);
      const previousElapsedDays = Math.min(elapsedDays, Number(previousLastDay.slice(8, 10)));
      const previousEnd = addCalendarDays(previous, previousElapsedDays);
      return [
        windowFor(current, tomorrow, `${current} to ${today} (Nepal time, month to date)`),
        windowFor(previous, previousEnd, `${previous} to ${addCalendarDays(previousEnd, -1)} (Nepal time, matching days)`),
      ];
    }
    return [windowFor(current, tomorrow, `${current} to ${today} (Nepal time, month to date)`)];
  }
  if (/\b(last month|previous month)\b/.test(q)) {
    const current = monthStart(today);
    const previous = startOfMonthOffset(today, -1);
    return [windowFor(previous, current, `${previous} to ${addCalendarDays(current, -1)} (Nepal time)`)];
  }
  if (/\b(yesterday)\b/.test(q)) {
    const day = addCalendarDays(today, -1);
    return [windowFor(day, today, `${day} (Nepal time)`)];
  }
  if (/\b(today|today.s)\b|आजको|आज/i.test(q)) {
    return [windowFor(today, tomorrow, `${today} (Nepal time)`)];
  }
  const rolling = q.match(/\b(?:last|past)\s+(7|30|90|180)\s+days?\b/);
  if (rolling) {
    const days = Number(rolling[1]);
    const startDay = addCalendarDays(today, -(days - 1));
    return [windowFor(startDay, tomorrow, `${startDay} to ${today} (Nepal time, ${days} days)`)];
  }
  const current = monthStart(today);
  return [windowFor(current, tomorrow, `${current} to ${today} (Nepal time, month to date)`)];
}