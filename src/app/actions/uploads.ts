"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { validateAttendance, validateScores, type RowError } from "@/domain/csv";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { runRisk } from "@/server/engine";

export type UploadState = {
  kind?: "attendance" | "scores";
  batchId?: string;
  text?: string;
  errors?: RowError[];
  preview?: string[][];
  count?: number;
  done?: string;
  error?: string;
} | null;

const MAX_BYTES = 200_000;

export async function uploadAction(_: UploadState, form: FormData): Promise<UploadState> {
  const s = await requireRole("accounts");
  const kind = form.get("kind") === "scores" ? "scores" : "attendance";
  const batchId = String(form.get("batchId") ?? "");
  const text = String(form.get("text") ?? "");
  const intent = form.get("intent");
  if (!batchId) return { kind, text, error: "Pick a batch" };
  if (!text.trim()) return { kind, batchId, error: "Paste the sheet or choose a CSV file" };
  if (text.length > MAX_BYTES) return { kind, batchId, error: "File is too large (200 KB max, about 2,000 rows)" };

  const roster = new Set((await db.select({ id: schema.students.id }).from(schema.students).where(eq(schema.students.batchId, batchId))).map((r) => r.id));
  const base = { kind, batchId, text } as const;

  if (kind === "attendance") {
    const v = validateAttendance(text, roster);
    if (v.errors.length || intent !== "import") {
      return { ...base, errors: v.errors, count: v.rows.length, preview: v.rows.slice(0, 6).map((r) => [r.studentId, r.month, `${r.present} / ${r.total}`]) };
    }
    for (const r of v.rows) {
      await db.insert(schema.attendance).values(r).onConflictDoUpdate({ target: [schema.attendance.studentId, schema.attendance.month], set: { present: r.present, total: r.total } });
    }
    await audit(s.sub, "upload.attendance", batchId, { rows: v.rows.length });
    const risk = await runRisk(await getToday());
    revalidatePath("/staff", "layout");
    return { kind, batchId, done: `Imported ${v.rows.length} attendance rows. Risk rescored: ${risk.opened} new call task${risk.opened === 1 ? "" : "s"}.` };
  }

  const v = validateScores(text, roster);
  if (v.errors.length || intent !== "import") {
    return { ...base, errors: v.errors, count: v.rows.length, preview: v.rows.slice(0, 6).map((r) => [r.studentId, r.testName, `${r.score} / ${r.maxScore}`]) };
  }
  for (const r of v.rows) {
    await db.insert(schema.testScores).values(r).onConflictDoUpdate({ target: [schema.testScores.studentId, schema.testScores.testName], set: { testDate: r.testDate, score: r.score, maxScore: r.maxScore } });
  }
  await audit(s.sub, "upload.scores", batchId, { rows: v.rows.length });
  const risk = await runRisk(await getToday());
  revalidatePath("/staff", "layout");
  return { kind, batchId, done: `Imported ${v.rows.length} scores. Parents can see them now. Risk rescored: ${risk.opened} new call task${risk.opened === 1 ? "" : "s"}.` };
}

export async function templateFor(batchId: string, kind: "attendance" | "scores", month: string) {
  await requireRole("accounts");
  const ids = await db.select({ id: schema.students.id }).from(schema.students).where(sql`${schema.students.batchId} = ${batchId} AND ${schema.students.status} = 'active'`);
  return kind === "attendance"
    ? ["student_id,month,present,total", ...ids.map((r) => `${r.id},${month},,`)].join("\n")
    : ["student_id,test_name,test_date,score,max_score", ...ids.map((r) => `${r.id},Unit Test 7,,,`)].join("\n");
}
