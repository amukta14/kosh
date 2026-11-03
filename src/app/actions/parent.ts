"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";

export const CONSENT_VERSION = "DPDP-1";

/** Language choice also changes the language of reminder messages. */
export async function setLanguage(form: FormData) {
  const s = await requireRole("parent");
  const lang = form.get("lang") === "hi" ? "hi" : "en";
  (await cookies()).set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  await db.update(schema.parents).set({ language: lang }).where(eq(schema.parents.id, s.sub));
  const back = String(form.get("back") ?? "/parent");
  redirect(back.startsWith("/parent") ? back : "/parent");
}

export async function giveConsent(form: FormData) {
  const s = await requireRole("parent");
  if (form.get("guardian") !== "yes") redirect("/consent?error=1");
  const at = new Date().toISOString();
  await db.update(schema.parents).set({ consentAt: at, consentVersion: CONSENT_VERSION }).where(eq(schema.parents.id, s.sub));
  // The OTP login is the verification: consent is tied to the phone on record.
  await audit(s.sub, "consent.given", s.sub, { version: CONSENT_VERSION, method: "otp-verified mobile", at });
  redirect("/parent");
}

export async function skipConsent() {
  await requireRole("parent");
  (await cookies()).set("consent_skip", "1", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  redirect("/parent");
}
