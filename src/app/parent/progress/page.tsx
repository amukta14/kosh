import Link from "next/link";
import { ButtonLink, Card, Empty, SectionTitle, cx } from "@/components/ui";
import { formatDate, formatMonth } from "@/domain/dates";
import { t } from "@/lib/i18n";
import { parentContext } from "@/server/parent";
import { loadAcademics } from "@/server/queries";
import { ParentShell } from "../shell";

export const metadata = { title: "Progress" };

export default async function ParentProgress({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const { parent, kids, current, lang } = await parentContext(c);
  const d = t(lang);

  if (!parent.consentAt) {
    return (
      <ParentShell lang={lang} kids={kids} current={current} tab="progress" path="/parent/progress">
        <Card className="mt-4 p-6 text-center">
          <p className="text-ink-2">{d.consentGate}</p>
          <ButtonLink href="/consent?force=1" className="mt-4">{lang === "hi" ? "सहमति दें" : "Give consent"}</ButtonLink>
        </Card>
      </ParentShell>
    );
  }

  const { attendance, tests } = await loadAcademics([current.student.id]);
  const att = (attendance.get(current.student.id) ?? []).sort((a, b) => a.month.localeCompare(b.month));
  const scores = (tests.get(current.student.id) ?? []).sort((a, b) => a.testDate.localeCompare(b.testDate));
  const pts = scores.map((s) => (s.score / s.maxScore) * 100);

  return (
    <ParentShell lang={lang} kids={kids} current={current} tab="progress" path="/parent/progress">
      <section className="mt-3">
        <SectionTitle aside={att.length ? `${Math.round((att.reduce((a, x) => a + x.present, 0) / att.reduce((a, x) => a + x.total, 0)) * 100)}%` : undefined}>{d.attendance}</SectionTitle>
        {att.length === 0 ? (
          <Card><Empty title={d.noData} /></Card>
        ) : (
          <Card className="px-4 pt-5 pb-3">
            <div className="flex items-end gap-2 h-32">
              {att.map((a) => {
                const p = (a.present / a.total) * 100;
                return (
                  <div key={a.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end" title={d.present(a.present, a.total)}>
                    <span className="text-[11px] num text-ink-3">{Math.round(p)}</span>
                    <div className={cx("w-full rounded-t-[4px]", p < 75 ? "bg-madder" : p < 85 ? "bg-ochre" : "bg-indigo")} style={{ height: `${p}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2 border-t border-rule pt-2">
              {att.map((a) => <span key={a.month} className="flex-1 text-center text-[11px] text-ink-3">{formatMonth(a.month).split(" ")[0]}</span>)}
            </div>
          </Card>
        )}
      </section>

      <section className="mt-8">
        <SectionTitle>{d.tests}</SectionTitle>
        {scores.length === 0 ? (
          <Card><Empty title={d.noData} /></Card>
        ) : (
          <Card className="px-4">
            {pts.length > 1 && <Spark pts={pts} />}
            <div className="ledger">
              {[...scores].reverse().map((s) => (
                <div key={s.testName} className="py-3 flex justify-between items-baseline">
                  <div>
                    <p className="text-[15px]">{s.testName}</p>
                    <p className="text-[12.5px] text-ink-3">{formatDate(s.testDate, lang)}</p>
                  </div>
                  <p className="num text-[15px]">
                    {s.score}<span className="text-ink-3"> / {s.maxScore}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
      <p className="text-[12.5px] text-ink-3 mt-6 px-1">
        {lang === "hi" ? "सवाल हों तो सेंटर के काउंसलर से बात करें।" : "Worried about something here? The centre counsellor can help."}{" "}
        <Link href="/refund-policy" className="underline underline-offset-4">{d.refundPolicy}</Link>
      </p>
    </ParentShell>
  );
}

function Spark({ pts }: { pts: number[] }) {
  const w = 300, h = 70, pad = 6;
  const xs = (i: number) => pad + (i * (w - pad * 2)) / (pts.length - 1);
  const ys = (v: number) => h - pad - (v / 100) * (h - pad * 2);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[70px] mt-4 mb-1" aria-hidden>
      <line x1={pad} x2={w - pad} y1={ys(50)} y2={ys(50)} stroke="var(--color-rule)" strokeDasharray="3 4" />
      <path d={line} fill="none" stroke="var(--color-indigo)" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((v, i) => <circle key={i} cx={xs(i)} cy={ys(v)} r={i === pts.length - 1 ? 3.5 : 2.2} fill="var(--color-indigo)" />)}
    </svg>
  );
}
