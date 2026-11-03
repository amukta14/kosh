import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import { SESSION_COOKIE, signSession, verifySession, type Role, type Session } from "@/lib/session-token";

const MAX_AGE = { parent: 60 * 60 * 24 * 14, accounts: 60 * 60 * 10, counsellor: 60 * 60 * 10 } as const;

export async function startSession(s: Session) {
  const token = await signSession(s, env.sessionSecret, MAX_AGE[s.role]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE[s.role],
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const c = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(c, process.env.SESSION_SECRET);
}

/** Use at the top of every page and server action. Middleware is only a first gate. */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(roles.includes("parent") ? "/login" : "/staff/login");
  if (!roles.includes(s.role)) redirect(s.role === "parent" ? "/parent" : "/staff");
  return s;
}

export const STAFF: Role[] = ["accounts", "counsellor"];
