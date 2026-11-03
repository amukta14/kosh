import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/session-token";
import { payToken, payUrl, readPayToken, receiptKey, validReceiptKey } from "@/server/paylink";
import { normalisePhone } from "@/server/otp";

const SECRET = process.env.SESSION_SECRET!;

describe("sessions", () => {
  it("round-trips a signed session", async () => {
    const t = await signSession({ sub: "par-0587", role: "parent", name: "Rakesh" }, SECRET, 60);
    expect(await verifySession(t, SECRET)).toMatchObject({ sub: "par-0587", role: "parent" });
  });
  it("rejects a token signed with another secret", async () => {
    const t = await signSession({ sub: "st-neha", role: "accounts", name: "x" }, "another-secret-another-secret-12345", 60);
    expect(await verifySession(t, SECRET)).toBeNull();
  });
  it("rejects a parent token edited to claim the accounts role", async () => {
    const t = await signSession({ sub: "par-0587", role: "parent", name: "x" }, SECRET, 60);
    const [h, p, s] = t.split(".");
    const body = JSON.parse(Buffer.from(p, "base64url").toString());
    body.role = "accounts";
    const forged = [h, Buffer.from(JSON.stringify(body)).toString("base64url"), s].join(".");
    expect(await verifySession(forged, SECRET)).toBeNull();
  });
  it("rejects expired, empty and junk tokens", async () => {
    const t = await signSession({ sub: "a", role: "parent", name: "x" }, SECRET, -10);
    expect(await verifySession(t, SECRET)).toBeNull();
    expect(await verifySession(undefined, SECRET)).toBeNull();
    expect(await verifySession("abc.def.ghi", SECRET)).toBeNull();
  });
});

describe("pay links", () => {
  it("opens only for the signed instalment", () => {
    const t = payToken("STU-0587-I3");
    expect(readPayToken(t)).toBe("STU-0587-I3");
    expect(payUrl("STU-0587-I3")).toMatch(/^https:\/\/kosh\.test\/p\//);
  });
  it("rejects an edited instalment id", () => {
    const [, sig] = payToken("STU-0587-I3").split(".");
    const other = Buffer.from("STU-0412-I3").toString("base64url");
    expect(readPayToken(`${other}.${sig}`)).toBeNull();
    expect(readPayToken("nonsense")).toBeNull();
  });
  it("receipt keys cannot be reused across payments", () => {
    expect(validReceiptKey("pay_1", receiptKey("pay_1"))).toBe(true);
    expect(validReceiptKey("pay_2", receiptKey("pay_1"))).toBe(false);
  });
});

describe("phone input", () => {
  it("accepts common Indian formats", () => {
    for (const p of ["98290 00587", "+91 98290 00587", "09829000587", "919829000587"]) expect(normalisePhone(p)).toBe("919829000587");
  });
  it("rejects non-mobile and malformed numbers", () => {
    for (const p of ["12345", "0141 2700000", "5829000587", "abc", ""]) expect(normalisePhone(p)).toBeNull();
  });
});
