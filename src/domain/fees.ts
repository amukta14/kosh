import { daysBetween } from "./dates";

export type DiscountType = "none" | "percent" | "flat";

export interface Instalment {
  id: string;
  seq: number;
  dueDate: string;
  amount: number;
}

export interface Payment {
  id: string;
  amount: number;
  receivedOn: string;
}

export type InstalmentStatus = "paid" | "overdue" | "due_today" | "upcoming";

export interface Allocation {
  paymentId: string;
  amount: number;
  on: string;
}

export interface InstalmentState extends Instalment {
  paid: number;
  balance: number;
  status: InstalmentStatus;
  /** Positive when overdue, 0 otherwise. */
  daysOverdue: number;
  /** Positive when the due date is in the future. */
  daysUntilDue: number;
  /** Date the instalment became fully paid, if it is. */
  paidOn: string | null;
  /** Days after the due date it was fully paid (negative = early). */
  paidLateBy: number | null;
  allocations: Allocation[];
}

export interface Ledger {
  instalments: InstalmentState[];
  netFee: number;
  totalPaid: number;
  /** Total still owed across the whole course. */
  balance: number;
  /** Owed on instalments whose due date has passed or is today. */
  dueNow: number;
  overdue: number;
  /** Money paid beyond the net fee; held as credit, never silently absorbed. */
  credit: number;
  /** The instalment a parent should pay next (oldest with a balance). */
  next: InstalmentState | null;
  maxDaysOverdue: number;
}

export function applyDiscount(gross: number, type: DiscountType, value: number): number {
  if (!Number.isInteger(gross) || gross <= 0) throw new Error("Gross fee must be a positive whole number");
  if (type === "none") return gross;
  if (!Number.isFinite(value) || value < 0) throw new Error("Discount cannot be negative");
  if (type === "percent") {
    if (value > 100) throw new Error("Percentage discount cannot exceed 100");
    return gross - Math.round((gross * value) / 100);
  }
  if (value > gross) throw new Error("Flat discount cannot exceed the fee");
  return gross - Math.round(value);
}

/**
 * Splits a net fee into instalments. Every instalment except the last is
 * rounded down to the nearest ₹100; the last carries the remainder so the
 * plan always sums to the net fee exactly.
 */
export function splitInstalments(netFee: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > 12) throw new Error("Instalment count must be 1–12");
  if (!Number.isInteger(netFee) || netFee < 0) throw new Error("Net fee must be a whole number ≥ 0");
  const base = Math.floor(netFee / count / 100) * 100;
  const parts = Array.from({ length: count }, () => base);
  parts[count - 1] = netFee - base * (count - 1);
  return parts;
}

/**
 * Builds the ledger: payments are applied oldest-first to the oldest unpaid
 * instalment (FIFO). This is how the accounts team already treats part
 * payments, and it means "days overdue" always refers to the oldest debt.
 */
export function buildLedger(instalments: Instalment[], payments: Payment[], today: string): Ledger {
  const insts = [...instalments].sort((a, b) => a.seq - b.seq);
  const pays = [...payments].sort((a, b) => a.receivedOn.localeCompare(b.receivedOn) || a.id.localeCompare(b.id));

  const states: InstalmentState[] = insts.map((i) => ({
    ...i,
    paid: 0,
    balance: i.amount,
    status: "upcoming",
    daysOverdue: 0,
    daysUntilDue: 0,
    paidOn: null,
    paidLateBy: null,
    allocations: [],
  }));

  let credit = 0;
  for (const p of pays) {
    if (p.amount <= 0) continue;
    let left = p.amount;
    for (const s of states) {
      if (left === 0) break;
      if (s.balance === 0) continue;
      const take = Math.min(left, s.balance);
      s.paid += take;
      s.balance -= take;
      left -= take;
      s.allocations.push({ paymentId: p.id, amount: take, on: p.receivedOn });
      if (s.balance === 0) {
        s.paidOn = p.receivedOn;
        s.paidLateBy = daysBetween(s.dueDate, p.receivedOn);
      }
    }
    credit += left;
  }

  let dueNow = 0;
  let overdue = 0;
  let maxDaysOverdue = 0;
  for (const s of states) {
    const d = daysBetween(s.dueDate, today); // >0 means due date is in the past
    if (s.balance === 0) {
      s.status = "paid";
    } else if (d > 0) {
      s.status = "overdue";
      s.daysOverdue = d;
      overdue += s.balance;
      dueNow += s.balance;
      maxDaysOverdue = Math.max(maxDaysOverdue, d);
    } else if (d === 0) {
      s.status = "due_today";
      dueNow += s.balance;
    } else {
      s.status = "upcoming";
      s.daysUntilDue = -d;
    }
  }

  const netFee = insts.reduce((a, i) => a + i.amount, 0);
  const totalPaid = pays.reduce((a, p) => a + Math.max(0, p.amount), 0);
  return {
    instalments: states,
    netFee,
    totalPaid,
    balance: states.reduce((a, s) => a + s.balance, 0),
    dueNow,
    overdue,
    credit,
    next: states.find((s) => s.balance > 0) ?? null,
    maxDaysOverdue,
  };
}

/** Human status matching the client's own wording, e.g. "Part paid, 23 days overdue". */
export function statusLabel(s: InstalmentState): string {
  if (s.status === "paid") return "Paid";
  const part = s.paid > 0 ? "Part paid, " : "";
  if (s.status === "overdue") return `${part}${s.daysOverdue} day${s.daysOverdue === 1 ? "" : "s"} overdue`;
  if (s.status === "due_today") return `${part}due today`;
  return `${part ? "Part paid, d" : "D"}ue in ${s.daysUntilDue} day${s.daysUntilDue === 1 ? "" : "s"}`;
}
