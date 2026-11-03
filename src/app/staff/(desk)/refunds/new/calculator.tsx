"use client";

import { useMemo, useState } from "react";
import { createRefund } from "@/app/actions/refunds";
import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/dialog";
import { Card, Field, Input, Notice, cx } from "@/components/ui";
import { daysBetween, formatDate } from "@/domain/dates";
import { inr, inr2 } from "@/domain/money";
import { calculateRefund, RefundError, REFUND_POLICY } from "@/domain/refund";

export interface CalcStudent {
  id: string;
  courseStart: string;
  courseEnd: string;
  enrolledOn: string;
  netFee: number;
  totalPaid: number;
}

export function RefundCalculator({ s, today }: { s: CalcStudent; today: string }) {
  const [leaveDate, setLeave] = useState(today);
  const [requestDate, setRequest] = useState(today);
  const [material, setMaterial] = useState("0");

  const out = useMemo(() => {
    try {
      return { r: calculateRefund({ ...s, leaveDate, requestDate, materialDeduction: Number(material || 0) }) };
    } catch (e) {
      return { error: e instanceof RefundError ? e.message : "Check the inputs" };
    }
  }, [s, leaveDate, requestDate, material]);

  const r = out.r;
  const usedPct = r ? (r.daysUsed / r.totalDays) * 100 : 0;
  const daysLeft = r ? daysBetween(today, r.deadline) : 0;

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-8">
      <Card className="p-5 h-fit">
        <ActionForm action={createRefund} className="flex flex-col gap-4" resetOnSuccess={false}>
          <input type="hidden" name="studentId" value={s.id} />
          <Field label="Last day attended" htmlFor="leaveDate"><Input id="leaveDate" name="leaveDate" type="date" value={leaveDate} max={today} onChange={(e) => setLeave(e.target.value)} /></Field>
          <Field label="Written request received" htmlFor="requestDate" hint="The 10-day clock starts here"><Input id="requestDate" name="requestDate" type="date" value={requestDate} max={today} onChange={(e) => setRequest(e.target.value)} /></Field>
          <Field label="Study material not returned (₹)" htmlFor="material" hint="Listed price only. Leave 0 if returned."><Input id="material" name="materialDeduction" inputMode="numeric" value={material} onChange={(e) => setMaterial(e.target.value.replace(/\D/g, ""))} /></Field>
          <ConfirmSubmit disabled={!r} title={r ? `Send a ${inr(r.refund)} refund for approval?` : "Send for approval?"} body="The student will be marked as withdrawn now and all fee reminders stop. Another accounts executive then approves the payout." confirmLabel="Send for approval">Send for approval</ConfirmSubmit>
          <p className="text-[12px] text-ink-3">Saving marks the student as withdrawn and stops reminders. A second accounts person approves the payout.</p>
        </ActionForm>
      </Card>

      <section aria-live="polite">
        {!r ? (
          <Notice tone="madder" title="Cannot calculate">{out.error}</Notice>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Refund due</p>
                <p className={cx("display num text-[64px] leading-none mt-2", r.refund === 0 && "text-ink-3")}>{inr(r.refund)}</p>
              </div>
              <div className="text-right text-[14px]">
                <p className="text-ink-3">Pay by</p>
                <p className="display text-[22px]">{formatDate(r.deadline)}</p>
                <p className={cx("num", daysLeft <= 3 ? "text-madder" : "text-ink-2")}>{daysLeft >= 0 ? `${daysLeft} days from today` : `${-daysLeft} days late`}</p>
              </div>
            </div>

            {/* The course as a bar: used days vs days refunded. */}
            <div className="mt-8">
              <div className="flex h-10 rounded-[6px] overflow-hidden border border-rule text-[12px] font-medium">
                <div className="bg-paper-2 grid place-items-center text-ink-2 min-w-0" style={{ width: `${usedPct}%` }}>{usedPct > 18 && `${r.daysUsed} days used`}</div>
                <div className="bg-indigo text-white grid place-items-center min-w-0" style={{ width: `${100 - usedPct}%` }}>{100 - usedPct > 18 && `${r.daysRemaining} days refunded`}</div>
              </div>
              <div className="flex justify-between text-[12px] text-ink-3 mt-1.5 num">
                <span>{formatDate(r.periodStart)}</span>
                <span>{formatDate(s.courseEnd)}</span>
              </div>
            </div>

            <Card className="mt-8">
              <table className="w-full text-[14px]">
                <tbody className="ledger">
                  {r.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="pl-4 py-3 w-12 align-top"><span className="text-[11.5px] font-semibold text-indigo" title={REFUND_POLICY.clauses.find((c) => c.id === l.clause)?.en}>{l.clause}</span></td>
                      <td className="py-3 pr-3">{l.label}<span className="block text-[12.5px] text-ink-3 num">{l.detail}</span></td>
                      <td className="pr-4 py-3 text-right num align-top">{l.amount === null ? "" : l.amount < 0 ? <span className="text-madder">{inr(l.amount)}</span> : inr(l.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-ink">
                    <td className="pl-4 py-3"><span className="text-[11.5px] font-semibold text-indigo">R5</span></td>
                    <td className="py-3 font-semibold">Refund = paid − fee for days used − material</td>
                    <td className="pr-4 py-3 text-right num font-semibold">{inr(r.refund)}</td>
                  </tr>
                </tbody>
              </table>
            </Card>
            {r.shortfall > 0 && <div className="mt-4"><Notice tone="ochre" title="Nothing to refund">The fee for the days attended is {inr(r.shortfall)} more than was paid. This is shown for the record only; the policy does not demand it.</Notice></div>}
            <p className="text-[12.5px] text-ink-3 mt-4 num">GST credit note (R7): taxable {inr2(r.creditNote.taxable)} + CGST {inr2(r.creditNote.cgst)} + SGST {inr2(r.creditNote.sgst)}. Policy {r.policyVersion}.</p>
          </>
        )}
      </section>
    </div>
  );
}
