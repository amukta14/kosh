import { describe, expect, it } from "vitest";
import { buildLedger } from "@/domain/fees";
import { daysBetween } from "@/domain/dates";
import { scoreRisk, shouldOpenFlag, slope } from "@/domain/risk";

const insts = [
  { id: "i1", seq: 1, dueDate: "2026-04-10", amount: 30000 },
  { id: "i2", seq: 2, dueDate: "2026-07-10", amount: 30000 },
  { id: "i3", seq: 3, dueDate: "2026-10-10", amount: 30000 },
];
const months = (rates: number[]) => rates.map((r, i) => ({ month: `2026-0${4 + i}`, present: Math.round(r * 24), total: 24 }));
const tests = (pcts: number[]) => pcts.map((p, i) => ({ testName: `T${i}`, testDate: `2026-0${5 + i}-15`, score: p * 3, maxScore: 300 }));

describe("dropout risk", () => {
  it("flags a student with unpaid fees, falling attendance and falling scores", () => {
    const l = buildLedger(insts, [{ id: "p", amount: 75000, receivedOn: "2026-10-12" }], "2026-11-02");
    const r = scoreRisk({ instalments: l.instalments, attendance: months([0.95, 0.92, 0.9, 0.7, 0.6]), tests: tests([62, 55, 48, 41]) });
    expect(r.band).toBe("high");
    expect(r.factors.map((f) => f.key)).toContain("attendance_drop");
    expect(r.summary).toMatch(/Likely at risk/);
  });

  it("does not flag a steady student who is paid up", () => {
    const l = buildLedger(insts, [{ id: "p", amount: 90000, receivedOn: "2026-10-01" }], "2026-11-02");
    const r = scoreRisk({ instalments: l.instalments, attendance: months([0.95, 0.94, 0.96, 0.93]), tests: tests([60, 64, 63, 67]) });
    expect(r.band).toBe("low");
    expect(r.factors).toHaveLength(0);
  });

  it("says it is unsure rather than flagging on one signal alone", () => {
    const l = buildLedger(insts, [{ id: "p", amount: 60000, receivedOn: "2026-07-01" }], "2026-11-02");
    const r = scoreRisk({ instalments: l.instalments, attendance: months([0.9, 0.9, 0.9]), tests: [] });
    expect(["watch", "low"]).toContain(r.band);
  });

  it("reports insufficient data instead of guessing", () => {
    const r = scoreRisk({ instalments: [], attendance: months([0.5]), tests: [] });
    expect(r.band).toBe("insufficient");
  });

  it("computes a least-squares slope", () => {
    expect(slope([10, 20, 30])).toBe(10);
    expect(slope([5])).toBe(0);
  });
});

describe("false-flag handling", () => {
  const high = { probability: 0.7, band: "high" as const, factors: [], summary: "" };
  it("does not reopen within 30 days of a false flag", () => {
    expect(shouldOpenFlag({ result: high, today: "2026-11-02", openFlag: false, lastFalseFlag: { reviewedOn: "2026-10-20", probability: 68 }, daysSince: daysBetween })).toBe(false);
  });
  it("reopens if risk grew by 15 points", () => {
    expect(shouldOpenFlag({ result: { ...high, probability: 0.85 }, today: "2026-11-02", openFlag: false, lastFalseFlag: { reviewedOn: "2026-10-20", probability: 65 }, daysSince: daysBetween })).toBe(true);
  });
  it("never duplicates an open task", () => {
    expect(shouldOpenFlag({ result: high, today: "2026-11-02", openFlag: true, lastFalseFlag: null, daysSince: daysBetween })).toBe(false);
  });
});
