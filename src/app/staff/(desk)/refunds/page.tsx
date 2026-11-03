import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ButtonLink, Card, Empty, PageHead, Tag, cx } from "@/components/ui";
import { db, schema } from "@/db";
import { daysBetween, formatDate } from "@/domain/dates";
import { inr } from "@/domain/money";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";

export const metadata = { title: "Refunds" };

const STATUS = { pending_approval: ["ochre", "Waiting for approval"], approved: ["indigo", "Approved, to pay"], paid: ["leaf", "Paid"] } as const;

export default async function Refunds() {
  await requireRole("accounts");
  const today = await getToday();
  const rows = await db
    .select({ r: schema.refunds, name: schema.students.name })
    .from(schema.refunds)
    .innerJoin(schema.students, eq(schema.students.id, schema.refunds.studentId))
    .orderBy(desc(schema.refunds.requestDate));

  return (
    <>
      <PageHead
        title="Refunds"
        sub="Worked out by the published policy and paid within 10 days of the written request."
        actions={<><ButtonLink href="/refund-policy" tone="ghost">Policy</ButtonLink><ButtonLink href="/staff/refunds/new">New refund</ButtonLink></>}
      />
      <Card className="overflow-x-auto">
        {rows.length === 0 ? <Empty title="No refunds yet" action={<ButtonLink href="/staff/refunds/new" size="sm">Start one</ButtonLink>} /> : (
          <table className="w-full text-[14px] min-w-[640px]">
            <thead className="text-left text-ink-3 text-[12px] uppercase tracking-wider">
              <tr className="border-b border-rule">
                <th className="font-semibold px-4 py-3">Student</th>
                <th className="font-semibold px-3 py-3">Requested</th>
                <th className="font-semibold px-3 py-3 text-right">Refund</th>
                <th className="font-semibold px-3 py-3">Deadline</th>
                <th className="font-semibold px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="ledger">
              {rows.map(({ r, name }) => {
                const left = daysBetween(today, r.deadline);
                const [tone, label] = STATUS[r.status];
                return (
                  <tr key={r.id} className="relative hover:bg-paper/70">
                    <td className="px-4 py-3"><Link href={`/staff/refunds/${r.id}`} className="font-medium after:absolute after:inset-0">{name}</Link><span className="block text-[12px] text-ink-3 num">{r.studentId}</span></td>
                    <td className="px-3 py-3 num text-ink-2">{formatDate(r.requestDate)}</td>
                    <td className="px-3 py-3 num text-right font-medium">{inr(r.refundAmount)}</td>
                    <td className="px-3 py-3 num">
                      {formatDate(r.deadline)}
                      {r.status !== "paid" && <span className={cx("block text-[12px]", left <= 3 ? "text-madder font-medium" : "text-ink-3")}>{left >= 0 ? `${left} days left` : `${-left} days late`}</span>}
                    </td>
                    <td className="px-4 py-3"><Tag tone={tone}>{label}</Tag></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
