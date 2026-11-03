import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, daysBetween } from "@/domain/dates";
import { applyDiscount, buildLedger, splitInstalments, type Payment } from "@/domain/fees";
import { decideReminders, renderReminder } from "@/domain/reminders";
import { DEFAULT_DEMO_DATE, setToday } from "./clock";
import { runRisk } from "./engine";
import { payUrl } from "./paylink";
import { recordPayment } from "./payments";

// Deterministic PRNG so every reseed gives the same school.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261102);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

const BOYS = ["Aarav", "Vivaan", "Kabir", "Arjun", "Yash", "Dev", "Rohan", "Ishaan", "Pranav", "Harsh", "Kunal", "Tanmay", "Lakshya", "Parth", "Aditya", "Nikhil", "Raghav", "Shaurya", "Mohit", "Ayush"];
const GIRLS = ["Ishita", "Ananya", "Diya", "Kavya", "Riya", "Saanvi", "Tanvi", "Nandini", "Priya", "Aditi", "Khushi", "Mahi", "Pooja", "Sneha", "Vidhi", "Jhanvi", "Muskan", "Avni", "Tanya", "Charvi"];
const SURNAMES = ["Sharma", "Meena", "Gurjar", "Jain", "Agarwal", "Rathore", "Choudhary", "Saini", "Yadav", "Khandelwal", "Mathur", "Joshi", "Shekhawat", "Bhati", "Kumawat", "Verma", "Gupta", "Soni", "Pareek", "Mittal"];
const PARENT_M = ["Rakesh", "Suresh", "Mahesh", "Rajendra", "Anil", "Sunil", "Vinod", "Manoj", "Ashok", "Dinesh", "Pradeep", "Sanjay"];
const PARENT_F = ["Kavita", "Sunita", "Anita", "Rekha", "Seema", "Neelam", "Meena", "Pushpa", "Asha", "Lata"];

const CENTRES = [
  { id: "c-gop", name: "Gopalpura", address: "Gopalpura Bypass, Jaipur 302018" },
  { id: "c-man", name: "Mansarovar", address: "Shipra Path, Mansarovar, Jaipur 302020" },
  { id: "c-vai", name: "Vaishali Nagar", address: "Amrapali Marg, Vaishali Nagar, Jaipur 302021" },
  { id: "c-raj", name: "Raja Park", address: "Govind Marg, Raja Park, Jaipur 302004" },
];
const COURSE_START = "2026-04-06";
const COURSE_END = "2027-03-31";
const PLAN = {
  JEE: ["2026-04-10", "2026-07-10", "2026-10-10", "2027-01-10"],
  NEET: ["2026-04-15", "2026-08-14", "2026-11-15"],
} as const;
const GROSS = 120000;
const MONTHS = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

type Profile = "punctual" | "slow" | "very_late" | "struggling" | "partial";

interface SeedStudent {
  id: string;
  name: string;
  batchId: string;
  course: "JEE" | "NEET";
  parentId: string;
  enrolledOn: string;
  profile: Profile;
  discount: { type: "none" | "percent" | "flat"; value: number; reason: string | null };
  /** Fixed payments (for the brief's sample students). */
  payments?: { seq?: number; amount: number; on: string; method: "gateway" | "upi" | "neft" | "cash" }[];
  attendance?: number[]; // monthly rates
  tests?: number[]; // percentages
}

export async function wipe() {
  // Children first.
  for (const t of [
    schema.auditLog, schema.otpCodes, schema.refunds, schema.riskFlags, schema.testScores, schema.attendance,
    schema.reminders, schema.unmatchedPayments, schema.gatewayOrders, schema.payments, schema.instalments,
    schema.feePlans, schema.students, schema.parents, schema.batches, schema.centres, schema.staff, schema.settings,
  ]) {
    await db.delete(t);
  }
}

export async function seedDatabase(today = DEFAULT_DEMO_DATE) {
  await wipe();
  await setToday(today);
  await db.insert(schema.centres).values(CENTRES);

  const batches = CENTRES.flatMap((c) =>
    (["JEE", "NEET"] as const).flatMap((course) =>
      (["Morning", "Evening"] as const).map((slot) => ({
        id: `b-${c.id.slice(2)}-${course.toLowerCase()}-${slot[0].toLowerCase()}`,
        centreId: c.id,
        name: `${course} 2027 ${slot}`,
        course,
        startDate: COURSE_START,
        endDate: COURSE_END,
      })),
    ),
  );
  await db.insert(schema.batches).values(batches);

  const hash = await bcrypt.hash("kosh-demo-2026", 10);
  await db.insert(schema.staff).values([
    { id: "st-neha", name: "Neha Agarwal", email: "neha@companya.test", passwordHash: hash, role: "accounts" },
    { id: "st-ramesh", name: "Ramesh Jain", email: "ramesh@companya.test", passwordHash: hash, role: "accounts" },
    { id: "st-vikram", name: "Vikram Rathore", email: "vikram@companya.test", passwordHash: hash, role: "counsellor" },
  ]);

  // ---- Parents and students --------------------------------------------
  const parents: (typeof schema.parents.$inferInsert)[] = [
    { id: "par-0587", name: "Rakesh Sharma", phone: "919829000587", language: "hi", consentAt: null },
    { id: "par-0412", name: "Kavita Meena", phone: "919829000412", language: "en", consentAt: "2026-04-02T10:12:00.000Z", consentVersion: "DPDP-1" },
    { id: "par-0219", name: "Suresh Gurjar", phone: "919829000219", language: "hi", consentAt: "2026-04-03T09:40:00.000Z", consentVersion: "DPDP-1" },
  ];
  const students: SeedStudent[] = [
    {
      id: "STU-0412", name: "Aarav Meena", batchId: "b-gop-jee-m", course: "JEE", parentId: "par-0412", enrolledOn: "2026-04-02", profile: "punctual",
      discount: { type: "none", value: 0, reason: null },
      payments: [{ amount: 30000, on: "2026-04-08", method: "gateway" }, { amount: 30000, on: "2026-07-09", method: "gateway" }, { amount: 30000, on: "2026-10-09", method: "upi" }],
      attendance: [0.96, 0.95, 0.97, 0.94, 0.96, 0.95, 0.97], tests: [61, 64, 66, 70, 72, 74],
    },
    {
      id: "STU-0587", name: "Ishita Sharma", batchId: "b-gop-jee-e", course: "JEE", parentId: "par-0587", enrolledOn: "2026-04-04", profile: "struggling",
      discount: { type: "none", value: 0, reason: null },
      payments: [{ amount: 30000, on: "2026-04-10", method: "cash" }, { amount: 30000, on: "2026-07-21", method: "neft" }, { amount: 15000, on: "2026-10-12", method: "gateway" }],
      attendance: [0.94, 0.92, 0.9, 0.86, 0.78, 0.66, 0.58], tests: [63, 60, 55, 49, 44, 38],
    },
    {
      id: "STU-0219", name: "Mohit Gurjar", batchId: "b-gop-neet-m", course: "NEET", parentId: "par-0219", enrolledOn: "2026-04-06", profile: "punctual",
      discount: { type: "none", value: 0, reason: null },
      payments: [{ amount: 40000, on: "2026-04-14", method: "upi" }, { amount: 40000, on: "2026-08-12", method: "gateway" }],
      attendance: [0.92, 0.9, 0.93, 0.91, 0.89, 0.92, 0.9], tests: [58, 57, 61, 60, 63, 62],
    },
    // A sibling, so the parent portal handles more than one child.
    {
      id: "STU-0413", name: "Diya Meena", batchId: "b-man-neet-e", course: "NEET", parentId: "par-0412", enrolledOn: "2026-04-06", profile: "punctual",
      discount: { type: "percent", value: 10, reason: "Sibling concession" },
      payments: [{ amount: 36000, on: "2026-04-15", method: "gateway" }, { amount: 36000, on: "2026-08-14", method: "gateway" }],
      attendance: [0.9, 0.93, 0.91, 0.94, 0.9, 0.92, 0.93], tests: [55, 58, 60, 59, 62, 65],
    },
  ];

  const taken = new Set(students.map((s) => s.id));
  let n = 100;
  for (const b of batches) {
    const count = between(10, 13);
    for (let k = 0; k < count; k++) {
      do n += between(1, 9);
      while (taken.has(`STU-${String(n).padStart(4, "0")}`));
      const id = `STU-${String(n).padStart(4, "0")}`;
      taken.add(id);
      const girl = rand() < 0.45;
      const surname = pick(SURNAMES);
      const pid = `par-${id.slice(4)}`;
      const r = rand();
      const profile: Profile = r < 0.55 ? "punctual" : r < 0.77 ? "slow" : r < 0.87 ? "very_late" : r < 0.94 ? "partial" : "struggling";
      const d = rand();
      const discount =
        d < 0.12 ? { type: "percent" as const, value: pick([10, 15, 20, 25]), reason: "Merit scholarship (entrance test)" }
        : d < 0.18 ? { type: "flat" as const, value: pick([6000, 10000, 12000]), reason: "Early-bird admission" }
        : { type: "none" as const, value: 0, reason: null };
      const late = rand() < 0.08;
      parents.push({
        id: pid,
        name: `${rand() < 0.7 ? pick(PARENT_M) : pick(PARENT_F)} ${surname}`,
        phone: `9198${String(between(10, 99))}${String(n).padStart(6, "0")}`,
        language: rand() < 0.65 ? "hi" : "en",
        consentAt: rand() < 0.92 ? "2026-04-05T11:00:00.000Z" : null,
        consentVersion: "DPDP-1",
      });
      students.push({
        id, name: `${girl ? pick(GIRLS) : pick(BOYS)} ${surname}`, batchId: b.id, course: b.course, parentId: pid,
        enrolledOn: late ? addDays(COURSE_START, between(20, 70)) : addDays(COURSE_START, -between(0, 10)),
        profile, discount,
      });
    }
  }
  for (let i = 0; i < parents.length; i += 50) await db.insert(schema.parents).values(parents.slice(i, i + 50));

  // ---- Plans, instalments, payments, academics ---------------------------
  const allPayments: { studentId: string; amount: number; on: string; method: "gateway" | "upi" | "neft" | "cash" }[] = [];
  const instRows: (typeof schema.instalments.$inferInsert)[] = [];
  const attRows: (typeof schema.attendance.$inferInsert)[] = [];
  const testRows: (typeof schema.testScores.$inferInsert)[] = [];
  const studentRows: (typeof schema.students.$inferInsert)[] = [];
  const planRows: (typeof schema.feePlans.$inferInsert)[] = [];

  for (const s of students) {
    studentRows.push({ id: s.id, name: s.name, batchId: s.batchId, parentId: s.parentId, enrolledOn: s.enrolledOn, status: "active" });
    const net = applyDiscount(GROSS, s.discount.type, s.discount.value);
    planRows.push({ studentId: s.id, grossFee: GROSS, discountType: s.discount.type, discountValue: s.discount.value, discountReason: s.discount.reason, netFee: net });
    const dates = PLAN[s.course];
    const amounts = splitInstalments(net, dates.length);
    dates.forEach((dueDate, i) => instRows.push({ id: `${s.id}-I${i + 1}`, studentId: s.id, seq: i + 1, dueDate, amount: amounts[i] }));

    if (s.payments) {
      s.payments.forEach((p) => allPayments.push({ studentId: s.id, ...p }));
    } else {
      dates.forEach((dueDate, i) => {
        const amt = amounts[i];
        let delay: number | null;
        switch (s.profile) {
          case "punctual": delay = between(-6, 2); break;
          case "slow": delay = between(4, 40); break;
          case "very_late": delay = i === 1 ? (rand() < 0.4 ? null : between(62, 105)) : between(0, 25); break;
          case "partial": delay = between(0, 20); break;
          case "struggling": delay = i >= (s.course === "NEET" ? 1 : 2) ? null : between(10, 50); break;
        }
        if (delay === null) return;
        const on = addDays(dueDate, delay);
        if (daysBetween(on, today) < 0) return; // in the future
        const method = pick(["gateway", "gateway", "upi", "neft", "cash"] as const);
        if (s.profile === "partial" && i === dates.length - 2) {
          const half = Math.round(amt / 2 / 100) * 100;
          allPayments.push({ studentId: s.id, amount: half, on, method });
        } else {
          allPayments.push({ studentId: s.id, amount: amt, on, method });
        }
      });
    }

    // Attendance and tests drift with the profile.
    const baseAtt = s.profile === "struggling" ? 0.9 : 0.85 + rand() * 0.12;
    MONTHS.forEach((m, i) => {
      if (m < s.enrolledOn.slice(0, 7)) return;
      const rate = s.attendance?.[i] ?? Math.max(0.2, Math.min(1, baseAtt - (s.profile === "struggling" ? i * 0.055 : 0) + (rand() - 0.5) * 0.08));
      const total = between(22, 26);
      attRows.push({ studentId: s.id, month: m, present: Math.round(rate * total), total });
    });
    const max = s.course === "JEE" ? 300 : 720;
    const baseTest = 40 + rand() * 35;
    for (let t = 0; t < 6; t++) {
      const date = `2026-${String(5 + t).padStart(2, "0")}-${s.course === "JEE" ? "17" : "18"}`;
      if (date < s.enrolledOn) continue;
      const p = s.tests?.[t] ?? Math.max(5, Math.min(98, baseTest + (s.profile === "struggling" ? -t * 4.5 : t * 1.2) + (rand() - 0.5) * 10));
      testRows.push({ studentId: s.id, testName: `Unit Test ${t + 1}`, testDate: date, score: Math.round((p / 100) * max), maxScore: max });
    }
  }

  const chunk = async <T,>(rows: T[], ins: (r: T[]) => Promise<unknown>) => {
    for (let i = 0; i < rows.length; i += 50) await ins(rows.slice(i, i + 50));
  };
  await chunk(studentRows, (r) => db.insert(schema.students).values(r));
  await chunk(planRows, (r) => db.insert(schema.feePlans).values(r));
  await chunk(instRows, (r) => db.insert(schema.instalments).values(r));
  await chunk(attRows, (r) => db.insert(schema.attendance).values(r));
  await chunk(testRows, (r) => db.insert(schema.testScores).values(r));

  allPayments.sort((a, b) => a.on.localeCompare(b.on));
  const recorded: (Payment & { studentId: string })[] = [];
  for (const p of allPayments) {
    const ref = p.method === "gateway" ? `pay_T${p.on.replace(/-/g, "")}${p.studentId.slice(4)}` : p.method === "upi" ? `UPI/${p.on.replace(/-/g, "").slice(2)}/${p.studentId}` : p.method === "neft" ? `NEFT FEE ${p.studentId}` : "Counter";
    const r = await recordPayment({ studentId: p.studentId, amount: p.amount, receivedOn: p.on, method: p.method, reference: ref, recordedBy: p.method === "cash" ? "st-ramesh" : p.method === "gateway" ? "system:gateway" : rand() < 0.8 ? "system:matcher" : "st-neha" });
    recorded.push({ id: r.id, amount: p.amount, receivedOn: p.on, studentId: p.studentId });
  }

  // ---- Reminder history: replay the daily job for every day since the course began --
  const byStudentPays = new Map<string, Payment[]>();
  for (const p of recorded) byStudentPays.set(p.studentId, [...(byStudentPays.get(p.studentId) ?? []), p]);
  const byStudentInst = new Map<string, typeof instRows>();
  for (const i of instRows) byStudentInst.set(i.studentId, [...(byStudentInst.get(i.studentId) ?? []), i]);
  const parentOf = new Map(parents.map((p) => [p.id, p]));
  const done = new Map<string, Map<number, "sent" | "superseded">>();
  const remRows: (typeof schema.reminders.$inferInsert)[] = [];
  for (let day = addDays(COURSE_START, -10); daysBetween(day, today) >= 0; day = addDays(day, 1)) {
    for (const s of students) {
      const pays = (byStudentPays.get(s.id) ?? []).filter((p) => daysBetween(p.receivedOn, day) >= 0);
      const ledger = buildLedger(byStudentInst.get(s.id)!.map((i) => ({ id: i.id!, seq: i.seq, dueDate: i.dueDate, amount: i.amount })), pays, day);
      const parent = parentOf.get(s.parentId)!;
      for (const inst of ledger.instalments) {
        if (!done.has(inst.id)) done.set(inst.id, new Map());
        const m = done.get(inst.id)!;
        const d = decideReminders(inst, day, m);
        if (d.send === null) continue;
        const base = { studentId: s.id, instalmentId: inst.id, channel: "whatsapp" as const, language: parent.language!, toPhone: parent.phone, balanceAtSend: inst.balance, sentOn: day };
        for (const o of d.supersede) {
          m.set(o, "superseded");
          remRows.push({ ...base, id: `rem_s${remRows.length}`, offsetDays: o, status: "superseded", body: "" });
        }
        m.set(d.send, "sent");
        remRows.push({
          ...base, id: `rem_s${remRows.length}`, offsetDays: d.send, status: "sent",
          body: renderReminder(parent.language!, { studentName: s.name, seq: inst.seq, amount: inst.balance, dueDate: inst.dueDate, offset: d.send, link: payUrl(inst.id) }),
        });
      }
    }
  }
  await chunk(remRows, (r) => db.insert(schema.reminders).values(r).onConflictDoNothing());

  // ---- Withdrawals and refunds ---------------------------------------------
  const withdrawn = students.filter((s) => s.profile === "punctual" && !s.payments).slice(0, 2);
  if (withdrawn.length === 2) {
    const [a, b] = withdrawn;
    await db.update(schema.students).set({ status: "withdrawn", withdrawnOn: "2026-08-20" }).where(sql`${schema.students.id} = ${a.id}`);
    const { calculateRefund, REFUND_POLICY } = await import("@/domain/refund");
    const mk = async (s: SeedStudent, leave: string, req: string, status: "approved" | "paid" | "pending_approval") => {
      const net = planRows.find((p) => p.studentId === s.id)!.netFee;
      const paid = recorded.filter((p) => p.studentId === s.id && p.receivedOn <= req).reduce((x, p) => x + p.amount, 0);
      const calc = calculateRefund({ courseStart: COURSE_START, courseEnd: COURSE_END, enrolledOn: s.enrolledOn, netFee: net, totalPaid: paid, leaveDate: leave, requestDate: req, materialDeduction: 3500 });
      await db.insert(schema.refunds).values({
        id: `ref_${s.id}`, studentId: s.id, requestDate: req, leaveDate: leave, materialDeduction: 3500, refundAmount: calc.refund,
        calculation: JSON.stringify(calc), policyVersion: REFUND_POLICY.version, deadline: calc.deadline, status,
        createdBy: "st-ramesh", approvedBy: status === "pending_approval" ? null : "st-neha",
        paidOn: status === "paid" ? addDays(req, 6) : null, payoutReference: status === "paid" ? "NEFT/OUT/88213" : null,
      });
    };
    await mk(a, "2026-08-20", "2026-08-21", "paid");
    await db.update(schema.students).set({ status: "withdrawn", withdrawnOn: "2026-10-28" }).where(sql`${schema.students.id} = ${b.id}`);
    await mk(b, "2026-10-28", "2026-10-29", "pending_approval");
  }

  // ---- Payments that the matcher could not place ----------------------------
  await db.insert(schema.unmatchedPayments).values([
    { id: "unm_1", amount: 40000, reference: "SCHOOL FEES NOV", payerName: "SURESH GURJAR", receivedOn: "2026-11-01", source: "neft", reason: "No student ID in reference", status: "open" },
    { id: "unm_2", amount: 30000, reference: "FEE STU-9031", payerName: "M K JOSHI", receivedOn: "2026-10-30", source: "upi", reason: "Reference names STU-9031, which is not on our rolls", status: "open" },
    { id: "unm_3", amount: 45000, reference: "STU0587 FEES", payerName: "RAKESH SHARMA", receivedOn: "2026-10-27", source: "neft", reason: "STU-0587 owes 45000, received 45000. Check before applying", status: "returned", resolvedBy: "st-neha", resolvedAt: "2026-10-28T10:00:00.000Z" },
  ]);

  // ---- Risk: open today's flags, plus some reviewed history -------------------
  await runRisk(today);
  const flagged = await db.select().from(schema.riskFlags);
  const reviewed = flagged.filter((f) => f.studentId !== "STU-0587").slice(0, 3);
  for (const [i, f] of reviewed.entries()) {
    await db.update(schema.riskFlags).set({
      status: i === 0 ? "false_flag" : "called",
      reviewNote: i === 0 ? "Was away for a family wedding, back in class from 26 Oct. Fees will be cleared on Diwali bonus." : "Spoke to mother. Struggling with Physics, booked doubt sessions.",
      reviewedBy: "st-vikram",
      reviewedAt: `${addDays(today, -2)}T12:30:00.000Z`,
    }).where(sql`${schema.riskFlags.id} = ${f.id}`);
  }

  return { students: students.length, payments: recorded.length, reminders: remRows.length };
}
