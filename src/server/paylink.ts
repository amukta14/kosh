import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Pay links are sent in WhatsApp/SMS and open without a login, so a parent
 * can pay in one tap on a basic phone. The link is an HMAC-signed instalment
 * id: it cannot be guessed or edited, and the page behind it shows only the
 * student's first name, the amount and a pay button.
 */
const sig = (id: string) => createHmac("sha256", `paylink:${env.sessionSecret}`).update(id).digest("base64url").slice(0, 22);

export function payToken(instalmentId: string) {
  return `${Buffer.from(instalmentId).toString("base64url")}.${sig(instalmentId)}`;
}

export function readPayToken(token: string): string | null {
  const [b, s] = token.split(".");
  if (!b || !s) return null;
  let id: string;
  try {
    id = Buffer.from(b, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expect = Buffer.from(sig(id));
  const got = Buffer.from(s);
  return expect.length === got.length && timingSafeEqual(expect, got) ? id : null;
}

export const payUrl = (instalmentId: string) => `${env.appUrl}/p/${payToken(instalmentId)}`;
