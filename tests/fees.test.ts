import { describe, expect, it } from "vitest";
import { applyDiscount, buildLedger, splitInstalments, statusLabel } from "@/domain/fees";

const jee = [
  { id: "i1", seq: 1, dueDate: "2026-04-10", amount: 30000 },
  { id: "i2", seq: 2, dueDate: "2026-07-10", amount: 30000 },
  { id: "i3", seq: 3, dueDate: "2026-10-10", amount: 30000 },
  { id: "i4", seq: 4, dueDate: "2027-01-10", amount: 30000 },
];
const TODAY = "2026-11-02";

describe("sample data from the brief", () => {
  it("STU-0412 Aarav: paid", () => {
    const l = buildLedger(jee, [
      { id: "p1", amount: 30000, receivedOn: "2026-04-08" },
      { id: "p2", amount: 30000, receivedOn: "2026-07-09" },
      { id: "p3", amount: 30000, receivedOn: "2026-10-09" },
    ], TODAY);
    expect(l.instalments[2].status).toBe("paid");
    expect(statusLabel(l.instalments[2])).toBe("Paid");
    expect(l.next?.seq).toBe(4);
  });

  it("STU-0587 Ishita: part paid, 23 days overdue", () => {
    const l = buildLedger(jee, [
      { id: "p1", amount: 30000, receivedOn: "2026-04-10" },
      { id: "p2", amount: 30000, receivedOn: "2026-07-15" },
      { id: "p3", amount: 15000, receivedOn: "2026-10-12" },
    ], TODAY);
    const oct = l.instalments[2];
    expect(oct.paid).toBe(15000);
    expect(oct.balance).toBe(15000);
    expect(oct.daysOverdue).toBe(23);
    expect(statusLabel(oct)).toBe("Part paid, 23 days overdue");
    expect(l.overdue).toBe(15000);
  });

  it("STU-0219 Mohit: due in 13 days", () => {
    const neet = [
      { id: "n1", seq: 1, dueDate: "2026-04-15", amount: 40000 },
      { id: "n2", seq: 2, dueDate: "2026-08-14", amount: 40000 },
      { id: "n3", seq: 3, dueDate: "2026-11-15", amount: 40000 },
    ];
    const l = buildLedger(neet, [
      { id: "p1", amount: 40000, receivedOn: "2026-04-15" },
      { id: "p2", amount: 40000, receivedOn: "2026-08-10" },
    ], TODAY);
    expect(statusLabel(l.instalments[2])).toBe("Due in 13 days");
    expect(l.overdue).toBe(0);
    expect(l.dueNow).toBe(0);
  });
});

describe("allocation rules", () => {
  it("applies payments oldest-first across instalments", () => {
    const l = buildLedger(jee, [{ id: "p", amount: 45000, receivedOn: "2026-04-01" }], TODAY);
    expect(l.instalments[0].balance).toBe(0);
    expect(l.instalments[1].paid).toBe(15000);
    expect(l.instalments[1].status).toBe("overdue");
  });

  it("holds overpayment as credit instead of losing it", () => {
    const l = buildLedger(jee, [{ id: "p", amount: 125000, receivedOn: "2026-04-01" }], TODAY);
    expect(l.balance).toBe(0);
    expect(l.credit).toBe(5000);
  });

  it("records the date and lateness of the payment that cleared an instalment", () => {
    const l = buildLedger(jee, [
      { id: "a", amount: 10000, receivedOn: "2026-04-05" },
      { id: "b", amount: 20000, receivedOn: "2026-06-20" },
    ], TODAY);
    expect(l.instalments[0].paidOn).toBe("2026-06-20");
    expect(l.instalments[0].paidLateBy).toBe(71);
  });

  it("is due today on the due date, overdue the day after", () => {
    expect(buildLedger(jee, [], "2026-04-10").instalments[0].status).toBe("due_today");
    expect(buildLedger(jee, [], "2026-04-11").instalments[0].daysOverdue).toBe(1);
  });

  it("ignores zero and negative payments", () => {
    const l = buildLedger(jee, [{ id: "z", amount: 0, receivedOn: "2026-04-01" }, { id: "n", amount: -500, receivedOn: "2026-04-01" }], TODAY);
    expect(l.totalPaid).toBe(0);
  });
});

describe("plans and discounts", () => {
  it("splits so the parts always sum to the net fee", () => {
    for (const [fee, n] of [[120000, 4], [108000, 3], [99999, 4], [101350, 3]] as const) {
      const parts = splitInstalments(fee, n);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(fee);
      expect(parts.length).toBe(n);
    }
    expect(splitInstalments(99999, 4)).toEqual([24900, 24900, 24900, 25299]);
  });

  it("applies percentage and flat discounts and rejects bad ones", () => {
    expect(applyDiscount(120000, "percent", 10)).toBe(108000);
    expect(applyDiscount(120000, "flat", 15000)).toBe(105000);
    expect(applyDiscount(120000, "none", 99)).toBe(120000);
    expect(() => applyDiscount(120000, "percent", 120)).toThrow();
    expect(() => applyDiscount(120000, "flat", 130000)).toThrow();
    expect(() => applyDiscount(120000, "flat", -1)).toThrow();
  });
});
