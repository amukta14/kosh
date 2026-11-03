import { describe, expect, it } from "vitest";
import { gstSplit, inr, inrCompact } from "@/domain/money";
import { validateAttendance, validateScores, parseCsv } from "@/domain/csv";
import { buildReceiptsCsv, buildTallyXml } from "@/domain/tally";
import { addToRollup, bucketOf, emptyRollup, late60Share } from "@/domain/dues";
import { buildLedger } from "@/domain/fees";

describe("money", () => {
  it("formats rupees the Indian way", () => {
    expect(inr(120000)).toBe("₹1,20,000");
    expect(inrCompact(31_20_00_000)).toBe("₹31.20Cr");
  });
  it("GST parts always add back to the total", () => {
    for (const a of [1, 99, 15000, 30000, 33333]) {
      const g = gstSplit(a);
      expect(Math.round((g.taxable + g.cgst + g.sgst) * 100)).toBe(a * 100);
    }
    expect(gstSplit(30000)).toMatchObject({ taxable: 25423.73, cgst: 2288.13, sgst: 2288.14 });
  });
});

describe("csv uploads", () => {
  const roster = new Set(["STU-0587", "STU-0412"]);
  it("parses quoted cells", () => {
    expect(parseCsv('a,"b,c","d""e"\n1,2,3')).toEqual([["a", "b,c", 'd"e'], ["1", "2", "3"]]);
  });
  it("accepts a clean attendance file", () => {
    const r = validateAttendance("student_id,month,present,total\nSTU-0587,2026-10,18,24\nstu-0412,2026-10,22,24\n", roster);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(2);
  });
  it("reports each bad row with its line number", () => {
    const r = validateAttendance("student_id,month,present,total\nSTU-0001,2026-10,1,2\nSTU-0587,Oct,1,2\nSTU-0587,2026-10,30,24\n", roster);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4]);
  });
  it("rejects a file with a missing column", () => {
    expect(validateScores("student_id,score\nSTU-0587,5", roster).errors[0].message).toMatch(/Missing column/);
  });
});

describe("tally export", () => {
  const row = { receiptNo: "CA/26-27/0001", date: "2026-10-12", studentId: "STU-0587", studentName: "Ishita <Sharma>", centre: "Gopalpura", method: "gateway", reference: "ord_1", amount: 15000 };
  it("produces balanced vouchers and escapes text", () => {
    const xml = buildTallyXml([row]);
    expect(xml).toContain("<DATE>20261012</DATE>");
    expect(xml).toContain("Ishita &lt;Sharma&gt;");
    expect(xml).toContain("<AMOUNT>-15000.00</AMOUNT>");
  });
  it("guards CSV against formula injection", () => {
    expect(buildReceiptsCsv([{ ...row, reference: "=HYPERLINK(1)" }])).toContain("'=HYPERLINK(1)");
  });
});

describe("ageing and the 60-day metric", () => {
  it("buckets days overdue", () => {
    expect(bucketOf(0)).toBe(null);
    expect(bucketOf(30)).toBe("b0");
    expect(bucketOf(61)).toBe("b60");
    expect(bucketOf(200)).toBe("b90");
  });
  it("counts value that arrived more than 60 days late", () => {
    const insts = [{ id: "a", seq: 1, dueDate: "2026-04-10", amount: 30000 }, { id: "b", seq: 2, dueDate: "2026-07-10", amount: 30000 }];
    const l = buildLedger(insts, [{ id: "p", amount: 30000, receivedOn: "2026-04-10" }, { id: "q", amount: 30000, receivedOn: "2026-10-01" }], "2026-11-02");
    const r = addToRollup(emptyRollup(), l, "2026-11-02");
    expect(r.late60Base).toBe(60000);
    expect(r.late60Value).toBe(30000);
    expect(late60Share(r)).toBe(0.5);
  });
});
