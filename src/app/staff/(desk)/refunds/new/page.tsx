import Link from "next/link";
import { ButtonLink, Card, Empty, Input, Kv, PageHead } from "@/components/ui";
import { Submit } from "@/components/submit";
import { formatDate } from "@/domain/dates";
import { inr } from "@/domain/money";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { loadStudent } from "@/server/queries";
import { RefundCalculator } from "./calculator";

export const metadata = { title: "New refund" };

export default async function NewRefund({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  await requireRole("accounts");
  const { student } = await searchParams;
  const today = await getToday();
  const id = (student ?? "").trim().toUpperCase();
  const v = /^STU-\d{4}$/.test(id) ? await loadStudent(today, id) : null;

  if (!v) {
    return (
      <>
        <PageHead title="New refund" sub="Find the student who is leaving." />
        <Card className="p-5 max-w-md">
          <form className="flex gap-2">
            <Input name="student" defaultValue={student} placeholder="STU-0587" className="num uppercase" aria-label="Student ID" />
            <Submit>Find</Submit>
          </form>
          {student && <p className="text-[13.5px] text-madder mt-3">No student with ID {student}.</p>}
        </Card>
      </>
    );
  }

  if (v.student.status !== "active") {
    return (
      <>
        <PageHead title={`Refund for ${v.student.name}`} />
        <Card><Empty title="This student has already withdrawn" action={<ButtonLink href="/staff/refunds" tone="secondary">See refunds</ButtonLink>} /></Card>
      </>
    );
  }

  return (
    <>
      <p className="text-[13px] text-ink-3 mb-2"><Link href="/staff/refunds" className="hover:text-ink">Refunds</Link> / new</p>
      <PageHead title={`Refund for ${v.student.name}`} sub={`${v.student.id} · ${v.batch.name} · ${v.centre.name}`} />
      <div className="flex flex-wrap gap-x-8 -mt-3 mb-8 text-[13.5px] max-w-3xl [&>*]:py-0">
        <Kv k="Course" v={`${formatDate(v.batch.startDate)} to ${formatDate(v.batch.endDate)}`} />
        <Kv k="Net fee" v={inr(v.plan.netFee)} />
        <Kv k="Paid" v={inr(v.ledger.totalPaid)} />
      </div>
      <RefundCalculator
        today={today}
        s={{ id: v.student.id, courseStart: v.batch.startDate, courseEnd: v.batch.endDate, enrolledOn: v.student.enrolledOn, netFee: v.plan.netFee, totalPaid: v.ledger.totalPaid }}
      />
    </>
  );
}
