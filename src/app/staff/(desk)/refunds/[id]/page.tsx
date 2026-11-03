import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, Kv, Notice, PageHead, SectionTitle, Tag, cx } from "@/components/ui";
import { db, schema } from "@/db";
import { daysBetween, formatDate } from "@/domain/dates";
import { inr, inr2 } from "@/domain/money";
import type { RefundResult } from "@/domain/refund";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { Approve, MarkPaid } from "./actions";

export const metadata = { title: "Refund" };

export default async function RefundDetail({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("accounts");
  const { id } = await params;
  const r = await db.query.refunds.findFirst({ where: eq(schema.refunds.id, id) });
  if (!r) notFound();
  const [student, staff] = await Promise.all([
    db.query.students.findFirst({ where: eq(schema.students.id, r.studentId) }),
    db.select().from(schema.staff),
  ]);
  const who = (x: string | null) => staff.find((p) => p.id === x)?.name ?? x ?? "";
  const calc = JSON.parse(r.calculation) as RefundResult;
  const today = await getToday();
  const left = daysBetween(today, r.deadline);

  const steps = [
    { label: "Requested", done: true, note: `${formatDate(r.requestDate)} · by ${who(r.createdBy)}` },
    { label: "Approved", done: r.status !== "pending_approval", note: r.approvedBy ? `by ${who(r.approvedBy)}` : "Needs a second person" },
    { label: "Paid out", done: r.status === "paid", note: r.paidOn ? `${formatDate(r.paidOn)} · ${r.payoutReference}` : `Due by ${formatDate(r.deadline)}` },
  ];

  return (
    <>
      <p className="text-[13px] text-ink-3 mb-2"><Link href="/staff/refunds" className="hover:text-ink">Refunds</Link> / {r.studentId}</p>
      <PageHead title={`Refund for ${student?.name}`} sub={<Link href={`/staff/students/${r.studentId}`} className="underline underline-offset-4">{r.studentId}</Link>} />

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Refund</p>
              <p className="display num text-[56px] leading-none mt-2">{inr(r.refundAmount)}</p>
            </div>
            {r.status !== "paid" && (
              <div className="text-right">
                <p className="text-ink-3 text-[13px]">Deadline {formatDate(r.deadline)}</p>
                <p className={cx("display text-[24px] num", left <= 3 ? "text-madder" : "text-ink")}>{left >= 0 ? `${left} days left` : `${-left} days late`}</p>
              </div>
            )}
          </div>

          <ol className="mt-8 grid grid-cols-3 gap-2">
            {steps.map((st, i) => (
              <li key={st.label} className="relative">
                <div className={cx("h-1 rounded-full", st.done ? "bg-leaf" : "bg-rule")} />
                <p className={cx("mt-2 text-[14px] font-medium", !st.done && "text-ink-3")}>{i + 1}. {st.label}</p>
                <p className="text-[12.5px] text-ink-3">{st.note}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10"><SectionTitle>How it was worked out</SectionTitle></div>
          <Card>
            <table className="w-full text-[14px]">
              <tbody className="ledger">
                {calc.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="pl-4 py-3 w-12 text-[11.5px] font-semibold text-indigo align-top">{l.clause}</td>
                    <td className="py-3">{l.label}<span className="block text-[12.5px] text-ink-3 num">{l.detail}</span></td>
                    <td className="pr-4 py-3 text-right num align-top">{l.amount === null ? "" : inr(l.amount)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-ink"><td className="pl-4 py-3 text-[11.5px] font-semibold text-indigo">R5</td><td className="py-3 font-semibold">Refund</td><td className="pr-4 py-3 text-right num font-semibold">{inr(calc.refund)}</td></tr>
              </tbody>
            </table>
          </Card>
          <p className="text-[12.5px] text-ink-3 mt-3">Worked out under policy {r.policyVersion}. The snapshot is stored, so it reads the same even if the policy changes later.</p>
        </div>

        <aside className="flex flex-col gap-6">
          <Card className="p-4">
            <p className="eyebrow mb-3">Next step</p>
            {r.status === "pending_approval" ? (
              r.createdBy === s.sub ? <Notice tone="ochre">You created this, so someone else must approve it.</Notice> : <Approve id={r.id} amount={inr(r.refundAmount)} />
            ) : r.status === "approved" ? <MarkPaid id={r.id} /> : <Tag tone="leaf">Paid {r.paidOn && formatDate(r.paidOn)}</Tag>}
          </Card>
          <div>
            <SectionTitle>GST credit note</SectionTitle>
            <div className="ledger text-[14px]">
              <Kv k="Taxable value" v={inr2(calc.creditNote.taxable)} />
              <Kv k="CGST 9%" v={inr2(calc.creditNote.cgst)} />
              <Kv k="SGST 9%" v={inr2(calc.creditNote.sgst)} />
              <Kv k="Total" v={<b>{inr2(calc.creditNote.total)}</b>} />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
