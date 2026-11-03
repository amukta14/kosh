import Link from "next/link";
import { Amount, Card, Empty, Kv, SectionTitle, Tag, type Tone } from "@/components/ui";
import { formatDate } from "@/domain/dates";
import { inr } from "@/domain/money";
import { t } from "@/lib/i18n";
import { parentContext } from "@/server/parent";
import { paymentsFor } from "@/server/queries";
import { ParentShell } from "../shell";

export const metadata = { title: "Fee plan" };

const tone: Record<string, Tone> = { paid: "leaf", overdue: "madder", due_today: "ochre", upcoming: "ink" };

export default async function ParentFees({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const { kids, current, lang } = await parentContext(c);
  const d = t(lang);
  const { plan, ledger } = current;
  const pays = await paymentsFor(current.student.id);
  const q = kids.length > 1 ? `?c=${current.student.id}` : "";

  return (
    <ParentShell lang={lang} kids={kids} current={current} tab="fees" path="/parent/fees">
      <section className="mt-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">{d.balance}</p>
            <Amount value={inr(ledger.balance)} size="lg" />
          </div>
          <p className="text-right text-[14px] text-ink-2 num">
            {d.paid} {inr(ledger.totalPaid)}
            <br />
            <span className="text-ink-3">/ {inr(plan.netFee)}</span>
          </p>
        </div>
        <Progress value={ledger.totalPaid} max={plan.netFee} />
      </section>

      <section className="mt-8">
        <SectionTitle>{d.feePlan}</SectionTitle>
        <Card className="px-4 ledger">
          {ledger.instalments.map((i) => (
            <div key={i.id} className="py-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[15px]">{d.instalment(i.seq)}</p>
                <p className="text-[13px] text-ink-3 num">{formatDate(i.dueDate, lang)}</p>
              </div>
              <div className="text-right">
                <p className="num text-[15px]">{inr(i.amount)}</p>
                <Tag tone={tone[i.status]}>
                  {i.status === "paid" ? d.status.paid : i.paid > 0 ? `${d.balance} ${inr(i.balance)}` : i.status === "overdue" ? d.daysLate(i.daysOverdue) : d.status[i.status]}
                </Tag>
              </div>
            </div>
          ))}
        </Card>
        <div className="mt-3 px-1">
          <Kv k={d.totalFee} v={inr(plan.grossFee)} />
          {plan.discountType !== "none" && <Kv k={`${d.discount}${plan.discountReason ? ` · ${plan.discountReason}` : ""}`} v={inr(plan.netFee - plan.grossFee)} />}
          <Kv k={d.netFee} v={<b>{inr(plan.netFee)}</b>} className="border-t border-rule" />
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle>{d.receipts}</SectionTitle>
        {pays.length === 0 ? (
          <Card><Empty title={d.noReceipts} /></Card>
        ) : (
          <Card className="px-4 ledger">
            {pays.map((p) => (
              <Link key={p.id} href={`/receipt/${p.id}${q}`} className="py-3.5 flex items-center justify-between gap-3 group">
                <div>
                  <p className="num text-[15px]">{inr(p.amount)}</p>
                  <p className="text-[13px] text-ink-3">{formatDate(p.receivedOn, lang)} · {p.method.toUpperCase()}</p>
                </div>
                <span className="text-[13px] text-indigo group-hover:underline underline-offset-4">{d.view} →</span>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </ParentShell>
  );
}

function Progress({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-paper-2 rounded-full mt-4 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-leaf rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}
