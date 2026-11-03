import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHead, SectionTitle, cx } from "@/components/ui";
import { formatDate } from "@/domain/dates";
import { AGEING_BUCKETS, late60Share } from "@/domain/dues";
import { inr, inrCompact } from "@/domain/money";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { dashboardData } from "@/server/dashboard";
import { TallyExport } from "./tally-export";

export const metadata = { title: "Dues" };

const SLOTS = [
  ["JEE 2027 Morning", "JEE · AM"],
  ["JEE 2027 Evening", "JEE · PM"],
  ["NEET 2027 Morning", "NEET · AM"],
  ["NEET 2027 Evening", "NEET · PM"],
] as const;

const AGE_COLORS = ["#e7cf9b", "#d29a4a", "#b9573a", "#7f2a20"];

export default async function Dashboard() {
  const s = await requireRole("accounts", "counsellor");
  if (s.role === "counsellor") redirect("/staff/risk");
  const today = await getToday();
  const d = await dashboardData(today);
  const { total } = d;
  const late = late60Share(total);
  const collectedPct = total.billedToDate ? total.collectedToDate / total.billedToDate : 0;
  const maxCell = Math.max(1, ...d.batches.map((b) => b.r.overdue));
  const ageTotal = Object.values(total.ageing).reduce((a, b) => a + b, 0);
  const maxWeek = Math.max(1, ...d.weeks.map((w) => w.amount));

  return (
    <>
      <PageHead title="Dues across all centres" sub={`${total.students} active students · as of ${formatDate(today)}`} />

      {/* Headline figures: hairline-separated, not boxed. */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule border-y border-rule [&>*]:bg-paper [&>*]:py-5 [&>*]:px-4 lg:[&>*:first-child]:pl-0">
        <Figure label="Overdue now" value={inrCompact(total.overdue)} note={`${total.overdueStudents} students`} tone="madder" href="/staff/students?status=overdue" />
        <Figure label="Collected of billed to date" value={`${(collectedPct * 100).toFixed(1)}%`} note={`${inrCompact(total.collectedToDate)} of ${inrCompact(total.billedToDate)}`} />
        <div>
          <p className="eyebrow">Value over 60 days late</p>
          <p className={cx("display num text-[34px] leading-none mt-2", late > 0.06 ? "text-ochre" : "text-leaf")}>{(late * 100).toFixed(1)}%</p>
          <LateGauge value={late} />
        </div>
        <Figure label="Paid without staff, 30 days" value={d.collected30 ? `${Math.round((d.selfServe30 / d.collected30) * 100)}%` : "0%"} note={`${inrCompact(d.selfServe30)} of ${inrCompact(d.collected30)} via pay links and auto-match`} />
      </section>

      {(d.attention.unmatched > 0 || d.attention.pendingRefunds > 0 || d.attention.openFlags > 0) && (
        <section className="mt-6 flex flex-wrap gap-2 text-[13.5px]">
          <span className="text-ink-3 self-center mr-1">Needs a person:</span>
          {d.attention.unmatched > 0 && <Chip href="/staff/payments">{d.attention.unmatched} payment{d.attention.unmatched > 1 ? "s" : ""} to match</Chip>}
          {d.attention.pendingRefunds > 0 && <Chip href="/staff/refunds">{d.attention.pendingRefunds} refund{d.attention.pendingRefunds > 1 ? "s" : ""} to approve</Chip>}
          {d.attention.openFlags > 0 && <Chip href="/staff/risk">{d.attention.openFlags} counsellor call{d.attention.openFlags > 1 ? "s" : ""}</Chip>}
        </section>
      )}

      <div className="grid xl:grid-cols-[1.45fr_1fr] gap-8 mt-10">
        <section>
          <SectionTitle aside="Overdue, by centre and batch">Where money is stuck</SectionTitle>
          <Card className="p-1.5 overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-1.5 text-[13px]">
              <thead>
                <tr>
                  <th className="text-left font-medium text-ink-3 px-2 w-[140px]"></th>
                  {SLOTS.map(([, short]) => <th key={short} className="font-medium text-ink-3 text-left px-2">{short}</th>)}
                  <th className="font-medium text-ink-3 text-right px-2">Centre</th>
                </tr>
              </thead>
              <tbody>
                {d.centres.map((c) => (
                  <tr key={c.id}>
                    <th scope="row" className="text-left font-medium px-2 text-[14px]">{c.name}</th>
                    {SLOTS.map(([name]) => {
                      const b = d.batches.find((x) => x.centreId === c.id && x.name === name);
                      if (!b) return <td key={name} />;
                      const k = b.r.overdue / maxCell;
                      return (
                        <td key={name} className="p-0">
                          <Link
                            href={`/staff/students?batch=${b.batchId}&status=overdue`}
                            className="block rounded-[6px] px-2.5 py-2.5 hover:outline-2 hover:outline-indigo transition-[outline]"
                            style={{ background: b.r.overdue ? `color-mix(in oklab, #b9573a ${Math.round(8 + k * 62)}%, #fffdf8)` : "var(--color-leaf-wash)", color: k > 0.55 ? "white" : undefined }}
                            title={`${b.name}: ${inr(b.r.overdue)} overdue, ${b.r.overdueStudents} students`}
                          >
                            <span className="num font-semibold block">{b.r.overdue ? inrCompact(b.r.overdue) : "Clear"}</span>
                            <span className={cx("num text-[11.5px]", k > 0.55 ? "text-white/80" : "text-ink-3")}>{b.r.overdueStudents} of {b.r.students}</span>
                          </Link>
                        </td>
                      );
                    })}
                    <td className="text-right px-2 num">
                      <span className="font-semibold">{inrCompact(c.r.overdue)}</span>
                      <span className="block text-[11.5px] text-ink-3">{(late60Share(c.r) * 100).toFixed(1)}% &gt;60d</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="mt-8">
            <SectionTitle aside={inr(ageTotal)}>Ageing of overdue money</SectionTitle>
            <div className="flex h-9 rounded-[6px] overflow-hidden border border-rule" role="img" aria-label="Ageing split">
              {AGEING_BUCKETS.map((b, i) => {
                const v = total.ageing[b.key];
                if (!v) return null;
                return <div key={b.key} style={{ width: `${(v / ageTotal) * 100}%`, background: AGE_COLORS[i] }} title={`${b.label} days: ${inr(v)}`} />;
              })}
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3">
              {AGEING_BUCKETS.map((b, i) => (
                <div key={b.key} className="text-[13px]">
                  <span className="inline-block size-2 rounded-sm mr-1.5" style={{ background: AGE_COLORS[i] }} />
                  <span className="text-ink-3">{b.label} days</span>
                  <p className="num font-semibold text-[15px] mt-0.5">{inrCompact(total.ageing[b.key])}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-8">
          <div>
            <SectionTitle aside="Not yet due">Coming in, next 4 weeks</SectionTitle>
            <Card className="px-4 py-2 ledger">
              {d.weeks.map((w) => (
                <div key={w.from} className="py-3 grid grid-cols-[96px_1fr_auto] items-center gap-3 text-[13.5px]">
                  <span className="text-ink-2">{formatDate(w.from, "en", false)}</span>
                  <div className="h-2 bg-paper-2 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo rounded-full" style={{ width: `${(w.amount / maxWeek) * 100}%` }} />
                  </div>
                  <span className="num text-right w-24">{w.amount ? inrCompact(w.amount) : "None"}<span className="text-ink-3 text-[11.5px] block">{w.count} instalments</span></span>
                </div>
              ))}
            </Card>
          </div>
          <TallyExport today={today} />
        </section>
      </div>
    </>
  );
}

function Figure({ label, value, note, tone, href }: { label: string; value: string; note: string; tone?: "madder"; href?: string }) {
  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p className={cx("display num text-[34px] leading-none mt-2", tone === "madder" && "text-madder")}>{value}</p>
      <p className="text-[12.5px] text-ink-3 mt-2">{note}</p>
    </>
  );
  return href ? <Link href={href} className="block hover:bg-paper-2/60 transition-colors">{body}</Link> : <div>{body}</div>;
}

/** Shows the metric against the brief's baseline (12%) and target (6%). */
function LateGauge({ value }: { value: number }) {
  const scale = 0.16;
  const pos = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  return (
    <div className="mt-3">
      <div className="relative h-1.5 bg-paper-2 rounded-full">
        <div className="absolute inset-y-0 left-0 rounded-full bg-ochre" style={{ width: pos(value) }} />
        <span className="absolute -top-1 h-3.5 w-px bg-leaf" style={{ left: pos(0.06) }} />
        <span className="absolute -top-1 h-3.5 w-px bg-madder" style={{ left: pos(0.12) }} />
      </div>
      <div className="relative h-4 text-[10.5px] text-ink-3 mt-1">
        <span className="absolute -translate-x-1/2" style={{ left: pos(0.06) }}>target 6</span>
        <span className="absolute -translate-x-1/2" style={{ left: pos(0.12) }}>was 12</span>
      </div>
    </div>
  );
}

function Chip({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="h-8 px-3 rounded-full border border-rule bg-card hover:border-ink-3 inline-flex items-center gap-1.5">{children} <span aria-hidden>→</span></Link>;
}
