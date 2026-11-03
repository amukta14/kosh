import "server-only";
import { db, schema } from "@/db";
import { newId, nowIso } from "./ids";

type Exec = Pick<typeof db, "insert">;

/** Pass the transaction as `exec` when called inside one, so the audit row commits or rolls back with it. */
export async function audit(actor: string, action: string, entity: string, detail: Record<string, unknown> = {}, exec: Exec = db) {
  await exec.insert(schema.auditLog).values({ id: newId("aud"), actor, action, entity, detail: JSON.stringify(detail), at: nowIso() });
}
