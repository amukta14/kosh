"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { daysBetween, isIsoDate } from "@/domain/dates";
import { calculateRefund, RefundError, REFUND_POLICY } from "@/domain/refund";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { newId } from "@/server/ids";
import { loadStudent } from "@/server/queries";
import type { FormState } from "./payments";

const input = z.object({
  studentId: z.string().regex(/^STU-\d{4}$/),
  leaveDate: z.string().refine(isIsoDate, "Pick the last day attended"),
  requestDate: z.string().refine(isIsoDate, "Pick the date the written request came in"),
  materialDeduction: z.coerce.number().int("Whole rupees only").min(0).default(0),
});

/** Recomputes on the server from the ledger; numbers typed in the browser are never trusted. */
export async function createRefund(_: FormState, form: FormData): Promise<FormState> {
  const s = await requireRole("accounts");
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { studentId, leaveDate, requestDate, materialDeduction } = parsed.data;
  const today = await getToday();
  if (daysBetween(requestDate, today) < 0) return { error: "The request date cannot be in the future" };
  const v = await loadStudent(today, studentId);
  if (!v) return { error: "Student not found" };
  if (v.student.status !== "active") return { error: "A refund already exists for this student" };

  let calc;
  try {
    calc = calculateRefund({ courseStart: v.batch.startDate, courseEnd: v.batch.endDate, enrolledOn: v.student.enrolledOn, netFee: v.plan.netFee, totalPaid: v.ledger.totalPaid, leaveDate, requestDate, materialDeduction });
  } catch (e) {
    if (e instanceof RefundError) return { error: e.message };
    throw e;
  }

  const id = newId("ref");
  await db.transaction(async (tx) => {
    await tx.insert(schema.refunds).values({ id, studentId, requestDate, leaveDate, materialDeduction, refundAmount: calc.refund, calculation: JSON.stringify(calc), policyVersion: REFUND_POLICY.version, deadline: calc.deadline, status: "pending_approval", createdBy: s.sub });
    // Leaving stops reminders straight away.
    await tx.update(schema.students).set({ status: "withdrawn", withdrawnOn: leaveDate }).where(eq(schema.students.id, studentId));
  });
  await audit(s.sub, "refund.created", id, { studentId, refund: calc.refund });
  revalidatePath("/staff", "layout");
  redirect(`/staff/refunds/${id}`);
}

export async function approveRefund(_: FormState, form: FormData): Promise<FormState> {
  const s = await requireRole("accounts");
  const id = String(form.get("id") ?? "");
  const r = await db.query.refunds.findFirst({ where: eq(schema.refunds.id, id) });
  if (!r || r.status !== "pending_approval") return { error: "This refund is not waiting for approval" };
  if (r.createdBy === s.sub) return { error: "A second person must approve. Ask another accounts executive (maker-checker)." };
  await db.update(schema.refunds).set({ status: "approved", approvedBy: s.sub }).where(and(eq(schema.refunds.id, id), eq(schema.refunds.status, "pending_approval")));
  await audit(s.sub, "refund.approved", id);
  revalidatePath("/staff", "layout");
  return { ok: "Approved. Pay it out and record the bank reference." };
}

const paid = z.object({ id: z.string().min(1), payoutReference: z.string().trim().min(4, "Add the bank UTR or reference").max(60) });

export async function markRefundPaid(_: FormState, form: FormData): Promise<FormState> {
  const s = await requireRole("accounts");
  const parsed = paid.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const r = await db.query.refunds.findFirst({ where: eq(schema.refunds.id, parsed.data.id) });
  if (!r || r.status !== "approved") return { error: "Only approved refunds can be marked paid" };
  await db.update(schema.refunds).set({ status: "paid", paidOn: await getToday(), payoutReference: parsed.data.payoutReference }).where(eq(schema.refunds.id, r.id));
  await audit(s.sub, "refund.paid", r.id, { ref: parsed.data.payoutReference });
  revalidatePath("/staff", "layout");
  return { ok: "Marked paid" };
}
