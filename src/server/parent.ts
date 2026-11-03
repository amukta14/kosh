import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Lang } from "@/lib/i18n";
import { requireRole } from "./auth";
import { getToday } from "./clock";
import { loadStudents } from "./queries";

/**
 * Everything a parent page needs. Access control lives here: a parent only
 * ever loads students whose parent_id is their own id from the session.
 */
export async function parentContext(childParam?: string) {
  const s = await requireRole("parent");
  const parent = await db.query.parents.findFirst({ where: eq(schema.parents.id, s.sub) });
  if (!parent) redirect("/login");
  const today = await getToday();
  const kids = await loadStudents(today, { parentId: parent.id });
  if (!kids.length) notFound();
  const current = kids.find((k) => k.student.id === childParam) ?? kids[0];
  const jar = await cookies();
  const lang: Lang = (jar.get("lang")?.value as Lang) ?? parent.language;
  return { parent, kids, current, lang, today, skippedConsent: jar.get("consent_skip")?.value === "1" };
}
