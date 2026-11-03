import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { buildLedger, type Ledger } from "@/domain/fees";
import { scoreRisk, type RiskResult } from "@/domain/risk";

export type StudentRow = typeof schema.students.$inferSelect;
export type BatchRow = typeof schema.batches.$inferSelect;
export type CentreRow = typeof schema.centres.$inferSelect;
export type ParentRow = typeof schema.parents.$inferSelect;
export type PlanRow = typeof schema.feePlans.$inferSelect;

export interface StudentView {
  student: StudentRow;
  batch: BatchRow;
  centre: CentreRow;
  parent: ParentRow;
  plan: PlanRow;
  ledger: Ledger;
}

function group<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

/**
 * Loads students with their computed ledgers. The whole school is a few
 * thousand rows, so ledgers are computed in memory from instalments and
 * payments rather than stored. That keeps one source of truth: payments.
 */
export async function loadStudents(today: string, opts: { ids?: string[]; parentId?: string } = {}): Promise<StudentView[]> {
  const where = opts.ids
    ? inArray(schema.students.id, opts.ids.length ? opts.ids : ["__none__"])
    : opts.parentId
      ? eq(schema.students.parentId, opts.parentId)
      : undefined;

  const rows = await db
    .select({
      student: schema.students,
      batch: schema.batches,
      centre: schema.centres,
      parent: schema.parents,
      plan: schema.feePlans,
    })
    .from(schema.students)
    .innerJoin(schema.batches, eq(schema.students.batchId, schema.batches.id))
    .innerJoin(schema.centres, eq(schema.batches.centreId, schema.centres.id))
    .innerJoin(schema.parents, eq(schema.students.parentId, schema.parents.id))
    .innerJoin(schema.feePlans, eq(schema.feePlans.studentId, schema.students.id))
    .where(where)
    .orderBy(schema.students.id);

  const ids = rows.map((r) => r.student.id);
  if (!ids.length) return [];
  const scoped = !!(opts.ids || opts.parentId);
  const [insts, pays] = await Promise.all([
    db.select().from(schema.instalments).where(scoped ? inArray(schema.instalments.studentId, ids) : undefined),
    db.select().from(schema.payments).where(scoped ? inArray(schema.payments.studentId, ids) : undefined),
  ]);
  const ib = group(insts, (i) => i.studentId);
  const pb = group(pays, (p) => p.studentId);

  return rows.map((r) => ({
    ...r,
    ledger: buildLedger(ib.get(r.student.id) ?? [], pb.get(r.student.id) ?? [], today),
  }));
}

export async function loadStudent(today: string, id: string) {
  return (await loadStudents(today, { ids: [id] }))[0] ?? null;
}

export async function loadAcademics(studentIds: string[]) {
  const ids = studentIds.length ? studentIds : ["__none__"];
  const [att, tests] = await Promise.all([
    db.select().from(schema.attendance).where(inArray(schema.attendance.studentId, ids)),
    db.select().from(schema.testScores).where(inArray(schema.testScores.studentId, ids)),
  ]);
  return { attendance: group(att, (a) => a.studentId), tests: group(tests, (t) => t.studentId) };
}

export async function riskFor(views: StudentView[]): Promise<Map<string, RiskResult>> {
  const { attendance, tests } = await loadAcademics(views.map((v) => v.student.id));
  const out = new Map<string, RiskResult>();
  for (const v of views) {
    out.set(
      v.student.id,
      scoreRisk({
        instalments: v.ledger.instalments,
        attendance: attendance.get(v.student.id) ?? [],
        tests: tests.get(v.student.id) ?? [],
      }),
    );
  }
  return out;
}

export async function paymentsFor(studentId: string) {
  return db.select().from(schema.payments).where(eq(schema.payments.studentId, studentId)).orderBy(desc(schema.payments.receivedOn));
}

export async function remindersFor(studentId: string) {
  return db.select().from(schema.reminders).where(eq(schema.reminders.studentId, studentId)).orderBy(desc(schema.reminders.sentOn));
}

export async function openFlagsFor(studentId: string) {
  return db
    .select()
    .from(schema.riskFlags)
    .where(and(eq(schema.riskFlags.studentId, studentId)))
    .orderBy(desc(schema.riskFlags.createdOn));
}

export async function listCentresAndBatches() {
  const [centres, batches] = await Promise.all([
    db.select().from(schema.centres).orderBy(schema.centres.name),
    db.select().from(schema.batches).orderBy(schema.batches.name),
  ]);
  return { centres, batches };
}
