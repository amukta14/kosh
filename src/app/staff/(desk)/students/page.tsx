import Link from "next/link";
import { AutoForm } from "@/components/auto-form";
import { ButtonLink, Card, Empty, Input, PageHead, Select } from "@/components/ui";
import { LedgerTag, RiskTag } from "@/components/status";
import { formatDate } from "@/domain/dates";
import { inr } from "@/domain/money";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { listCentresAndBatches, loadStudents, riskFor } from "@/server/queries";

export const metadata = { title: "Students" };

const STATUSES = [
  ["", "All"],
  ["overdue", "Overdue"],
  ["late60", "Over 60 days late"],
  ["soon", "Due in 14 days"],
  ["clear", "Up to date"],
  ["risk", "At risk or watch"],
  ["withdrawn", "Withdrawn"],
] as const;

type SP = { q?: string; centre?: string; batch?: string; status?: string };

export default async function Students({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("accounts");
  const sp = await searchParams;
  const today = await getToday();
  const [views, { centres, batches }] = await Promise.all([loadStudents(today), listCentresAndBatches()]);
  const risk = await riskFor(views);
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);

  const rows = views
    .filter((v) => !sp.centre || v.centre.id === sp.centre)
    .filter((v) => !sp.batch || v.batch.id === sp.batch)
    .filter((v) => !q || v.student.name.toLowerCase().includes(q) || v.student.id.toLowerCase().includes(q) || v.parent.phone.includes(q.replace(/\D/g, "") || "~"))
    .filter((v) => {
      const active = v.student.status === "active";
      switch (sp.status) {
        case "overdue": return active && v.ledger.overdue > 0;
        case "late60": return active && v.ledger.maxDaysOverdue > 60;
        case "soon": return active && !!v.ledger.next && v.ledger.next.status !== "overdue" && v.ledger.next.daysUntilDue <= 14;
        case "clear": return active && v.ledger.overdue === 0;
        case "risk": return active && ["high", "watch"].includes(risk.get(v.student.id)!.band);
        case "withdrawn": return !active;
        default: return true;
      }
    })
    .sort((a, b) => b.ledger.maxDaysOverdue - a.ledger.maxDaysOverdue || b.ledger.overdue - a.ledger.overdue || a.student.id.localeCompare(b.student.id));

  const totalOverdue = rows.reduce((a, v) => a + (v.student.status === "active" ? v.ledger.overdue : 0), 0);
  const batchName = batches.find((b) => b.id === sp.batch);

  return (
    <>
      <PageHead title="Students" sub={`${rows.length} shown · ${inr(totalOverdue)} overdue in this view`} />
      <AutoForm className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1.2fr_1fr_auto] gap-2 mb-5" role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Name, STU-0587 or phone" className="col-span-2 md:col-span-1" aria-label="Search" />
        <Select name="centre" defaultValue={sp.centre ?? ""} aria-label="Centre">
          <option value="">All centres</option>
          {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select name="batch" defaultValue={sp.batch ?? ""} aria-label="Batch">
          <option value="">All batches</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{centres.find((c) => c.id === b.centreId)?.name} · {b.name.replace(" 2027", "")}</option>)}
        </Select>
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status">
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <ButtonLink href="/staff/students" tone="ghost" className="col-span-2 md:col-span-1">Clear</ButtonLink>
        <button type="submit" className="sr-only">Filter</button>
      </AutoForm>
      {batchName && <p className="text-[13px] text-ink-3 -mt-2 mb-4">Batch: {centres.find((c) => c.id === batchName.centreId)?.name} · {batchName.name}</p>}

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty title="No students match" action={<ButtonLink href="/staff/students" tone="secondary" size="sm">Clear filters</ButtonLink>}>Try a different name, batch or status.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] min-w-[760px]">
              <thead className="text-left text-ink-3 text-[12px] uppercase tracking-wider">
                <tr className="border-b border-rule">
                  <th className="font-semibold px-4 py-3">Student</th>
                  <th className="font-semibold px-3 py-3">Batch</th>
                  <th className="font-semibold px-3 py-3">Next due</th>
                  <th className="font-semibold px-3 py-3 text-right">Overdue</th>
                  <th className="font-semibold px-3 py-3 text-right">Balance</th>
                  <th className="font-semibold px-3 py-3">Status</th>
                  <th className="font-semibold px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="ledger">
                {rows.map((v) => (
                  <tr key={v.student.id} className="hover:bg-paper/70 relative">
                    <td className="px-4 py-3">
                      <Link href={`/staff/students/${v.student.id}`} className="font-medium hover:underline underline-offset-4 after:absolute after:inset-0">{v.student.name}</Link>
                      <span className="block text-[12px] text-ink-3 num">{v.student.id}</span>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{v.batch.name.replace(" 2027", "")}<span className="block text-[12px] text-ink-3">{v.centre.name}</span></td>
                    <td className="px-3 py-3 num text-ink-2">{v.ledger.next ? <>{inr(v.ledger.next.balance)}<span className="block text-[12px] text-ink-3">{formatDate(v.ledger.next.dueDate)}</span></> : "None"}</td>
                    <td className="px-3 py-3 num text-right">{v.ledger.overdue ? <span className="text-madder font-medium">{inr(v.ledger.overdue)}</span> : <span className="text-ink-3">0</span>}</td>
                    <td className="px-3 py-3 num text-right">{inr(v.ledger.balance)}</td>
                    <td className="px-3 py-3"><LedgerTag l={v.ledger} withdrawn={v.student.status !== "active"} /></td>
                    <td className="px-4 py-3">{v.student.status === "active" && <RiskTag band={risk.get(v.student.id)!.band} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
