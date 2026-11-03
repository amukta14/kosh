import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "./env";
import { newId } from "./ids";

const TTL_MIN = 5;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_10_MIN = 3;

const hash = (phone: string, code: string) => createHmac("sha256", `otp:${env.sessionSecret}`).update(`${phone}:${code}`).digest("hex");

/** Accepts 98290 00587, +91 9829000587, 09829000587 and returns 919829000587. */
export function normalisePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  const ten = d.length === 10 ? d : d.length === 11 && d.startsWith("0") ? d.slice(1) : d.length === 12 && d.startsWith("91") ? d.slice(2) : null;
  if (!ten || !/^[6-9]\d{9}$/.test(ten)) return null;
  return `91${ten}`;
}

export type OtpRequest = { ok: true; demoCode?: string } | { ok: false; error: string };

export async function requestOtp(phone: string): Promise<OtpRequest> {
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const recent = await db.select({ id: schema.otpCodes.id }).from(schema.otpCodes).where(and(eq(schema.otpCodes.phone, phone), gt(schema.otpCodes.createdAt, since)));
  if (recent.length >= MAX_SENDS_PER_10_MIN) return { ok: false, error: "Too many codes requested. Please wait 10 minutes." };

  const parent = await db.query.parents.findFirst({ where: eq(schema.parents.phone, phone) });
  // Same response whether or not the number is registered, so the form
  // cannot be used to find out which numbers belong to parents.
  if (!parent) return { ok: true };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(schema.otpCodes).values({
    id: newId("otp"),
    phone,
    codeHash: hash(phone, code),
    expiresAt: new Date(Date.now() + TTL_MIN * 60_000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  // A real deployment sends this by SMS. Demo mode shows it on screen.
  return { ok: true, demoCode: env.demoMode ? code : undefined };
}

export async function verifyOtp(phone: string, code: string) {
  if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "Enter the 6-digit code" };
  const row = await db.query.otpCodes.findFirst({
    where: and(eq(schema.otpCodes.phone, phone), isNull(schema.otpCodes.usedAt), gt(schema.otpCodes.expiresAt, new Date().toISOString())),
    orderBy: desc(schema.otpCodes.createdAt),
  });
  if (!row) return { ok: false as const, error: "Code expired. Ask for a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: "Too many wrong tries. Ask for a new code." };

  const a = Buffer.from(row.codeHash);
  const b = Buffer.from(hash(phone, code));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db.update(schema.otpCodes).set({ attempts: row.attempts + 1 }).where(eq(schema.otpCodes.id, row.id));
    return { ok: false as const, error: `That code is not right. ${MAX_ATTEMPTS - row.attempts - 1} tries left.` };
  }
  await db.update(schema.otpCodes).set({ usedAt: new Date().toISOString() }).where(eq(schema.otpCodes.id, row.id));
  const parent = await db.query.parents.findFirst({ where: eq(schema.parents.phone, phone) });
  if (!parent) return { ok: false as const, error: "Number not found" };
  return { ok: true as const, parent };
}
