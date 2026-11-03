// Shared by middleware (edge) and server code. No Node-only imports here.
import { jwtVerify, SignJWT } from "jose";

export type Role = "parent" | "accounts" | "counsellor";
export interface Session {
  sub: string; // parent id or staff id
  role: Role;
  name: string;
}

export const SESSION_COOKIE = "kosh_session";

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signSession(s: Session, secret: string, maxAgeSec: number) {
  return new SignJWT({ role: s.role, name: s.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret: string | undefined): Promise<Session | null> {
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    const role = payload.role;
    if (role !== "parent" && role !== "accounts" && role !== "counsellor") return null;
    return { sub: String(payload.sub), role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
