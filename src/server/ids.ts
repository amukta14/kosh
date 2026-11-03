import { randomBytes } from "node:crypto";

export const newId = (prefix: string) => `${prefix}_${randomBytes(8).toString("hex")}`;
export const nowIso = () => new Date().toISOString();
