"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/server/audit";
import { endSession, startSession } from "@/server/auth";
import { normalisePhone, requestOtp, verifyOtp } from "@/server/otp";

export type OtpState =
  | { step: "phone"; error?: string; phone?: string }
  | { step: "code"; phone: string; display: string; demoCode?: string; error?: string };

export async function otpAction(prev: OtpState, form: FormData): Promise<OtpState> {
  const intent = form.get("intent");
  if (intent === "change") return { step: "phone" };

  if (prev.step === "phone" || intent === "resend") {
    const raw = String(form.get("phone") ?? (prev.step === "code" ? prev.phone : ""));
    const phone = normalisePhone(raw);
    if (!phone) return { step: "phone", phone: raw, error: "Enter a 10-digit Indian mobile number" };
    const r = await requestOtp(phone);
    if (!r.ok) return { step: "phone", phone: raw, error: r.error };
    return { step: "code", phone, display: `+91 ${phone.slice(2, 7)} ${phone.slice(7)}`, demoCode: r.demoCode };
  }

  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  const r = await verifyOtp(prev.phone, code);
  if (!r.ok) return { ...prev, error: r.error };
  await startSession({ sub: r.parent.id, role: "parent", name: r.parent.name });
  await audit(r.parent.id, "parent.login", r.parent.id, { method: "otp" });
  redirect("/parent");
}

const staffSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export async function staffLoginAction(_: { error?: string } | null, form: FormData) {
  const parsed = staffSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Enter your work email and password" };
  const user = await db.query.staff.findFirst({ where: eq(schema.staff.email, parsed.data.email) });
  // Compare against a dummy hash when the user is missing, so timing does not reveal valid emails.
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.9xD8l7zfRfFQ0vQ8N6F7xYHqO7tu");
  if (!user || !ok) return { error: "Email or password is not right" };
  await startSession({ sub: user.id, role: user.role, name: user.name });
  await audit(user.id, "staff.login", user.id);
  redirect(user.role === "counsellor" ? "/staff/risk" : "/staff");
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}
