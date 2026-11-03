"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import type { FormState } from "./payments";

const review = z.object({
  id: z.string().min(1),
  outcome: z.enum(["called", "false_flag"], { error: "Choose called or false flag" }),
  note: z.string({ error: "Add a short note on what you found" }).trim().min(5, "Add a short note on what you found (5+ characters)").max(500),
});

/**
 * Counsellors close call tasks. "False flag" is the model being wrong; the
 * mark is kept so the flag is not raised again for 30 days, and so the
 * model can be checked and refit against real outcomes later.
 */
export async function reviewFlag(_: FormState, form: FormData): Promise<FormState> {
  const s = await requireRole("counsellor");
  const parsed = review.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, outcome, note } = parsed.data;
  const res = await db
    .update(schema.riskFlags)
    .set({ status: outcome, reviewNote: note, reviewedBy: s.sub, reviewedAt: new Date().toISOString() })
    .where(and(eq(schema.riskFlags.id, id), eq(schema.riskFlags.status, "open")))
    .returning({ id: schema.riskFlags.id });
  if (!res.length) return { error: "Already reviewed" };
  await audit(s.sub, `risk.${outcome}`, id, { note });
  revalidatePath("/staff", "layout");
  return { ok: outcome === "called" ? "Marked as called" : "Marked as a false flag. It will not be raised again for 30 days." };
}
