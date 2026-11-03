import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Mark } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/domain/dates";
import { gstSplit, inr, inr2, rupeesInWords, SAC_CODE } from "@/domain/money";
import { COMPANY } from "@/lib/company";
import { getSession } from "@/server/auth";
import { getToday } from "@/server/clock";
import { validReceiptKey } from "@/server/paylink";
import { loadStudent } from "@/server/queries";
import { PrintButton } from "./print";

export const metadata = { title: "Receipt", robots: { index: false } };

export default async function Receipt({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string }> }) {
  const { id } = await params;
  const { k } = await searchParams;
  const p = await db.query.payments.findFirst({ where: eq(schema.payments.id, id) });
  if (!p) notFound();
  const view = await loadStudent(await getToday(), p.studentId);
  if (!view) notFound();

  // Who may see this: staff, the student's own parent, or anyone holding the signed link from the payment page.
  const s = await getSession();
  const allowed = (s && s.role !== "parent") || (s?.role === "parent" && s.sub === view.student.parentId) || (k && validReceiptKey(p.id, k));
  if (!allowed) notFound();

  const g = gstSplit(p.amount);
  const back = s?.role === "parent" ? "/parent/fees" : s ? `/staff/students/${view.student.id}` : null;

  return (
    <main className="min-h-dvh px-4 py-6 sm:py-12">
      <div className="max-w-[640px] mx-auto">
        <div className="flex justify-between items-center mb-4 no-print">
          {back ? <Link href={back} className="text-[14px] text-ink-2 hover:text-ink">← Back</Link> : <span />}
          <PrintButton />
        </div>
        <article className="bg-card border border-rule rounded-[4px] p-6 sm:p-10 relative overflow-hidden print:border-0 print:p-0">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-[repeating-linear-gradient(90deg,var(--color-indigo)_0_14px,var(--color-madder)_14px_20px,var(--color-ochre)_20px_26px)]" aria-hidden />
          <header className="flex justify-between gap-6 items-start">
            <div>
              <div className="flex items-center gap-2 text-indigo"><Mark size={26} /><span className="display text-[20px] text-ink">{COMPANY.legalName}</span></div>
              <p className="text-[12.5px] text-ink-3 mt-1">{view.centre.address}</p>
              <p className="text-[12.5px] text-ink-3">GSTIN {COMPANY.gstin} · {COMPANY.state}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="eyebrow">Fee receipt</p>
              <p className="num text-[15px] font-semibold mt-1">{p.receiptNo}</p>
              <p className="text-[13px] text-ink-2">{formatDate(p.receivedOn)}</p>
            </div>
          </header>

          <div className="grid sm:grid-cols-2 gap-4 mt-8 text-[14px]">
            <div>
              <p className="eyebrow mb-1">Received from</p>
              <p>{view.parent.name}</p>
              <p className="text-ink-2">for {view.student.name} ({view.student.id})</p>
              <p className="text-ink-2">{view.batch.name} · {view.centre.name}</p>
            </div>
            <div className="sm:text-right">
              <p className="eyebrow mb-1">Paid by</p>
              <p>{p.method.toUpperCase()}</p>
              <p className="text-ink-2 font-mono text-[12.5px] break-all">{p.reference}</p>
            </div>
          </div>

          <table className="w-full mt-8 text-[14px] num">
            <thead>
              <tr className="border-b border-ink text-left">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium">SAC</th>
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="ledger">
              <tr><td className="py-2.5">Coaching fee, {view.batch.course} 2027 programme</td><td>{SAC_CODE}</td><td className="text-right">{inr2(g.taxable)}</td></tr>
              <tr><td className="py-2.5 text-ink-2">CGST @ 9%</td><td /><td className="text-right">{inr2(g.cgst)}</td></tr>
              <tr><td className="py-2.5 text-ink-2">SGST @ 9%</td><td /><td className="text-right">{inr2(g.sgst)}</td></tr>
              <tr className="border-t-2 border-ink"><td className="py-3 font-semibold">Total received</td><td /><td className="text-right font-semibold text-[17px]">{inr2(g.total)}</td></tr>
            </tbody>
          </table>
          <p className="text-[13px] text-ink-2 mt-2">{rupeesInWords(p.amount)}</p>

          <footer className="mt-10 flex justify-between items-end gap-6">
            <p className="text-[11.5px] text-ink-3 max-w-[40ch]">Computer-generated receipt, no signature needed. Refunds follow the published refund policy at /refund-policy. Balance on the course after this payment: {inr(view.ledger.balance)}.</p>
            <div className="border-[3px] border-leaf text-leaf rounded-[6px] px-3 py-1 display text-[20px] tracking-wider uppercase -rotate-6 shrink-0">Paid</div>
          </footer>
        </article>
      </div>
    </main>
  );
}
