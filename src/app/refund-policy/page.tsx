import Link from "next/link";
import { Wordmark } from "@/components/ui";
import { formatDate } from "@/domain/dates";
import { REFUND_POLICY } from "@/domain/refund";

export const metadata = { title: "Refund policy" };

export default function RefundPolicy() {
  return (
    <main className="max-w-[760px] mx-auto px-5 py-6">
      <Link href="/"><Wordmark /></Link>
      <header className="mt-12 mb-10">
        <p className="eyebrow">Published as required by the Ministry of Education guidelines for coaching centres, 2024</p>
        <h1 className="display text-[40px] leading-tight mt-2">Refund policy</h1>
        <p className="hi text-[20px] text-ink-2">रिफ़ंड नीति</p>
        <p className="text-[13.5px] text-ink-3 mt-3 num">Version {REFUND_POLICY.version} · in force from {formatDate(REFUND_POLICY.effectiveFrom)}</p>
      </header>
      <ol className="flex flex-col">
        {REFUND_POLICY.clauses.map((c) => (
          <li key={c.id} className="grid grid-cols-[48px_1fr] gap-2 py-5 border-t border-rule">
            <span className="display text-[20px] text-indigo">{c.id}</span>
            <div>
              <p className="text-[16px] leading-relaxed">{c.en}</p>
              <p className="hi text-[15.5px] text-ink-2 leading-relaxed mt-1.5">{c.hi}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-[10px] bg-paper-2 p-5 text-[14.5px]">
        <p className="font-semibold">Worked example</p>
        <p className="text-ink-2 mt-1 num">
          Net fee ₹1,20,000 for a 360-day course. A student leaves after 210 days having paid ₹90,000. Fee for days used = 1,20,000 × 210 ÷ 360 = ₹70,000. Refund = 90,000 − 70,000 = <b className="text-ink">₹20,000</b>, paid within 10 days of the written request.
        </p>
      </div>
      <p className="text-[12.5px] text-ink-3 mt-10">The calculator used by our accounts desk runs these exact clauses. Every refund records the policy version it was worked out under.</p>
    </main>
  );
}
