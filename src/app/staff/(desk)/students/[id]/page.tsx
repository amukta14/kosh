import Link from "next/link";
import { notFound } from "next/navigation";
import { recordManualPayment } from "@/app/actions/payments";
import { ActionForm } from "@/components/action-form";
import { InstalmentTag, LedgerTag, RiskTag } from "@/components/status";
import { Submit } from "@/components/submit";
import { ButtonLink, Card, Empty, Field, Input, Kv, Notice, PageHead, SectionTitle, Select, Tag, cx } from "@/components/ui";
import { addDays, daysBetween, formatDate } from "@/domain/dates";
import { inr } from "@/domain/money";
import { REMINDER_OFFSETS, offsetLabel } from "@/domain/reminders";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { loadStudent, openFlagsFor, paymentsFor, remindersFor, riskFor } from "@/server/queries";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { RiskFactors } from "../../risk/factors";

export const metadata = { title: "Ledger" };

export default async function StudentLedger({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("accounts");
  const { id } = await params;
  const today = await getToday();
  const v = await loadStudent(today, id.toUpperCase());
  if (!v) notFound();
  const [pays, rems, flags, risk, refund] = await Promise.all([
    paymentsFor(v.student.id),
    remindersFor(v.student.id),
    openFlagsFor(v.student.id),
    riskFor([v]),
    db.query.refunds.findFirst({ where: eq(schema.refunds.studentId, v.student.id) }),
  ]);
  const r = risk.get(v.student.id)!;
  const { ledger, plan, parent, student } = v;
  const sent = rems.filter((x) => x.status === "sent");
  const active = student.status === "active";

  return (
    <>
      <p className="text-[13px] text-ink-3 mb-2"><Link href="/staff/students" className="hover:text-ink">Students</Link> / <span className="num">{student.id}</span></p>
      <PageHead
        title={student.name}
        sub={<>{v.batch.name} · {v.centre.name} · joined {formatDate(student.enrolledOn)}</>}
        actions={active ? <ButtonLink href={`/staff/refunds/new?student=${student.id}`} tone="secondary">Start refund</ButtonLink> : refund ? <ButtonLink href={`/staff/refunds/${refund.id}`} tone="secondary">View refund</ButtonLink> : null}
      />

      <div className="flex flex-wrap gap-x-6 gap-y-2 -mt-3 mb-8 text-[13.5px] text-ink-2">
        <LedgerTag l={ledger} withdrawn={!active} />
        {active && <RiskTag band={r.band} />}
        <span>Parent: <span className="text-ink">{parent.name}</span> · <span className="num">+{parent.phone.slice(0, 2)} {parent.phone.slice(2, 7)} {parent.phone.slice(7)}</span></span>
        <span>Messages in {parent.language === "hi" ? "Hindi" : "English"}</span>
        {parent.consentAt ? <Tag tone="leaf">DPDP consent {formatDate(parent.consentAt.slice(0, 10))}</Tag> : <Tag tone="ochre">No DPDP consent yet</Tag>}
      </div>

      {!active && <div className="mb-6"><Notice tone="ink" title={`Withdrew on ${student.withdrawnOn ? formatDate(student.withdrawnOn) : "file"}`}>Reminders are off for this student. Remaining instalments are not chased.</Notice></div>}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border-y border-rule mb-10 [&>*]:bg-paper [&>*]:py-4 [&>*]:px-4 md:[&>*:first-child]:pl-0">
        <Fig k="Net fee" v={inr(plan.netFee)} sub={plan.discountType === "none" ? "No discount" : `${plan.discountType === "percent" ? `${plan.discountValue}%` : inr(plan.discountValue)} off · ${plan.discountReason ?? ""}`} />
        <Fig k="Paid" v={inr(ledger.totalPaid)} sub={`${pays.length} receipts`} />
        <Fig k="Balance" v={inr(ledger.balance)} sub={ledger.credit ? `${inr(ledger.credit)} credit held` : "On the whole course"} />
        <Fig k="Overdue" v={inr(ledger.overdue)} sub={ledger.overdue ? `oldest ${ledger.maxDaysOverdue} days` : "Nothing overdue"} tone={ledger.overdue ? "madder" : undefined} />
      </section>

      <div className="grid xl:grid-cols-[1.6fr_1fr] gap-8">
        <div className="flex flex-col gap-10 min-w-0">
          <section>
            <SectionTitle aside="Payments apply to the oldest instalment first">Instalments</SectionTitle>
            <Card className="overflow-x-auto">
              <table className="w-full text-[14px] min-w-[640px]">
                <thead className="text-left text-ink-3 text-[12px] uppercase tracking-wider">
                  <tr className="border-b border-rule">
                    <th className="font-semibold px-4 py-3">#</th>
                    <th className="font-semibold px-3 py-3">Due</th>
                    <th className="font-semibold px-3 py-3 text-right">Amount</th>
                    <th className="font-semibold px-3 py-3 text-right">Paid</th>
                    <th className="font-semibold px-3 py-3 text-right">Balance</th>
                    <th className="font-semibold px-3 py-3">Status</th>
                    <th className="font-semibold px-4 py-3">Reminders</th>
                  </tr>
                </thead>
                <tbody className="ledger num">
                  {ledger.instalments.map((i) => {
                    const done = new Map(rems.filter((x) => x.instalmentId === i.id).map((x) => [x.offsetDays, x.status] as const));
                    return (
                      <tr key={i.id}>
                        <td className="px-4 py-3 text-ink-3">{i.seq}</td>
                        <td className="px-3 py-3">{formatDate(i.dueDate)}</td>
                        <td className="px-3 py-3 text-right">{inr(i.amount)}</td>
                        <td className="px-3 py-3 text-right text-ink-2">{i.paid ? inr(i.paid) : "0"}</td>
                        <td className={cx("px-3 py-3 text-right", i.balance > 0 && i.status === "overdue" && "text-madder font-medium")}>{inr(i.balance)}</td>
                        <td className="px-3 py-3"><InstalmentTag i={i} /></td>
                        <td className="px-4 py-3"><Trail dueDate={i.dueDate} balance={active ? i.balance : 0} today={today} done={done} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
            <TrailKey />
          </section>

          <section>
            <SectionTitle>Receipts</SectionTitle>
            <Card className="overflow-x-auto">
              {pays.length === 0 ? <Empty title="No payments yet" /> : (
                <table className="w-full text-[14px] min-w-[560px]">
                  <tbody className="ledger num">
                    {pays.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3">{formatDate(p.receivedOn)}</td>
                        <td className="px-3 py-3 text-right font-medium">{inr(p.amount)}</td>
                        <td className="px-3 py-3 text-ink-2">{p.method.toUpperCase()}<span className="block text-[12px] text-ink-3 font-mono truncate max-w-[180px]">{p.reference}</span></td>
                        <td className="px-3 py-3 text-[12.5px] text-ink-3">{p.recordedBy.startsWith("system:") ? (p.recordedBy === "system:gateway" ? "Pay link" : p.recordedBy === "system:matcher" ? "Auto-matched" : "Imported") : "Desk"}</td>
                        <td className="px-4 py-3 text-right"><Link href={`/receipt/${p.id}`} className="text-indigo hover:underline underline-offset-4">{p.receiptNo}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle aside={`${sent.length} sent`}>Messages to parent</SectionTitle>
            {sent.length === 0 ? <Card><Empty title="No reminders sent yet" /></Card> : (
              <div className="flex flex-col gap-2">
                {sent.slice(0, 6).map((m) => (
                  <div key={m.id} className="grid grid-cols-[88px_1fr] gap-3 text-[13.5px]">
                    <span className="text-ink-3 num pt-2.5">{formatDate(m.sentOn, "en", false)}<span className="block text-[11.5px]">{offsetLabel(m.offsetDays)}</span></span>
                    <p className={cx("bg-card border border-rule rounded-[10px] rounded-tl-[2px] px-3.5 py-2.5 whitespace-pre-line break-words", m.language === "hi" && "hi")}>{m.body}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          {active && (
            <section>
              <SectionTitle>Record a payment</SectionTitle>
              <Card className="p-4">
                <ActionForm action={recordManualPayment} className="flex flex-col gap-3">
                  <input type="hidden" name="studentId" value={student.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Amount" htmlFor="amount"><Input id="amount" name="amount" inputMode="numeric" placeholder={String(ledger.next?.balance ?? "")} required /></Field>
                    <Field label="Method" htmlFor="method">
                      <Select id="method" name="method" defaultValue="cash">
                        <option value="cash">Cash</option><option value="cheque">Cheque</option><option value="neft">NEFT</option><option value="upi">UPI</option>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Reference" htmlFor="reference" hint="Cheque number, UTR, or Counter"><Input id="reference" name="reference" defaultValue="Counter" /></Field>
                  <Field label="Received on" htmlFor="receivedOn"><Input id="receivedOn" name="receivedOn" type="date" defaultValue={today} max={today} /></Field>
                  <Submit pendingText="Recording">Record and issue receipt</Submit>
                </ActionForm>
              </Card>
            </section>
          )}

          {active && (
            <section>
              <SectionTitle aside={<span className="num">{Math.round(r.probability * 100)}%</span>}>Dropout risk</SectionTitle>
              <Card className="p-4">
                <p className="text-[14px]">{r.summary}</p>
                {r.factors.length > 0 && <div className="mt-4"><RiskFactors factors={r.factors} /></div>}
                {flags.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-rule text-[13px] flex flex-col gap-1.5">
                    {flags.map((f) => (
                      <p key={f.id} className="text-ink-2">
                        <span className="num">{formatDate(f.createdOn)}</span>: {f.status === "open" ? <Link href="/staff/risk" className="text-indigo underline underline-offset-4">call task open</Link> : f.status === "called" ? "counsellor called" : "marked false flag"}
                        {f.reviewNote && <span className="block text-ink-3">“{f.reviewNote}”</span>}
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-[12px] text-ink-3 mt-4">This only opens a counsellor call. It never changes fees or messages the parent.</p>
              </Card>
            </section>
          )}

          <section>
            <SectionTitle>Fee plan</SectionTitle>
            <div className="ledger">
              <Kv k="Course fee" v={inr(plan.grossFee)} />
              <Kv k={`Discount${plan.discountReason ? `, ${plan.discountReason}` : ""}`} v={plan.discountType === "none" ? "None" : inr(plan.netFee - plan.grossFee)} />
              <Kv k="Net fee" v={<b>{inr(plan.netFee)}</b>} />
              <Kv k="Instalments" v={`${ledger.instalments.length} × ~${inr(ledger.instalments[0]?.amount ?? 0)}`} />
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function Fig({ k, v, sub, tone }: { k: string; v: string; sub: string; tone?: "madder" }) {
  return (
    <div>
      <p className="eyebrow">{k}</p>
      <p className={cx("display num text-[26px] mt-1.5 leading-none", tone === "madder" && "text-madder")}>{v}</p>
      <p className="text-[12px] text-ink-3 mt-1.5 truncate">{sub}</p>
    </div>
  );
}

/** Reminder steps for one instalment: filled = sent, ring = scheduled, struck = cancelled by payment. */
function Trail({ dueDate, balance, today, done }: { dueDate: string; balance: number; today: string; done: Map<number, "sent" | "superseded"> }) {
  return (
    <div className="flex items-center gap-[5px]" aria-label="Reminder steps">
      {REMINDER_OFFSETS.map((o) => {
        const date = addDays(dueDate, o);
        const st = done.get(o) ?? (balance <= 0 ? "cancelled" : daysBetween(date, today) >= 0 ? "pending" : "scheduled");
        const title = `${offsetLabel(o)} (${formatDate(date)}): ${st === "sent" ? "sent" : st === "superseded" ? "skipped, a later one was sent" : st === "cancelled" ? "not needed, paid" : st === "pending" ? "goes out on the next run" : "scheduled"}`;
        return (
          <span
            key={o}
            title={title}
            className={cx(
              "size-[11px] rounded-full shrink-0",
              o === 0 && "ring-1 ring-offset-1 ring-ink-3/40",
              st === "sent" && "bg-indigo",
              st === "superseded" && "bg-rule",
              st === "pending" && "bg-ochre",
              st === "scheduled" && "border-[1.5px] border-ink-3/60",
              st === "cancelled" && "border-[1.5px] border-leaf/50 bg-[linear-gradient(135deg,transparent_45%,var(--color-leaf)_45%,var(--color-leaf)_58%,transparent_58%)]",
            )}
          />
        );
      })}
    </div>
  );
}

function TrailKey() {
  const items = [
    ["bg-indigo", "Sent"],
    ["border-[1.5px] border-ink-3/60", "Scheduled"],
    ["border-[1.5px] border-leaf/50 bg-[linear-gradient(135deg,transparent_45%,var(--color-leaf)_45%,var(--color-leaf)_58%,transparent_58%)]", "Stopped by payment"],
    ["bg-rule", "Skipped"],
  ];
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[12px] text-ink-3">
      <span>Steps: 7 and 3 days before, on the day, then 3, 7, 15, 30 days after.</span>
      {items.map(([c, l]) => <span key={l} className="inline-flex items-center gap-1.5"><span className={cx("size-[9px] rounded-full", c)} />{l}</span>)}
    </p>
  );
}
