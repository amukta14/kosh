import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Pay links go out in WhatsApp/SMS and open without a login, so a parent can
 * pay in one tap on a basic phone. The link carries an HMAC-signed instalment
 * id: it cannot be guessed or edited, and the page behind it shows only the
 * student's first name, the amount and a pay button.
 */
function sig(scope: string, id: string) {
  return createHmac("sha256", `${scope}:${env.sessionSecret}`).update(id).digest("base64url").slice(0, 22);
}

export function signedToken(scope: string, id: string) {
  return `${Buffer.from(id).toString("base64url")}.${sig(scope, id)}`;
}

export function readSignedToken(scope: string, token: string): string | null {
  const [b, s] = token.split(".");
  if (!b || !s) return null;
  const id = Buffer.from(b, "base64url").toString("utf8");
  const want = Buffer.from(sig(scope, id));
  const got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

export const payToken = (instalmentId: string) => signedToken("pay", instalmentId);
export const readPayToken = (token: string) => readSignedToken("pay", token);
export const payUrl = (instalmentId: string) => `${env.appUrl}/p/${payToken(instalmentId)}`;

export const receiptKey = (paymentId: string) => sig("receipt", paymentId);
export function validReceiptKey(paymentId: string, key: string) {
  const want = Buffer.from(receiptKey(paymentId));
  const got = Buffer.from(key);
  return want.length === got.length && timingSafeEqual(want, got);
}
