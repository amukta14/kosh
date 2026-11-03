import Link from "next/link";
import { and, desc, eq, gte } from "drizzle-orm";
import { AutoForm } from "@/components/auto-form";
import { Card, Empty, PageHead, SectionTitle, Select, Tag, cx } from "@/components/ui";
import { db, schema } from "@/db";
import { addDays, daysBetween, formatDate } from "@/domain/dates";
import { inr } from "@/domain/money";
import { REMINDER_OFFSETS, offsetLabel } from "@/domain/reminders";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { loadStudents } from "@/server/queries";
import { RunNow } from "./run";

export const metadata = { title: "Reminders" };

export default async function Reminders({ searchParams }: { searchParams: Promise<{ lang?: string; kind?: string }> }) {
  await requireRole("accounts");
  const sp = await searchParams;
  const today = await getToday();
  const since = addDays(today, -13);
  const rows = await db
    .select({ r: schema.reminders, name: schema.students.name })
    .from(schema.reminders)
    .innerJoin(schema.students, eq(schema.students.id, schema.reminders.studentId))
    .where(and(eq(schema.reminders.status, "sent"), gte(schema.reminders.sentOn, since)))
    .orderBy(desc(schema.reminders.sentOn), schema.reminders.studentId);

  const filtered = rows.filter(({ r }) => (!sp.lang || r.language === sp.lang) && (!sp.kind || (sp.kind === "before" ? r.offsetDays < 0 : sp.kind === "on" ? r.offsetDays === 0 : r.offsetDays > 0)));

  // What payment did to the schedule: steps that will never be sent because the instalment was cleared.
  const views = (await loadStudents(today)).filter((v) => v.student.status === "active");
  let stoppedSteps = 0;
  let stoppedInstalments = 0;
  let upcoming = 0;
  for (const v of views)
    for (const i of v.ledger.instalments) {
      const future = REMINDER_OFFSETS.filter((o) => daysBetween(today, addDays(i.dueDate, o)) > 0).length;
      if (i.balance <= 0 && future > 0 && daysBetween(i.dueDate, today) > -8) {
        stoppedSteps += future;
        stoppedInstalments++;
      }
      if (i.balance > 0 && REMINDER_OFFSETS.some((o) => addDays(i.dueDate, o) === addDays(today, 1))) upcoming++;
    }

  const byDay = new Map<string, typeof filtered>();
  for (const x of filtered) byDay.set(x.r.sentOn, [...(byDay.get(x.r.sentOn) ?? []), x]);
  const sentToday = rows.filter((x) => x.r.sentOn === today).length;

  return (
    <>
      <PageHead title="Reminders" sub="Sent automatically before, on and after each due date, in the parent's language. They stop as soon as the instalment is paid." actions={<RunNow />} />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule border-y border-rule mb-10 [&>*]:bg-paper [&>*]:py-4 [&>*]:px-4 lg:[&>*:first-child]:pl-0">
        <Stat k="Sent today" v={String(sentToday)} />
        <Stat k="Last 14 days" v={String(rows.length)} sub={`${rows.filter((x) => x.r.language === "hi").length} in Hindi`} />
        <Stat k="Going out tomorrow" v={String(upcoming)} />
        <Stat k="Stopped by payment" v={String(stoppedSteps)} sub={`future steps across ${stoppedInstalments} recently paid instalments`} tone="leaf" />
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <SectionTitle>Outbox, last 14 days</SectionTitle>
        <AutoForm className="flex gap-2">
          <Select name="kind" defaultValue={sp.kind ?? ""} aria-label="Timing" className="h-9 w-auto">
            <option value="">All timings</option><option value="before">Before due</option><option value="on">On due date</option><option value="after">After due</option>
          </Select>
          <Select name="lang" defaultValue={sp.lang ?? ""} aria-label="Language" className="h-9 w-auto">
            <option value="">Both languages</option><option value="hi">Hindi</option><option value="en">English</option>
          </Select>
          <button type="submit" className="sr-only">Filter</button>
        </AutoForm>
      </div>

      {filtered.length === 0 ? (
        <Card><Empty title="No reminders in this view">Move the demo clock forward a day to see the job send the next round.</Empty></Card>
      ) : (
        <div className="flex flex-col gap-8">
          {[...byDay.entries()].map(([day, items]) => (
            <section key={day}>
              <p className="eyebrow mb-2">{day === today ? "Today" : formatDate(day)} · {items.length}</p>
              <Card className="ledger">
                {items.slice(0, 40).map(({ r, name }) => (
                  <div key={r.id} className="px-4 py-3 grid md:grid-cols-[200px_1fr_110px] gap-x-5 gap-y-1.5 text-[13.5px]">
                    <div>
                      <Link href={`/staff/students/${r.studentId}`} className="font-medium hover:underline underline-offset-4">{name}</Link>
                      <div className="flex gap-2 items-center mt-0.5">
                        <Tag tone={r.offsetDays < 0 ? "ink" : r.offsetDays === 0 ? "ochre" : "madder"}>{offsetLabel(r.offsetDays)}</Tag>
                        <span className="text-[11.5px] text-ink-3 uppercase">{r.channel} · {r.language}</span>
                      </div>
                    </div>
                    <p className={cx("text-ink-2 whitespace-pre-line break-words", r.language === "hi" && "hi")}>{r.body}</p>
                    <p className="num md:text-right text-ink-2">{inr(r.balanceAtSend)}</p>
                  </div>
                ))}
                {items.length > 40 && <p className="px-4 py-3 text-[13px] text-ink-3">and {items.length - 40} more</p>}
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: "leaf" }) {
  return (
    <div>
      <p className="eyebrow">{k}</p>
      <p className={cx("display num text-[28px] leading-none mt-1.5", tone === "leaf" && "text-leaf")}>{v}</p>
      {sub && <p className="text-[12px] text-ink-3 mt-1.5">{sub}</p>}
    </div>
  );
}
