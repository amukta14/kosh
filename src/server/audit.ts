import "server-only";
import { db, schema } from "@/db";
import { newId, nowIso } from "./ids";

export async function audit(actor: string, action: string, entity: string, detail: Record<string, unknown> = {}) {
  await db.insert(schema.auditLog).values({ id: newId("aud"), actor, action, entity, detail: JSON.stringify(detail), at: nowIso() });
}
