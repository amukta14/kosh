import Link from "next/link";
import { redirect } from "next/navigation";
import { Amount, ButtonLink, Notice, cx } from "@/components/ui";
import { formatDate } from "@/domain/dates";
import { inr } from "@/domain/money";
import { t } from "@/lib/i18n";
import { parentContext } from "@/server/parent";
import { payToken } from "@/server/paylink";
import { ParentShell } from "./shell";

export const metadata = { title: "Fees due" };

export default async function ParentHome({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const { parent, kids, current, lang, skippedConsent } = await parentContext(c);
  if (!parent.consentAt && !skippedConsent) redirect("/consent");

  const d = t(lang);
  const { ledger, student, batch, centre } = current;
  const next = ledger.next;
  const isDueNow = next && (next.status === "overdue" || next.status === "due_today");
  const after = next ? ledger.instalments.find((i) => i.seq > next.seq && i.balance > 0) : null;
  const moreOverdue = ledger.instalments.filter((i) => i.status === "overdue" && i.id !== next?.id);

  return (
    <ParentShell lang={lang} kids={kids} current={current} tab="pay" path="/parent">
      <p className="text-[14px] text-ink-2 mt-2">
        <span className="text-ink font-medium">{student.name}</span> · {batch.name} · {centre.name}
      </p>

      {student.status === "withdrawn" ? (
        <div className="mt-6"><Notice tone="ink">{d.withdrawn}</Notice></div>
      ) : next ? (
        <section className="mt-5 rise" aria-labelledby="due-h">
          <div className={cx("rounded-[14px] border bg-card px-5 pt-5 pb-5", next.status === "overdue" ? "border-madder/35" : "border-rule")}>
            <p id="due-h" className="eyebrow">{isDueNow ? d.toPayNow : d.instalment(next.seq)}</p>
            <div className="mt-3"><Amount value={inr(next.balance)} size="xl" /></div>
            <p className={cx("mt-3 text-[16px] font-medium", next.status === "overdue" ? "text-madder" : next.status === "due_today" ? "text-ochre" : "text-ink-2")}>
              {d.dueOn(formatDate(next.dueDate, lang))}
              {" · "}
              {next.status === "overdue" ? d.daysLate(next.daysOverdue) : next.status === "due_today" ? d.dueToday : d.inDays(next.daysUntilDue)}
            </p>
            {next.paid > 0 && <p className="text-[14px] text-ink-3 mt-1">{d.partPaid(inr(next.paid))}</p>}
            <ButtonLink href={`/p/${payToken(next.id)}`} size="lg" block className="mt-6">
              {d.pay(inr(next.balance))}
            </ButtonLink>
            <p className="text-[12.5px] text-ink-3 mt-2.5 text-center">{d.payNote}</p>
          </div>

          {moreOverdue.length > 0 && (
            <p className="text-[14px] text-madder mt-4 px-1">
              + {inr(moreOverdue.reduce((a, i) => a + i.balance, 0))} {lang === "hi" ? "और बकाया" : "more overdue"}
            </p>
          )}
          {after && (
            <p className="text-[14px] text-ink-3 mt-4 px-1">{d.nextOn(inr(after.balance), formatDate(after.dueDate, lang))}</p>
          )}
        </section>
      ) : (
        <section className="mt-6 rounded-[14px] border border-leaf/30 bg-leaf-wash/60 px-5 py-8 text-center rise">
          <p className="display text-[26px] text-leaf">{d.nothingDue}</p>
          <p className="text-ink-2 mt-1">{d.allClear}</p>
        </section>
      )}

      <div className="mt-10 flex justify-between text-[13px] text-ink-3 px-1">
        <span>{d.help}</span>
        <Link href="/refund-policy" className="underline underline-offset-4">{d.refundPolicy}</Link>
      </div>
    </ParentShell>
  );
}
