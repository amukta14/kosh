import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getToday } from "@/server/clock";
import { runReminders, runRisk } from "@/server/engine";

/** Daily job (Vercel Cron, 08:30 IST): send reminders, then refresh risk flags. */
export async function GET(req: NextRequest) {
  const want = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  if (!process.env.CRON_SECRET || want.length !== got.length || !timingSafeEqual(want, got)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const today = await getToday();
  const reminders = await runReminders(today);
  const risk = await runRisk(today);
  return NextResponse.json({ today, reminders, risk });
}
