import { addDays, daysBetween, formatDate } from "./dates";
import type { InstalmentState } from "./fees";
import { inr } from "./money";

/** Days relative to the due date: before, on, and after. */
export const REMINDER_OFFSETS = [-7, -3, 0, 3, 7, 15, 30] as const;

export type ReminderPlanItem = {
  offset: number;
  date: string;
  state: "sent" | "superseded" | "due" | "scheduled" | "cancelled";
};

export interface ReminderDecision {
  /** Offset to send now, if any. */
  send: number | null;
  /** Older missed offsets to mark as superseded (never send a burst). */
  supersede: number[];
  plan: ReminderPlanItem[];
}

/**
 * Decides what to send for one instalment today.
 * - Paid (balance 0) → nothing is sent and every future step is cancelled.
 * - If several steps are due at once (e.g. the job did not run for a week),
 *   only the most recent is sent; older ones are marked superseded.
 * - Each step is sent at most once (also enforced by a unique DB index).
 */
export function decideReminders(
  inst: Pick<InstalmentState, "dueDate" | "balance">,
  today: string,
  done: Map<number, "sent" | "superseded">,
): ReminderDecision {
  const plan: ReminderPlanItem[] = [];
  const dueSteps: number[] = [];

  for (const offset of REMINDER_OFFSETS) {
    const date = addDays(inst.dueDate, offset);
    const prior = done.get(offset);
    if (prior) {
      plan.push({ offset, date, state: prior });
    } else if (inst.balance <= 0) {
      plan.push({ offset, date, state: "cancelled" });
    } else if (daysBetween(date, today) >= 0) {
      dueSteps.push(offset);
      plan.push({ offset, date, state: "due" });
    } else {
      plan.push({ offset, date, state: "scheduled" });
    }
  }

  if (inst.balance <= 0 || dueSteps.length === 0) return { send: null, supersede: [], plan };
  const send = dueSteps[dueSteps.length - 1];
  const supersede = dueSteps.slice(0, -1);
  for (const p of plan) {
    if (p.offset === send) p.state = "sent";
    else if (supersede.includes(p.offset)) p.state = "superseded";
  }
  return { send, supersede, plan };
}

export interface ReminderVars {
  studentName: string;
  seq: number;
  amount: number;
  dueDate: string;
  offset: number;
  link: string;
}

/** Message text. Kept short: parents read these on basic phones over WhatsApp/SMS. */
export function renderReminder(lang: "en" | "hi", v: ReminderVars): string {
  const first = v.studentName.split(" ")[0];
  const amt = inr(v.amount);
  if (lang === "hi") {
    const date = formatDate(v.dueDate, "hi");
    if (v.offset < 0)
      return `नमस्ते, ${first} की फ़ीस की किस्त ${v.seq} (${amt}) ${date} को देय है। भुगतान करें: ${v.link}`;
    if (v.offset === 0) return `नमस्ते, ${first} की फ़ीस की किस्त ${v.seq} (${amt}) आज देय है। भुगतान करें: ${v.link}`;
    return `नमस्ते, ${first} की फ़ीस के ${amt} ${date} से बाकी हैं (${v.offset} दिन)। भुगतान करें: ${v.link}\nभुगतान कर दिया है तो इस संदेश को अनदेखा करें।`;
  }
  const date = formatDate(v.dueDate, "en");
  if (v.offset < 0) return `Hello, ${first}'s fee instalment ${v.seq} of ${amt} is due on ${date}. Pay here: ${v.link}`;
  if (v.offset === 0) return `Hello, ${first}'s fee instalment ${v.seq} of ${amt} is due today. Pay here: ${v.link}`;
  return `Hello, ${amt} of ${first}'s fee has been due since ${date} (${v.offset} days). Pay here: ${v.link}\nAlready paid? Please ignore this.`;
}

export function offsetLabel(offset: number): string {
  if (offset === 0) return "On due date";
  return offset < 0 ? `${-offset}d before` : `${offset}d after`;
}
