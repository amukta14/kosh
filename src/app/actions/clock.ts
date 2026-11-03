"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "@/domain/dates";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { getToday, setToday } from "@/server/clock";
import { runReminders, runRisk } from "@/server/engine";
import { seedDatabase } from "@/server/seed";

export type ClockState = { message?: string; error?: string } | null;

/** Demo only: moves the business date forward and runs the daily jobs for each day passed. */
export async function advanceClock(_: ClockState, form: FormData): Promise<ClockState> {
  const s = await requireRole("accounts", "counsellor");
  if (process.env.DEMO_MODE !== "true") return { error: "The clock only moves in demo mode" };
  const days = Number(form.get("days"));
  if (form.get("reset") === "1") {
    await seedDatabase();
    await audit(s.sub, "demo.reset", "db");
    revalidatePath("/", "layout");
    return { message: "Demo data reset to 2 Nov 2026" };
  }
  if (![1, 7].includes(days)) return { error: "Bad step" };
  let date = await getToday();
  let sent = 0;
  let opened = 0;
  for (let i = 0; i < days; i++) {
    date = addDays(date, 1);
    await setToday(date);
    sent += (await runReminders(date)).sent;
    opened += (await runRisk(date)).opened;
  }
  await audit(s.sub, "demo.clock", date, { days, sent, opened });
  revalidatePath("/", "layout");
  return { message: `${sent} reminder${sent === 1 ? "" : "s"} sent, ${opened} call task${opened === 1 ? "" : "s"} opened` };
}
