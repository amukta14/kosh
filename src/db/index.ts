import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { client?: Client; db?: LibSQLDatabase<typeof schema> };

function makeClient() {
  return createClient({
    url: process.env.DATABASE_URL ?? "file:./local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
}

export const client = globalForDb.client ?? makeClient();
export const db = globalForDb.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
  globalForDb.db = db;
}

export { schema };
