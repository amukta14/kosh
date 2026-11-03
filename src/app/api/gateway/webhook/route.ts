import { NextResponse, type NextRequest } from "next/server";
import { processGatewayEvent } from "@/server/payments";

/** Gateway callback. Body must be signed: X-Signature = hex HMAC-SHA256(body, GATEWAY_WEBHOOK_SECRET). */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 10_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const res = await processGatewayEvent(raw, req.headers.get("x-signature") ?? "");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res);
}
