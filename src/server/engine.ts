import "server-only";
import { db, schema } from "@/db";
import { daysBetween } from "@/domain/dates";
import { decideReminders, renderReminder } from "@/domain/reminders";
import { shouldOpenFlag } from "@/domain/risk";
import { newId, nowIso } from "./ids";
import { payUrl } from "./paylink";
import { loadStudents, riskFor } from "./queries";

/** Map instalmentId -> (offset -> status) for reminders already handled. */
async function reminderState() {
  const rows = await db.select({ i: schema.reminders.instalmentId, o: schema.reminders.offsetDays, s: schema.reminders.status }).from(schema.reminders);
  const m = new Map<string, Map<number, "sent" | "superseded">>();
  for (const r of rows) {
    if (!m.has(r.i)) m.set(r.i, new Map());
    m.get(r.i)!.set(r.o, r.s);
  }
  return m;
}

/**
 * The reminder job. Safe to run any number of times a day: each
 * (instalment, step) pair is unique in the DB, and paid instalments are
 * skipped because their balance is read fresh from the ledger.
 */
export async function runReminders(today: string) {
  const views = (await loadStudents(today)).filter((v) => v.student.status === "active");
  const done = await reminderState();
  const rows: (typeof schema.reminders.$inferInsert)[] = [];

  for (const v of views) {
    for (const inst of v.ledger.instalments) {
      const d = decideReminders(inst, today, done.get(inst.id) ?? new Map());
      if (d.send === null) continue;
      const lang = v.parent.language;
      const base = {
        studentId: v.student.id,
        instalmentId: inst.id,
        channel: "whatsapp" as const,
        language: lang,
        toPhone: v.parent.phone,
        balanceAtSend: inst.balance,
        sentOn: today,
      };
      for (const o of d.supersede) rows.push({ ...base, id: newId("rem"), offsetDays: o, status: "superseded", body: "" });
      rows.push({
        ...base,
        id: newId("rem"),
        offsetDays: d.send,
        status: "sent",
        body: renderReminder(lang, {
          studentName: v.student.name,
          seq: inst.seq,
          amount: inst.balance,
          dueDate: inst.dueDate,
          offset: d.send,
          link: payUrl(inst.id),
        }),
      });
    }
  }

  // Chunked to stay under SQLite's variable limit.
  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(schema.reminders).values(rows.slice(i, i + 50)).onConflictDoNothing();
  }
  return { sent: rows.filter((r) => r.status === "sent").length, superseded: rows.filter((r) => r.status === "superseded").length };
}

/**
 * The dropout-risk job. It can only create counsellor call tasks.
 * It has no access to payments, reminders or parent messaging by design.
 */
export async function runRisk(today: string) {
  const views = (await loadStudents(today)).filter((v) => v.student.status === "active");
  const risk = await riskFor(views);
  const flags = await db.select().from(schema.riskFlags);
  const byStudent = new Map<string, typeof flags>();
  for (const f of flags) byStudent.set(f.studentId, [...(byStudent.get(f.studentId) ?? []), f]);

  let opened = 0;
  for (const v of views) {
    const r = risk.get(v.student.id)!;
    const mine = byStudent.get(v.student.id) ?? [];
    const lastFalse = mine
      .filter((f) => f.status === "false_flag" && f.reviewedAt)
      .sort((a, b) => b.reviewedAt!.localeCompare(a.reviewedAt!))[0];
    const open = shouldOpenFlag({
      result: r,
      today,
      openFlag: mine.some((f) => f.status === "open"),
      lastFalseFlag: lastFalse ? { reviewedOn: lastFalse.reviewedAt!.slice(0, 10), probability: lastFalse.probability } : null,
      daysSince: daysBetween,
    });
    if (!open) continue;
    await db.insert(schema.riskFlags).values({
      id: newId("flag"),
      studentId: v.student.id,
      probability: Math.round(r.probability * 100),
      factors: JSON.stringify(r.factors),
      createdOn: today,
      status: "open",
    });
    opened++;
  }
  return { opened, scored: views.length, at: nowIso() };
}
