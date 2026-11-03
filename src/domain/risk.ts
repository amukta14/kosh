import type { InstalmentState } from "./fees";

/**
 * Dropout-risk model.
 *
 * A small logistic model over three signals the brief names: missed
 * instalments, falling attendance and falling test scores. Coefficients are
 * hand-set (assumption A10) because there is no labelled dropout history yet;
 * counsellor "false flag" marks are stored so the model can be refit later.
 *
 * Safety: the output of this module is only ever used to open a counsellor
 * call task. It never touches fees or sends a parent message.
 */

export interface AttendanceMonth {
  month: string;
  present: number;
  total: number;
}

export interface TestScore {
  testName: string;
  testDate: string;
  score: number;
  maxScore: number;
}

export interface RiskFactor {
  key: "fees" | "fee_age" | "attendance_level" | "attendance_drop" | "test_trend";
  label: string;
  value: string;
  /** Contribution to the log-odds. */
  weight: number;
}

export type RiskBand = "high" | "watch" | "low" | "insufficient";

export interface RiskResult {
  probability: number; // 0..1
  band: RiskBand;
  factors: RiskFactor[];
  /** Plain-English reason the band was chosen, shown to the counsellor. */
  summary: string;
}

export const RISK_MODEL = {
  version: "risk-v1",
  intercept: -3.1,
  coef: {
    overdueInstalments: 0.85, // per instalment more than 7 days overdue
    feeAge: 0.6, // per 30 days the oldest debt is overdue (capped at 90)
    attendanceLevel: 4.0, // per unit below 80% in the latest month
    attendanceDrop: 0.06, // per percentage point drop, recent vs earlier
    testTrend: 0.09, // per percentage point fall per test
  },
  highAt: 0.6,
  watchAt: 0.35,
} as const;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Least-squares slope of y over 0..n-1. */
export function slope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = mean(ys);
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

export function scoreRisk(input: {
  instalments: InstalmentState[];
  attendance: AttendanceMonth[];
  tests: TestScore[];
}): RiskResult {
  const { coef } = RISK_MODEL;
  const factors: RiskFactor[] = [];

  const overdue = input.instalments.filter((i) => i.status === "overdue" && i.daysOverdue > 7);
  const maxAge = Math.min(90, Math.max(0, ...input.instalments.map((i) => i.daysOverdue)));
  if (overdue.length) {
    factors.push({
      key: "fees",
      label: "Missed instalments",
      value: `${overdue.length} instalment${overdue.length > 1 ? "s" : ""} unpaid past 7 days`,
      weight: coef.overdueInstalments * overdue.length,
    });
    factors.push({
      key: "fee_age",
      label: "Oldest unpaid",
      value: `${maxAge} days overdue`,
      weight: coef.feeAge * (maxAge / 30),
    });
  }

  const att = [...input.attendance].filter((a) => a.total > 0).sort((a, b) => a.month.localeCompare(b.month));
  const rates = att.map((a) => pct(a.present, a.total));
  if (rates.length >= 1) {
    const latest = rates[rates.length - 1];
    if (latest < 80) {
      factors.push({
        key: "attendance_level",
        label: "Low attendance",
        value: `${Math.round(latest)}% last month`,
        weight: coef.attendanceLevel * ((80 - latest) / 100),
      });
    }
  }
  if (rates.length >= 3) {
    const earlier = mean(rates.slice(0, -2));
    const recent = mean(rates.slice(-2));
    const drop = earlier - recent;
    if (drop > 3) {
      factors.push({
        key: "attendance_drop",
        label: "Attendance falling",
        value: `${Math.round(earlier)}% → ${Math.round(recent)}%`,
        weight: coef.attendanceDrop * drop,
      });
    }
  }

  const tests = [...input.tests].filter((t) => t.maxScore > 0).sort((a, b) => a.testDate.localeCompare(b.testDate));
  const tpcts = tests.slice(-4).map((t) => pct(t.score, t.maxScore));
  if (tpcts.length >= 3) {
    const s = slope(tpcts);
    if (s < -1) {
      factors.push({
        key: "test_trend",
        label: "Test scores falling",
        value: `${Math.round(tpcts[0])}% → ${Math.round(tpcts[tpcts.length - 1])}% over ${tpcts.length} tests`,
        weight: coef.testTrend * -s,
      });
    }
  }

  const z = RISK_MODEL.intercept + factors.reduce((a, f) => a + f.weight, 0);
  const probability = sigmoid(z);
  factors.sort((a, b) => b.weight - a.weight);

  // Not enough signal to say anything: say so instead of guessing.
  const hasAcademic = rates.length >= 2 || tpcts.length >= 2;
  const hasFeeSignal = overdue.length > 0;
  if (!hasAcademic && !hasFeeSignal) {
    return { probability, band: "insufficient", factors, summary: "Not enough attendance or test history yet to judge." };
  }

  let band: RiskBand = "low";
  if (probability >= RISK_MODEL.highAt) band = "high";
  else if (probability >= RISK_MODEL.watchAt) band = "watch";

  // A single weak signal should never be enough to raise a flag on its own.
  if (band === "high" && factors.length < 2) band = "watch";

  const top = factors.slice(0, 2).map((f) => f.label.toLowerCase());
  const summary =
    band === "high"
      ? `Likely at risk: ${top.join(" and ")}.`
      : band === "watch"
        ? `Unsure. Some signs (${top.join(", ") || "mixed"}). Watching, no call yet.`
        : "No meaningful signs of risk.";

  return { probability, band, factors, summary };
}

/**
 * Whether a new counsellor task should open. Counsellor "false flag" marks
 * suppress re-flagging for 30 days unless the risk has clearly grown.
 */
export function shouldOpenFlag(args: {
  result: RiskResult;
  today: string;
  openFlag: boolean;
  lastFalseFlag: { reviewedOn: string; probability: number } | null;
  daysSince: (a: string, b: string) => number;
}): boolean {
  const { result, today, openFlag, lastFalseFlag, daysSince } = args;
  if (result.band !== "high" || openFlag) return false;
  if (lastFalseFlag) {
    const within = daysSince(lastFalseFlag.reviewedOn, today) < 30;
    const grown = result.probability * 100 - lastFalseFlag.probability >= 15;
    if (within && !grown) return false;
  }
  return true;
}
