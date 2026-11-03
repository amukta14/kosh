import { describe, expect, it } from "vitest";
import { calculateRefund, RefundError } from "@/domain/refund";

const base = {
  courseStart: "2026-04-06",
  courseEnd: "2027-03-31", // 360 days inclusive
  enrolledOn: "2026-04-06",
  netFee: 120000,
  totalPaid: 90000,
  leaveDate: "2026-11-01",
  requestDate: "2026-11-02",
  materialDeduction: 0,
};

describe("pro-rata refund", () => {
  it("charges only the days used and refunds the rest of what was paid", () => {
    const r = calculateRefund(base);
    expect(r.totalDays).toBe(360);
    expect(r.daysUsed).toBe(210);
    expect(r.feeForDaysUsed).toBe(70000); // 120000 * 210 / 360
    expect(r.refund).toBe(20000);
    expect(r.shortfall).toBe(0);
  });

  it("sets the deadline 10 days after the written request", () => {
    expect(calculateRefund(base).deadline).toBe("2026-11-12");
  });

  it("counts from the joining date for late joiners", () => {
    const r = calculateRefund({ ...base, enrolledOn: "2026-06-01", netFee: 100000 });
    expect(r.periodStart).toBe("2026-06-01");
    expect(r.totalDays).toBe(304);
  });

  it("refunds everything if the student leaves before starting", () => {
    const r = calculateRefund({ ...base, leaveDate: "2026-04-01", requestDate: "2026-04-01" });
    expect(r.daysUsed).toBe(0);
    expect(r.refund).toBe(90000);
  });

  it("never goes negative, and records the shortfall", () => {
    const r = calculateRefund({ ...base, totalPaid: 30000 });
    expect(r.refund).toBe(0);
    expect(r.shortfall).toBe(40000);
  });

  it("deducts unreturned study material", () => {
    expect(calculateRefund({ ...base, materialDeduction: 4500 }).refund).toBe(15500);
  });

  it("uses the discounted net fee, not the gross fee", () => {
    const r = calculateRefund({ ...base, netFee: 108000, totalPaid: 81000 });
    expect(r.feeForDaysUsed).toBe(63000);
    expect(r.refund).toBe(18000);
  });

  it("caps days used at the course length", () => {
    const r = calculateRefund({ ...base, leaveDate: "2027-05-01", requestDate: "2027-05-01", totalPaid: 120000 });
    expect(r.daysUsed).toBe(360);
    expect(r.refund).toBe(0);
  });

  it("issues a GST credit note that adds back to the refund", () => {
    const { creditNote: c } = calculateRefund(base);
    expect(c.taxable + c.cgst + c.sgst).toBeCloseTo(20000, 2);
    expect(c.taxable).toBeCloseTo(16949.15, 2);
  });

  it("rejects bad input", () => {
    expect(() => calculateRefund({ ...base, leaveDate: "2026-13-01" })).toThrow(RefundError);
    expect(() => calculateRefund({ ...base, requestDate: "2026-10-01" })).toThrow(/before the last day/);
    expect(() => calculateRefund({ ...base, materialDeduction: -1 })).toThrow(RefundError);
    expect(() => calculateRefund({ ...base, materialDeduction: 20000 })).toThrow(/manual review/);
    expect(() => calculateRefund({ ...base, totalPaid: 10.5 })).toThrow(RefundError);
  });
});
