"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { daysBetween, isIsoDate } from "@/domain/dates";
import { inr } from "@/domain/money";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { ingestCredit, recordPayment } from "@/server/payments";
import { loadStudent } from "@/server/queries";

export type FormState = { ok?: string; error?: string; fields?: Record<string, string> } | null;

const amount = z.coerce.number({ invalid_type_error: "Enter an amount" }).int("Whole rupees only").positive("Amount must be above zero").max(500000, "That is more than a full course fee");
const date = z.string().refine(isIsoDate, "Pick a valid date");

const manual = z.object({
  studentId: z.string().regex(/^STU-\d{4}$/),
  amount,
  method: z.enum(["cash", "cheque", "neft", "upi"]),
  reference: z.string().trim().min(2, "Add a reference (cheque no., UTR, or 'Counter')").max(80),
  receivedOn: date,
});

export async function recordManualPayment(_: FormState, form: FormData): Promise<FormState> {
  const s = await requireRole("accounts");
  const parsed = manual.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;
  const today = await getToday();
  if (daysBetween(p.receivedOn, today) < 0) return { error: "Payment date cannot be in the future" };
  if (daysBetween(p.receivedOn, today) > 90) return { error: "Payments older than 90 days need the accounts head" };
  const v = await loadStudent(today, p.studentId);
  if (!v) return { error: "Student not found" };
  if (v.student.status !== "active") return { error: "This student has withdrawn. Settle through the refund instead." };
  if (p.amount > v.ledger.balance) return { error: `That is more than the ${inr(v.ledger.balance)} balance on the course` };

  const r = await recordPayment({ ...p, recordedBy: s.sub });
  revalidatePath(`/staff/students/${p.studentId}`);
  return { ok: `Recorded ${inr(p.amount)}. Receipt ${r.receiptNo}` };
}

const credit = z.object({
  amount,
  reference: z.string().trim().min(1, "Add the bank narration").max(120),
  payerName: z.string().trim().max(80).default(""),
  source: z.enum(["neft", "upi"]),
});

/** Demo tool: feed in a bank/UPI credit the way a bank statement line would arrive. */
export async function simulateCredit(_: FormState, form: FormData): Promise<FormState> {
  const s = await requireRole("accounts");
  const parsed = credit.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const today = await getToday();
  const r = await ingestCredit({ ...parsed.data, receivedOn: today }, today, s.sub);
  revalidatePath("/staff", "layout");
  return r.kind === "auto"
    ? { ok: `Matched to ${r.studentId} automatically (${r.reason}). Receipt ${r.receiptNo}` }
    : { error: `Sent to the queue: ${r.reason}` };
}

const apply = z.object({ id: z.string().min(1), studentId: z.string().trim().toUpperCase().regex(/^STU-\d{4}$/, "Use a student ID like STU-0587") });

export async function applyUnmatched(_: FormState, form: FormData): Promise<FormState> {
  const s = await requireRole("accounts");
  const parsed = apply.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const u = await db.query.unmatchedPayments.findFirst({ where: and(eq(schema.unmatchedPayments.id, parsed.data.id), eq(schema.unmatchedPayments.status, "open")) });
  if (!u) return { error: "Already resolved" };
  const today = await getToday();
  const v = await loadStudent(today, parsed.data.studentId);
  if (!v) return { error: `${parsed.data.studentId} is not on the rolls` };
  if (v.student.status !== "active") return { error: "That student has withdrawn" };
  if (u.amount > v.ledger.balance) return { error: `${v.student.name} only owes ${inr(v.ledger.balance)}. Return the extra to the payer instead.` };

  const p = await recordPayment({
    studentId: v.student.id,
    amount: u.amount,
    receivedOn: u.receivedOn,
    method: u.source === "gateway" ? "gateway" : u.source,
    reference: u.reference,
    recordedBy: s.sub,
  });
  await db.update(schema.unmatchedPayments).set({ status: "matched", matchedPaymentId: p.id, resolvedBy: s.sub, resolvedAt: new Date().toISOString() }).where(eq(schema.unmatchedPayments.id, u.id));
  await audit(s.sub, "unmatched.applied", u.id, { studentId: v.student.id, paymentId: p.id });
  revalidatePath("/staff", "layout");
  return { ok: `Applied ${inr(u.amount)} to ${v.student.name}. Receipt ${p.receiptNo}` };
}

export async function returnUnmatched(form: FormData) {
  const s = await requireRole("accounts");
  const id = String(form.get("id") ?? "");
  await db.update(schema.unmatchedPayments).set({ status: "returned", resolvedBy: s.sub, resolvedAt: new Date().toISOString() }).where(and(eq(schema.unmatchedPayments.id, id), eq(schema.unmatchedPayments.status, "open")));
  await audit(s.sub, "unmatched.returned", id);
  revalidatePath("/staff", "layout");
}
