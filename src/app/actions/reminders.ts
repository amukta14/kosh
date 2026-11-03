"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { runReminders } from "@/server/engine";
import type { FormState } from "./payments";

export async function runRemindersNow(): Promise<FormState> {
  const s = await requireRole("accounts");
  const today = await getToday();
  const r = await runReminders(today);
  await audit(s.sub, "reminders.run", today, r);
  revalidatePath("/staff/reminders");
  return { ok: r.sent ? `Sent ${r.sent} reminder${r.sent > 1 ? "s" : ""}${r.superseded ? `, skipped ${r.superseded} older steps` : ""}` : "Nothing due today. Every step for today has already gone out." };
}
