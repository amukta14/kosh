import "server-only";
import { count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, daysBetween } from "@/domain/dates";
import { addToRollup, emptyRollup, type DuesRollup } from "@/domain/dues";
import { loadStudents } from "./queries";

export async function dashboardData(today: string) {
  const all = await loadStudents(today);
  const views = all.filter((v) => v.student.status === "active");

  const total = emptyRollup();
  const byCentre = new Map<string, { name: string; r: DuesRollup }>();
  const byBatch = new Map<string, { batchId: string; centreId: string; name: string; r: DuesRollup }>();

  for (const v of views) {
    addToRollup(total, v.ledger, today);
    if (!byCentre.has(v.centre.id)) byCentre.set(v.centre.id, { name: v.centre.name, r: emptyRollup() });
    addToRollup(byCentre.get(v.centre.id)!.r, v.ledger, today);
    if (!byBatch.has(v.batch.id)) byBatch.set(v.batch.id, { batchId: v.batch.id, centreId: v.centre.id, name: v.batch.name, r: emptyRollup() });
    addToRollup(byBatch.get(v.batch.id)!.r, v.ledger, today);
  }

  // Money expected over the next four weeks, by week.
  const weeks = [0, 1, 2, 3].map((w) => ({ from: addDays(today, w * 7 + 1), to: addDays(today, w * 7 + 7), amount: 0, count: 0 }));
  for (const v of views)
    for (const i of v.ledger.instalments) {
      if (i.balance <= 0) continue;
      const d = daysBetween(today, i.dueDate);
      if (d >= 1 && d <= 28) {
        const w = weeks[Math.floor((d - 1) / 7)];
        w.amount += i.balance;
        w.count += 1;
      }
    }

  // Collected in the last 30 days, and how much of it came in without a person.
  const since = addDays(today, -29);
  const recent = await db.select({ amount: schema.payments.amount, by: schema.payments.recordedBy, on: schema.payments.receivedOn, method: schema.payments.method }).from(schema.payments);
  const last30 = recent.filter((p) => p.on >= since && p.on <= today);
  const collected30 = last30.reduce((a, p) => a + p.amount, 0);
  const selfServe30 = last30.filter((p) => p.method === "gateway" || p.by === "system:matcher").reduce((a, p) => a + p.amount, 0);

  const [[unmatched], [pendingRefunds], [openFlags]] = await Promise.all([
    db.select({ n: count() }).from(schema.unmatchedPayments).where(eq(schema.unmatchedPayments.status, "open")),
    db.select({ n: count() }).from(schema.refunds).where(eq(schema.refunds.status, "pending_approval")),
    db.select({ n: count() }).from(schema.riskFlags).where(eq(schema.riskFlags.status, "open")),
  ]);

  return {
    total,
    centres: [...byCentre.entries()].map(([id, c]) => ({ id, ...c })).sort((a, b) => a.name.localeCompare(b.name)),
    batches: [...byBatch.values()],
    weeks,
    collected30,
    selfServe30,
    attention: { unmatched: unmatched.n, pendingRefunds: pendingRefunds.n, openFlags: openFlags.n },
  };
}
