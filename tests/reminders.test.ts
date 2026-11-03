import { describe, expect, it } from "vitest";
import { decideReminders, renderReminder } from "@/domain/reminders";

const inst = { dueDate: "2026-10-10", balance: 15000 };

describe("reminder schedule", () => {
  it("sends the 7-day-before reminder exactly on that day", () => {
    expect(decideReminders(inst, "2026-10-03", new Map()).send).toBe(-7);
    expect(decideReminders(inst, "2026-10-02", new Map()).send).toBe(null);
  });

  it("sends on the due date and after", () => {
    const done = new Map<number, "sent">([[-7, "sent"], [-3, "sent"]]);
    expect(decideReminders(inst, "2026-10-10", done).send).toBe(0);
  });

  it("sends only the latest missed step, never a burst", () => {
    const d = decideReminders(inst, "2026-10-18", new Map());
    expect(d.send).toBe(7);
    expect(d.supersede).toEqual([-7, -3, 0, 3]);
  });

  it("does not resend a step", () => {
    const done = new Map<number, "sent">([[-7, "sent"], [-3, "sent"], [0, "sent"], [3, "sent"], [7, "sent"], [15, "sent"]]);
    expect(decideReminders(inst, "2026-11-02", done).send).toBe(null);
  });

  it("stops and cancels the rest the moment the balance is zero", () => {
    const d = decideReminders({ ...inst, balance: 0 }, "2026-10-18", new Map([[-7, "sent"]]));
    expect(d.send).toBe(null);
    expect(d.plan.filter((p) => p.state === "cancelled")).toHaveLength(6);
    expect(d.plan[0].state).toBe("sent");
  });
});

describe("reminder text", () => {
  const v = { studentName: "Ishita Sharma", seq: 3, amount: 15000, dueDate: "2026-10-10", offset: 15, link: "https://x/p/abc" };
  it("writes Hindi and English, with the balance and link", () => {
    expect(renderReminder("en", v)).toContain("₹15,000");
    expect(renderReminder("en", v)).toContain("https://x/p/abc");
    expect(renderReminder("hi", v)).toContain("नमस्ते, Ishita");
    expect(renderReminder("hi", { ...v, offset: 0 })).toContain("आज देय");
  });
  it("contains no em dashes", () => {
    for (const o of [-7, 0, 7]) for (const l of ["en", "hi"] as const) expect(renderReminder(l, { ...v, offset: o })).not.toContain("—");
  });
});
