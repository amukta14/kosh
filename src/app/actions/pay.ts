"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { getToday } from "@/server/clock";
import { newId, nowIso } from "@/server/ids";
import { readPayToken } from "@/server/paylink";
import { processGatewayEvent, signGatewayBody, type GatewayEvent } from "@/server/payments";
import { loadStudent } from "@/server/queries";

export async function startCheckout(form: FormData) {
  const token = String(form.get("token") ?? "");
  const instId = readPayToken(token);
  if (!instId) redirect("/");
  const inst = await db.query.instalments.findFirst({ where: eq(schema.instalments.id, instId) });
  if (!inst) redirect("/");
  const view = await loadStudent(await getToday(), inst.studentId);
  const state = view?.ledger.instalments.find((i) => i.id === instId);
  if (!view || !state || state.balance <= 0 || view.student.status !== "active") redirect(`/p/${token}`);

  // Amount is always taken from the ledger on the server, never from the form.
  const id = newId("order");
  await db.insert(schema.gatewayOrders).values({ id, studentId: view.student.id, instalmentId: instId, amount: state.balance, status: "created", createdAt: nowIso() });
  redirect(`/gateway/${id}?t=${encodeURIComponent(token)}`);
}

/**
 * Test-mode gateway. Builds the same signed callback a real gateway would send
 * and runs it through the same handler as /api/gateway/webhook.
 */
export async function completeTestPayment(form: FormData) {
  const orderId = String(form.get("orderId") ?? "");
  const token = String(form.get("token") ?? "");
  const outcome = form.get("outcome") === "fail" ? "failed" : "success";
  const order = await db.query.gatewayOrders.findFirst({ where: eq(schema.gatewayOrders.id, orderId) });
  if (!order || !readPayToken(token)) redirect("/");

  const ev: GatewayEvent = {
    orderId,
    amount: order.amount,
    status: outcome,
    gatewayPaymentId: `pay_T${Date.now().toString(36).toUpperCase()}`,
    paidOn: await getToday(),
  };
  const raw = JSON.stringify(ev);
  const res = await processGatewayEvent(raw, signGatewayBody(raw));
  if (!res.ok) redirect(`/p/${token}?error=gateway`);
  redirect(`/p/${token}/done?o=${orderId}`);
}
