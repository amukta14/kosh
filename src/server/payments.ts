import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { matchIncoming, type Incoming } from "@/domain/matching";
import { audit } from "./audit";
import { env } from "./env";
import { newId, nowIso } from "./ids";
import { loadStudents } from "./queries";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function financialYear(date: string) {
  const [y, m] = date.split("-").map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

/** Sequential GST receipt numbers, e.g. CA/26-27/00042, allocated inside the transaction. */
async function nextReceiptNo(tx: Tx, date: string) {
  const fy = financialYear(date);
  const key = `receipt_seq_${fy}`;
  await tx.insert(schema.settings).values({ key, value: "0" }).onConflictDoNothing();
  await tx.update(schema.settings).set({ value: sql`CAST(${schema.settings.value} AS INTEGER) + 1` }).where(eq(schema.settings.key, key));
  const row = await tx.query.settings.findFirst({ where: eq(schema.settings.key, key) });
  return `CA/${fy}/${String(row!.value).padStart(5, "0")}`;
}

export interface NewPayment {
  studentId: string;
  amount: number;
  receivedOn: string;
  method: (typeof schema.payments.$inferInsert)["method"];
  reference: string;
  recordedBy: string;
  gatewayOrderId?: string;
}

export async function recordPayment(p: NewPayment, tx?: Tx) {
  const run = async (t: Tx) => {
    const receiptNo = await nextReceiptNo(t, p.receivedOn);
    const id = newId("pay");
    await t.insert(schema.payments).values({ ...p, id, receiptNo, gatewayOrderId: p.gatewayOrderId ?? null, createdAt: nowIso() });
    await audit(p.recordedBy, "payment.recorded", id, { ...p, receiptNo }, t);
    return { id, receiptNo };
  };
  return tx ? run(tx) : db.transaction(run);
}

// ---- Mock payment gateway -------------------------------------------------

export interface GatewayEvent {
  orderId: string;
  amount: number;
  status: "success" | "failed";
  gatewayPaymentId: string;
  paidOn: string;
}

export function signGatewayBody(raw: string) {
  return createHmac("sha256", env.gatewaySecret).update(raw).digest("hex");
}

function validSignature(raw: string, signature: string) {
  const a = Buffer.from(signGatewayBody(raw));
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type GatewayOutcome =
  | { ok: true; state: "paid"; paymentId: string; receiptNo: string }
  | { ok: true; state: "already_paid"; paymentId: string }
  | { ok: true; state: "failed" }
  | { ok: true; state: "queued"; reason: string }
  | { ok: false; error: string };

/**
 * Handles a signed gateway callback. Same code path for the real webhook
 * route and the in-app test checkout. Anything that does not line up exactly
 * with an order we created goes to the unmatched queue; nothing is guessed.
 */
export async function processGatewayEvent(raw: string, signature: string): Promise<GatewayOutcome> {
  if (!validSignature(raw, signature)) return { ok: false, error: "Bad signature" };
  let ev: GatewayEvent;
  try {
    ev = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Bad JSON" };
  }
  if (typeof ev.orderId !== "string" || !Number.isInteger(ev.amount) || !["success", "failed"].includes(ev.status)) {
    return { ok: false, error: "Bad payload" };
  }

  const order = await db.query.gatewayOrders.findFirst({ where: eq(schema.gatewayOrders.id, ev.orderId) });
  if (!order) {
    if (ev.status === "success") await queueUnmatched({ amount: ev.amount, reference: `${ev.gatewayPaymentId} ${ev.orderId}`, payerName: "Gateway", receivedOn: ev.paidOn, source: "gateway", reason: "Gateway payment for an order we did not create" });
    return { ok: true, state: "queued", reason: "Unknown order" };
  }
  if (order.status === "paid") {
    const p = await db.query.payments.findFirst({ where: eq(schema.payments.gatewayOrderId, order.id) });
    return { ok: true, state: "already_paid", paymentId: p?.id ?? "" };
  }
  if (ev.status === "failed") {
    await db.update(schema.gatewayOrders).set({ status: "failed" }).where(eq(schema.gatewayOrders.id, order.id));
    return { ok: true, state: "failed" };
  }
  if (ev.amount !== order.amount) {
    await queueUnmatched({ amount: ev.amount, reference: `${ev.gatewayPaymentId} ${order.id} ${order.studentId}`, payerName: "Gateway", receivedOn: ev.paidOn, source: "gateway", reason: `Gateway amount ${ev.amount} does not equal order amount ${order.amount}` });
    await db.update(schema.gatewayOrders).set({ status: "failed" }).where(eq(schema.gatewayOrders.id, order.id));
    return { ok: true, state: "queued", reason: "Amount mismatch" };
  }

  const res = await db.transaction(async (tx) => {
    // Re-check inside the transaction so two callbacks cannot both record.
    const fresh = await tx.query.gatewayOrders.findFirst({ where: eq(schema.gatewayOrders.id, order.id) });
    if (fresh?.status === "paid") return null;
    await tx.update(schema.gatewayOrders).set({ status: "paid" }).where(eq(schema.gatewayOrders.id, order.id));
    return recordPayment(
      { studentId: order.studentId, amount: ev.amount, receivedOn: ev.paidOn, method: "gateway", reference: ev.gatewayPaymentId, recordedBy: "system:gateway", gatewayOrderId: order.id },
      tx,
    );
  });
  if (!res) return { ok: true, state: "already_paid", paymentId: "" };
  return { ok: true, state: "paid", paymentId: res.id, receiptNo: res.receiptNo };
}

// ---- Bank / UPI credits -----------------------------------------------------

async function queueUnmatched(u: Omit<typeof schema.unmatchedPayments.$inferInsert, "id" | "status">) {
  const id = newId("unm");
  await db.insert(schema.unmatchedPayments).values({ ...u, id, status: "open" });
  return id;
}

export async function ingestCredit(inc: Incoming & { receivedOn: string; source: "neft" | "upi" }, today: string, actor: string) {
  const views = (await loadStudents(today)).filter((v) => v.student.status === "active");
  const result = matchIncoming(
    inc,
    views.map((v) => ({ id: v.student.id, name: v.student.name, parentName: v.parent.name, balance: v.ledger.balance, nextDue: v.ledger.next?.balance ?? 0 })),
  );
  if (result.kind === "auto") {
    const p = await recordPayment({ studentId: result.studentId, amount: inc.amount, receivedOn: inc.receivedOn, method: inc.source, reference: inc.reference, recordedBy: "system:matcher" });
    await audit(actor, "credit.auto_matched", p.id, { reason: result.reason });
    return { kind: "auto" as const, studentId: result.studentId, receiptNo: p.receiptNo, reason: result.reason };
  }
  const id = await queueUnmatched({ amount: inc.amount, reference: inc.reference, payerName: inc.payerName, receivedOn: inc.receivedOn, source: inc.source, reason: result.reason });
  return { kind: "queue" as const, id, reason: result.reason };
}

export async function suggestionsFor(u: typeof schema.unmatchedPayments.$inferSelect, today: string) {
  const views = (await loadStudents(today)).filter((v) => v.student.status === "active");
  const r = matchIncoming(
    { amount: u.amount, reference: u.reference, payerName: u.payerName },
    views.map((v) => ({ id: v.student.id, name: v.student.name, parentName: v.parent.name, balance: v.ledger.balance, nextDue: v.ledger.next?.balance ?? 0 })),
  );
  const names = new Map(views.map((v) => [v.student.id, v]));
  const sug = r.kind === "queue" ? r.suggestions : [{ studentId: r.studentId, why: r.reason, score: 1 }];
  return sug.map((s) => ({ ...s, view: names.get(s.studentId)! })).filter((s) => s.view);
}
