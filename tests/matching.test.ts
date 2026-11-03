import { describe, expect, it } from "vitest";
import { extractStudentId, matchIncoming } from "@/domain/matching";

const cands = [
  { id: "STU-0587", name: "Ishita Sharma", parentName: "Rakesh Sharma", balance: 45000, nextDue: 15000 },
  { id: "STU-0219", name: "Mohit Gurjar", parentName: "Suresh Gurjar", balance: 40000, nextDue: 40000 },
  { id: "STU-0412", name: "Aarav Meena", parentName: "Kavita Meena", balance: 30000, nextDue: 30000 },
];

describe("payment matching", () => {
  it("reads student IDs written in different ways", () => {
    expect(extractStudentId("NEFT/FEE STU0587 OCT")).toBe("STU-0587");
    expect(extractStudentId("stu-0219")).toBe("STU-0219");
    expect(extractStudentId("STU_0412")).toBe("STU-0412");
    expect(extractStudentId("fees oct")).toBe(null);
  });

  it("auto-matches on a valid ID within the balance", () => {
    expect(matchIncoming({ amount: 15000, reference: "FEE STU0587", payerName: "R SHARMA" }, cands).kind).toBe("auto");
  });

  it("queues an overpayment instead of guessing", () => {
    const r = matchIncoming({ amount: 50000, reference: "STU-0587", payerName: "R SHARMA" }, cands);
    expect(r.kind).toBe("queue");
  });

  it("queues an unknown ID", () => {
    const r = matchIncoming({ amount: 15000, reference: "STU-9999", payerName: "X" }, cands);
    expect(r.kind).toBe("queue");
    expect(r.kind === "queue" && r.reason).toMatch(/not on our rolls/);
  });

  it("queues no-reference payments with suggestions, never auto-applying them", () => {
    const r = matchIncoming({ amount: 40000, reference: "school fees", payerName: "SURESH GURJAR" }, cands);
    expect(r.kind).toBe("queue");
    if (r.kind === "queue") expect(r.suggestions[0].studentId).toBe("STU-0219");
  });

  it("rejects non-integer amounts", () => {
    expect(matchIncoming({ amount: 100.5, reference: "STU-0587", payerName: "" }, cands).kind).toBe("queue");
  });
});
