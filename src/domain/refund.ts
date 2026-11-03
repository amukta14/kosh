import { addDays, daysBetween, isIsoDate } from "./dates";
import { gstSplit } from "./money";

/**
 * The written refund policy, as code. The public /refund-policy page renders
 * these same clauses, so what parents read is exactly what the calculator does.
 * Version is stored with every refund so old calculations can be explained later.
 */
export const REFUND_POLICY = {
  version: "RP-2026.1",
  effectiveFrom: "2026-04-01",
  settlementDays: 10,
  clauses: [
    {
      id: "R1",
      en: "When a student leaves, the fee is refunded pro-rata for the days of the course not yet attended.",
      hi: "छात्र के संस्थान छोड़ने पर, कोर्स के बचे हुए दिनों की फ़ीस अनुपात में लौटाई जाएगी।",
    },
    {
      id: "R2",
      en: "Days used are counted from the student's start date (course start or joining date, whichever is later) up to and including the last day attended.",
      hi: "उपयोग किए गए दिन छात्र की शुरुआत की तारीख (कोर्स शुरू होने या दाख़िले की तारीख, जो बाद में हो) से आख़िरी उपस्थिति के दिन तक गिने जाते हैं।",
    },
    {
      id: "R3",
      en: "The fee for days used is the net fee (after any scholarship or discount) multiplied by days used, divided by total course days, rounded to the nearest rupee.",
      hi: "उपयोग किए गए दिनों की फ़ीस = कुल शुद्ध फ़ीस (छूट के बाद) × उपयोग के दिन ÷ कोर्स के कुल दिन, निकटतम रुपये तक।",
    },
    {
      id: "R4",
      en: "Printed study material issued and not returned may be deducted at its listed price. No other admission, processing or cancellation charge is deducted.",
      hi: "दी गई और वापस न की गई अध्ययन सामग्री की सूचीबद्ध कीमत काटी जा सकती है। इसके अलावा कोई प्रवेश, प्रोसेसिंग या रद्दीकरण शुल्क नहीं काटा जाएगा।",
    },
    {
      id: "R5",
      en: "Refund = amount paid − fee for days used − material deduction. If this is below zero, nothing is refunded and the difference is shown for the record.",
      hi: "रिफ़ंड = भुगतान की गई राशि − उपयोग के दिनों की फ़ीस − सामग्री कटौती। यदि यह शून्य से कम हो, तो कोई रिफ़ंड नहीं होगा।",
    },
    {
      id: "R6",
      en: "The refund is paid to the original payment account within 10 days of receiving the written request.",
      hi: "लिखित अनुरोध मिलने के 10 दिनों के अंदर रिफ़ंड मूल भुगतान खाते में भेजा जाएगा।",
    },
    {
      id: "R7",
      en: "Fees include 18% GST. A GST credit note is issued for the refunded amount.",
      hi: "फ़ीस में 18% GST शामिल है। रिफ़ंड राशि के लिए GST क्रेडिट नोट जारी किया जाएगा।",
    },
  ],
} as const;

export interface RefundInput {
  courseStart: string;
  courseEnd: string;
  enrolledOn: string;
  netFee: number;
  totalPaid: number;
  /** Last day the student attended. */
  leaveDate: string;
  /** Date the written request was received; the 10-day clock starts here. */
  requestDate: string;
  materialDeduction: number;
}

export interface RefundLine {
  clause: string;
  label: string;
  detail: string;
  amount: number | null;
}

export interface RefundResult {
  policyVersion: string;
  periodStart: string;
  totalDays: number;
  daysUsed: number;
  daysRemaining: number;
  feeForDaysUsed: number;
  materialDeduction: number;
  totalPaid: number;
  refund: number;
  /** Fee for the attended period that was never paid (shown, not demanded). */
  shortfall: number;
  deadline: string;
  creditNote: ReturnType<typeof gstSplit>;
  lines: RefundLine[];
}

export class RefundError extends Error {}

export function calculateRefund(input: RefundInput): RefundResult {
  const { courseStart, courseEnd, enrolledOn, netFee, totalPaid, leaveDate, requestDate } = input;
  for (const [k, v] of Object.entries({ courseStart, courseEnd, enrolledOn, leaveDate, requestDate })) {
    if (!isIsoDate(v)) throw new RefundError(`${k} is not a valid date`);
  }
  if (daysBetween(courseStart, courseEnd) < 0) throw new RefundError("Course ends before it starts");
  if (!Number.isInteger(netFee) || netFee < 0) throw new RefundError("Net fee must be a whole number ≥ 0");
  if (!Number.isInteger(totalPaid) || totalPaid < 0) throw new RefundError("Amount paid must be a whole number ≥ 0");
  const material = input.materialDeduction;
  if (!Number.isInteger(material) || material < 0) throw new RefundError("Material deduction must be a whole number ≥ 0");
  if (material > 15000) throw new RefundError("Material deduction above ₹15,000 needs a manual review");
  if (daysBetween(leaveDate, requestDate) < 0) throw new RefundError("Request date cannot be before the last day attended");

  // R2: the student's own start date.
  const periodStart = daysBetween(courseStart, enrolledOn) > 0 ? enrolledOn : courseStart;
  const totalDays = daysBetween(periodStart, courseEnd) + 1;
  if (totalDays <= 0) throw new RefundError("Joining date is after the course end");

  const rawUsed = daysBetween(periodStart, leaveDate) + 1;
  const daysUsed = Math.min(totalDays, Math.max(0, rawUsed));
  const daysRemaining = totalDays - daysUsed;

  // R3
  const feeForDaysUsed = Math.round((netFee * daysUsed) / totalDays);
  // R5
  const raw = totalPaid - feeForDaysUsed - material;
  const refund = Math.max(0, raw);
  const shortfall = Math.max(0, -raw);
  // R6
  const deadline = addDays(requestDate, REFUND_POLICY.settlementDays);

  const lines: RefundLine[] = [
    { clause: "R2", label: "Course period for this student", detail: `${periodStart} to ${courseEnd} · ${totalDays} days`, amount: null },
    { clause: "R2", label: "Days used", detail: `${periodStart} to ${leaveDate} · ${daysUsed} of ${totalDays} days`, amount: null },
    { clause: "R3", label: "Net fee", detail: "After scholarship / discount", amount: netFee },
    { clause: "R3", label: "Fee for days used", detail: `${netFee.toLocaleString("en-IN")} × ${daysUsed} ÷ ${totalDays}`, amount: -feeForDaysUsed },
    { clause: "R4", label: "Study material not returned", detail: material ? "At listed price" : "None", amount: material ? -material : 0 },
    { clause: "R5", label: "Amount paid so far", detail: "All receipts on the ledger", amount: totalPaid },
  ];

  return {
    policyVersion: REFUND_POLICY.version,
    periodStart,
    totalDays,
    daysUsed,
    daysRemaining,
    feeForDaysUsed,
    materialDeduction: material,
    totalPaid,
    refund,
    shortfall,
    deadline,
    creditNote: gstSplit(refund),
    lines,
  };
}
