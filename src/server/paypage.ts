import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import type { Lang } from "@/lib/i18n";
import { getToday } from "./clock";
import { readPayToken } from "./paylink";
import { loadStudent } from "./queries";

export async function payContext(token: string) {
  const instId = readPayToken(decodeURIComponent(token));
  if (!instId) notFound();
  const inst = await db.query.instalments.findFirst({ where: eq(schema.instalments.id, instId) });
  if (!inst) notFound();
  const view = await loadStudent(await getToday(), inst.studentId);
  const state = view?.ledger.instalments.find((i) => i.id === instId);
  if (!view || !state) notFound();
  const lang: Lang = ((await cookies()).get("lang")?.value as Lang) ?? view.parent.language;
  return { view, state, lang, token: decodeURIComponent(token) };
}
