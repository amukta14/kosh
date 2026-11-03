// Calendar dates as "YYYY-MM-DD" strings, computed in UTC so there is no
// timezone drift. "Today" is always passed in, which keeps the logic testable.

const DAY = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string): boolean {
  if (!ISO.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function toDay(s: string): number {
  if (!isIsoDate(s)) throw new Error(`Invalid date: ${s}`);
  return Math.round(new Date(s + "T00:00:00Z").getTime() / DAY);
}

export function fromDay(n: number): string {
  return new Date(n * DAY).toISOString().slice(0, 10);
}

/** b - a, in days. */
export function daysBetween(a: string, b: string): number {
  return toDay(b) - toDay(a);
}

export function addDays(s: string, n: number): string {
  return fromDay(toDay(s) + n);
}

export function monthOf(s: string): string {
  return s.slice(0, 7);
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_HI = ["जन॰", "फ़र॰", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अग॰", "सित॰", "अक्टू॰", "नव॰", "दिस॰"];

export function formatDate(s: string, lang: "en" | "hi" = "en", withYear = true): string {
  const [y, m, d] = s.split("-").map(Number);
  const mon = (lang === "hi" ? MONTHS_HI : MONTHS_EN)[m - 1];
  return withYear ? `${d} ${mon} ${y}` : `${d} ${mon}`;
}

export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_EN[m - 1]} ${String(y).slice(2)}`;
}
