import Link from "next/link";
import { desc } from "drizzle-orm";
import { Card, Empty, Notice, PageHead, SectionTitle, Tag } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/domain/dates";
import { RISK_MODEL, type RiskFactor } from "@/domain/risk";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { loadStudents, riskFor } from "@/server/queries";
import { RiskFactors } from "./factors";
import { ReviewForm } from "./review-form";

export const metadata = { title: "Call list" };

export default async function RiskPage() {
  const s = await requireRole("accounts", "counsellor");
  const today = await getToday();
  const flags = await db.select().from(schema.riskFlags).orderBy(desc(schema.riskFlags.probability));
  const views = await loadStudents(today, { ids: [...new Set(flags.map((f) => f.studentId))] });
  const byId = new Map(views.map((v) => [v.student.id, v]));

  const open = flags.filter((f) => f.status === "open");
  const reviewed = flags.filter((f) => f.status !== "open").sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""));
  const falseN = reviewed.filter((f) => f.status === "false_flag").length;

  // The "unsure" band: shown so counsellors can see what the model is watching, but no task is opened.
  const active = (await loadStudents(today)).filter((v) => v.student.status === "active");
  const risk = await riskFor(active);
  const watch = active
    .map((v) => ({ v, r: risk.get(v.student.id)! }))
    .filter((x) => x.r.band === "watch" && !open.some((f) => f.studentId === x.v.student.id))
    .sort((a, b) => b.r.probability - a.r.probability);

  const canReview = s.role === "counsellor";

  return (
    <>
      <PageHead
        title="Counsellor call list"
        sub="Students the model thinks may drop out, from missed instalments, attendance and test trends."
      />
      <div className="mb-8 max-w-3xl">
        <Notice tone="indigo">
          A flag only opens a call task here. It never changes a fee, stops a reminder or messages a parent. If the model is wrong, mark it as a false flag: it will not come back for 30 days unless the risk rises by 15 points.
          {!canReview && <span className="block mt-1 text-ink-3">You are viewing as accounts. Only counsellors can close tasks.</span>}
        </Notice>
      </div>

      <section className="grid grid-cols-3 gap-px bg-rule border-y border-rule mb-10 [&>*]:bg-paper [&>*]:py-4 [&>*]:px-4 [&>*:first-child]:pl-0 max-w-3xl">
        <Stat k="Open calls" v={String(open.length)} />
        <Stat k="Reviewed" v={String(reviewed.length)} sub={reviewed.length ? `${reviewed.length - falseN} real, ${falseN} false` : "None yet"} />
        <Stat k="Model precision" v={reviewed.length ? `${Math.round(((reviewed.length - falseN) / reviewed.length) * 100)}%` : "n/a"} sub={`${RISK_MODEL.version}, flags at ${RISK_MODEL.highAt * 100}%`} />
      </section>

      <section>
        <SectionTitle aside={`${open.length} open`}>To call</SectionTitle>
        {open.length === 0 ? (
          <Card><Empty title="No one to call right now">New flags appear after the daily job when a student crosses {RISK_MODEL.highAt * 100}% risk on at least two signals.</Empty></Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {open.map((f) => {
              const v = byId.get(f.studentId);
              if (!v) return null;
              const factors = JSON.parse(f.factors) as RiskFactor[];
              return (
                <Card key={f.id} className="p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      {canReview ? <p className="display text-[21px] leading-tight">{v.student.name}</p> : <Link href={`/staff/students/${v.student.id}`} className="display text-[21px] leading-tight hover:underline underline-offset-4">{v.student.name}</Link>}
                      <p className="text-[13px] text-ink-3">{v.student.id} · {v.batch.name} · {v.centre.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="display num text-[28px] leading-none text-madder">{f.probability}%</p>
                      <p className="text-[11.5px] text-ink-3 mt-1">flagged {formatDate(f.createdOn, "en", false)}</p>
                    </div>
                  </div>
                  <RiskFactors factors={factors} />
                  <p className="text-[13px] text-ink-2">Parent: {v.parent.name} · <a className="num underline underline-offset-4" href={`tel:+${v.parent.phone}`}>+{v.parent.phone.slice(0, 2)} {v.parent.phone.slice(2, 7)} {v.parent.phone.slice(7)}</a></p>
                  {canReview && <ReviewForm id={f.id} />}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <SectionTitle aside="No task opened">Watching ({watch.length})</SectionTitle>
        <p className="text-[13.5px] text-ink-3 -mt-1 mb-3 max-w-2xl">The model is unsure about these students: one signal, or a score between {RISK_MODEL.watchAt * 100}% and {RISK_MODEL.highAt * 100}%. They are listed so nothing is hidden, but no one is asked to call.</p>
        {watch.length === 0 ? <Card><Empty title="Nobody on the watch list" /></Card> : (
          <Card className="ledger">
            {watch.slice(0, 12).map(({ v, r }) => (
              <div key={v.student.id} className="px-4 py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[1.2fr_2fr_auto] gap-x-4 gap-y-1 items-center text-[14px]">
                <p className="font-medium">{v.student.name}<span className="block text-[12px] text-ink-3 font-normal">{v.student.id} · {v.centre.name}</span></p>
                <p className="text-ink-2 text-[13px] sm:order-none order-last col-span-2 sm:col-span-1">{r.factors.map((f) => f.label).join(" · ")}</p>
                <span className="num text-ochre font-medium">{Math.round(r.probability * 100)}%</span>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="mt-12">
        <SectionTitle>Reviewed</SectionTitle>
        {reviewed.length === 0 ? <Card><Empty title="Nothing reviewed yet" /></Card> : (
          <Card className="ledger">
            {reviewed.map((f) => {
              const v = byId.get(f.studentId);
              return (
                <div key={f.id} className="px-4 py-3 text-[14px] grid sm:grid-cols-[1fr_2fr] gap-x-6 gap-y-1">
                  <div>
                    <p className="font-medium">{v?.student.name ?? f.studentId}</p>
                    <div className="flex gap-3 items-center mt-0.5">
                      {f.status === "false_flag" ? <Tag tone="ochre">False flag</Tag> : <Tag tone="leaf">Called</Tag>}
                      <span className="text-[12px] text-ink-3 num">{f.probability}% · {f.reviewedAt ? formatDate(f.reviewedAt.slice(0, 10)) : ""}</span>
                    </div>
                  </div>
                  <p className="text-ink-2 text-[13.5px]">{f.reviewNote}</p>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div>
      <p className="eyebrow">{k}</p>
      <p className="display num text-[28px] leading-none mt-1.5">{v}</p>
      {sub && <p className="text-[12px] text-ink-3 mt-1.5">{sub}</p>}
    </div>
  );
}
