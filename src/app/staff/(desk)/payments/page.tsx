import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Card, Empty, PageHead, SectionTitle, Tag } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/domain/dates";
import { inr } from "@/domain/money";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { suggestionsFor } from "@/server/payments";
import { ApplyForm, ReturnForm, SimulateCreditForm } from "./forms";

export const metadata = { title: "Payments" };

export default async function Payments() {
  await requireRole("accounts");
  const today = await getToday();
  const [open, done, recent] = await Promise.all([
    db.select().from(schema.unmatchedPayments).where(eq(schema.unmatchedPayments.status, "open")).orderBy(desc(schema.unmatchedPayments.receivedOn)),
    db.select().from(schema.unmatchedPayments).where(eq(schema.unmatchedPayments.status, "matched")).orderBy(desc(schema.unmatchedPayments.resolvedAt)).limit(5),
    db.select({ p: schema.payments, name: schema.students.name }).from(schema.payments).innerJoin(schema.students, eq(schema.students.id, schema.payments.studentId)).orderBy(desc(schema.payments.createdAt)).limit(8),
  ]);
  const withSug = await Promise.all(open.map(async (u) => ({ u, sug: await suggestionsFor(u, today) })));

  return (
    <>
      <PageHead title="Payments" sub="Money that could not be tied to a student with certainty waits here. Nothing is marked paid on a guess." />
      <div className="grid xl:grid-cols-[1.6fr_1fr] gap-8">
        <section>
          <SectionTitle aside={`${open.length} open`}>Unmatched queue</SectionTitle>
          {open.length === 0 ? (
            <Card><Empty title="Queue is clear">Every credit has been placed. New ones appear here when the reference has no valid student ID or the amount does not fit.</Empty></Card>
          ) : (
            <div className="flex flex-col gap-3">
              {withSug.map(({ u, sug }) => (
                <Card key={u.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="display num text-[26px] leading-none">{inr(u.amount)}</p>
                      <p className="text-[13px] text-ink-3 mt-1.5">{u.source.toUpperCase()} · {formatDate(u.receivedOn)} · from {u.payerName || "unknown"}</p>
                      <p className="font-mono text-[12.5px] text-ink-2 mt-1 break-all">{u.reference}</p>
                    </div>
                    <Tag tone="ochre">{u.reason}</Tag>
                  </div>
                  <div className="mt-4 pt-4 border-t border-rule grid sm:grid-cols-[1fr_auto] gap-4 items-end">
                    <div>
                      <p className="eyebrow mb-2">{sug.length ? "Possible matches, check before applying" : "No likely match"}</p>
                      {sug.map((s) => (
                        <p key={s.studentId} className="text-[13.5px]">
                          <Link href={`/staff/students/${s.studentId}`} className="font-medium hover:underline underline-offset-4">{s.view.student.name}</Link>{" "}
                          <span className="num text-ink-3">{s.studentId}</span> · <span className="text-ink-2">{s.why}</span> · owes <span className="num">{inr(s.view.ledger.balance)}</span>
                        </p>
                      ))}
                    </div>
                    <div className="flex items-start gap-2">
                      <ApplyForm id={u.id} suggestion={sug[0]?.studentId} amount={inr(u.amount)} />
                      <ReturnForm id={u.id} amount={inr(u.amount)} payer={u.payerName} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <SectionTitle aside="Latest 8">Recently recorded</SectionTitle>
          <Card className="ledger mt-0">
            {recent.map(({ p, name }) => (
              <div key={p.id} className="px-4 py-2.5 grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_1fr_auto] gap-x-4 items-center text-[13.5px]">
                <Link href={`/staff/students/${p.studentId}`} className="hover:underline underline-offset-4">{name} <span className="text-ink-3 num">{p.studentId}</span></Link>
                <span className="text-ink-3 hidden sm:block">{p.method.toUpperCase()} · {p.recordedBy === "system:gateway" ? "pay link" : p.recordedBy === "system:matcher" ? "auto-matched" : p.recordedBy.startsWith("system") ? "imported" : "desk"}</span>
                <span className="num text-right">{inr(p.amount)}</span>
              </div>
            ))}
          </Card>
          {done.length > 0 && <p className="text-[12.5px] text-ink-3 mt-3">{done.length} queue item{done.length > 1 ? "s" : ""} resolved by hand recently.</p>}
        </section>

        <aside>
          <SectionTitle>Bank credit</SectionTitle>
          <Card className="p-4">
            <p className="text-[13.5px] text-ink-2 mb-4">In production this reads the bank statement feed. Here you can type a line in to see how the matcher decides: it applies a credit only when the narration names a real student and the amount fits what they owe.</p>
            <SimulateCreditForm />
          </Card>
        </aside>
      </div>
    </>
  );
}
