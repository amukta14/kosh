import { daysBetween } from "./dates";
import type { Ledger } from "./fees";

export const AGEING_BUCKETS = [
  { key: "b0", label: "1–30", min: 1, max: 30 },
  { key: "b30", label: "31–60", min: 31, max: 60 },
  { key: "b60", label: "61–90", min: 61, max: 90 },
  { key: "b90", label: "90+", min: 91, max: Infinity },
] as const;

export type BucketKey = (typeof AGEING_BUCKETS)[number]["key"];

export function bucketOf(daysOverdue: number): BucketKey | null {
  if (daysOverdue <= 0) return null;
  return AGEING_BUCKETS.find((b) => daysOverdue >= b.min && daysOverdue <= b.max)!.key;
}

export interface DuesRollup {
  students: number;
  billedToDate: number;
  collectedToDate: number;
  overdue: number;
  overdueStudents: number;
  ageing: Record<BucketKey, number>;
  /** Value of instalments due ≥60 days ago that arrived >60 days late or are still unpaid. */
  late60Value: number;
  late60Base: number;
}

export function emptyRollup(): DuesRollup {
  return {
    students: 0,
    billedToDate: 0,
    collectedToDate: 0,
    overdue: 0,
    overdueStudents: 0,
    ageing: { b0: 0, b30: 0, b60: 0, b90: 0 },
    late60Value: 0,
    late60Base: 0,
  };
}

/** Adds one student's ledger into a rollup (mutates and returns `r`). */
export function addToRollup(r: DuesRollup, ledger: Ledger, today: string): DuesRollup {
  r.students += 1;
  let hasOverdue = false;
  for (const i of ledger.instalments) {
    const age = daysBetween(i.dueDate, today);
    if (age >= 0) {
      r.billedToDate += i.amount;
      r.collectedToDate += i.paid;
    }
    if (i.status === "overdue") {
      hasOverdue = true;
      r.overdue += i.balance;
      const b = bucketOf(i.daysOverdue);
      if (b) r.ageing[b] += i.balance;
    }
    // Success metric from the brief: share of instalment value more than 60 days late.
    if (age >= 60) {
      r.late60Base += i.amount;
      // Value not received by due+60: unpaid balance, plus any part paid after the window.
      const lateParts = i.allocations.filter((a) => daysBetween(i.dueDate, a.on) > 60).reduce((s, a) => s + a.amount, 0);
      r.late60Value += i.balance + lateParts;
    }
  }
  if (hasOverdue) r.overdueStudents += 1;
  return r;
}

export function late60Share(r: DuesRollup): number {
  return r.late60Base ? r.late60Value / r.late60Base : 0;
}
