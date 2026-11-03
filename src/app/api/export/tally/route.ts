import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { buildReceiptsCsv, buildTallyXml } from "@/domain/tally";
import { audit } from "@/server/audit";
import { getSession } from "@/server/auth";

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== "accounts") return new NextResponse("Not allowed", { status: 403 });
  const month = req.nextUrl.searchParams.get("month") ?? "";
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xml";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return new NextResponse("Bad month", { status: 400 });

  const rows = await db
    .select({ p: schema.payments, st: schema.students, c: schema.centres })
    .from(schema.payments)
    .innerJoin(schema.students, eq(schema.payments.studentId, schema.students.id))
    .innerJoin(schema.batches, eq(schema.students.batchId, schema.batches.id))
    .innerJoin(schema.centres, eq(schema.batches.centreId, schema.centres.id))
    .where(and(gte(schema.payments.receivedOn, `${month}-01`), lte(schema.payments.receivedOn, `${month}-31`)))
    .orderBy(schema.payments.receivedOn, schema.payments.receiptNo);

  const receipts = rows.map(({ p, st, c }) => ({ receiptNo: p.receiptNo, date: p.receivedOn, studentId: st.id, studentName: st.name, centre: c.name, method: p.method, reference: p.reference, amount: p.amount }));
  await audit(s.sub, "export.tally", month, { format, rows: receipts.length });

  const body = format === "csv" ? buildReceiptsCsv(receipts) : buildTallyXml(receipts);
  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="kosh-receipts-${month}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
