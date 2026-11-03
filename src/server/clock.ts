import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isIsoDate } from "@/domain/dates";

/**
 * The business date. In demo mode it is stored in the DB so a reviewer can
 * move time forward and watch reminders fire and stop. Outside demo mode it
 * is the real date in India.
 */
export const DEFAULT_DEMO_DATE = "2026-11-02";

export function realToday(): string {
  // India has no DST; IST is UTC+5:30.
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

export async function getToday(): Promise<string> {
  if (process.env.DEMO_MODE !== "true") return realToday();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, "clock") });
  return row && isIsoDate(row.value) ? row.value : DEFAULT_DEMO_DATE;
}

export async function setToday(date: string) {
  if (!isIsoDate(date)) throw new Error("Bad date");
  await db
    .insert(schema.settings)
    .values({ key: "clock", value: date })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: date } });
}
