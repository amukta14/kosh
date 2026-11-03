import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/ui";
import { getSession } from "@/server/auth";

export default async function Home() {
  const s = await getSession();
  if (s) redirect(s.role === "parent" ? "/parent" : s.role === "counsellor" ? "/staff/risk" : "/staff");
  const demo = process.env.DEMO_MODE === "true";

  return (
    <main className="min-h-dvh flex flex-col max-w-[1080px] mx-auto px-5 sm:px-8">
      <header className="py-6 flex justify-between items-center">
        <Wordmark sub="Company A, Jaipur" />
        <Link href="/refund-policy" className="text-[13px] text-ink-2 hover:text-ink">Refund policy</Link>
      </header>

      <section className="flex-1 grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-20 items-center py-10">
        <div className="rise">
          <h1 className="display text-[44px] sm:text-[58px] leading-[1.02] tracking-tight">
            Fees, clearly.
            <br />
            <span className="text-ink-3">No phone calls.</span>
          </h1>
          <p className="text-ink-2 text-[17px] mt-6 max-w-[34ch]">
            Parents see what is due and pay in one tap. The accounts desk sees every centre and batch in one place.
          </p>
          <p className="hi text-ink-3 text-[16px] mt-2">फ़ीस की पूरी जानकारी, एक जगह।</p>
        </div>

        <div className="flex flex-col gap-3 rise" style={{ animationDelay: "80ms" }}>
          <Door href="/login" eyebrow="Parents · अभिभावक" title="Log in with your mobile" note="One-time code. No password." />
          <Door href="/staff/login" eyebrow="Staff" title="Accounts and counselling desk" note="Work email and password." />
          {demo && (
            <div className="mt-4 rounded-[10px] border border-dashed border-rule p-4 text-[13.5px] text-ink-2 leading-relaxed">
              <p className="eyebrow mb-2">For reviewers</p>
              <p>Parent: <b className="num text-ink">98290 00587</b> (Ishita, overdue) or <b className="num text-ink">98290 00412</b> (two children). The code is shown on screen.</p>
              <p className="mt-1">Accounts: <b className="text-ink">neha@companya.test</b> · Counsellor: <b className="text-ink">vikram@companya.test</b> · Password <b className="text-ink">kosh-demo-2026</b></p>
            </div>
          )}
        </div>
      </section>

      <footer className="py-6 text-[12.5px] text-ink-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-rule">
        <span>Gopalpura</span><span>Mansarovar</span><span>Vaishali Nagar</span><span>Raja Park</span>
      </footer>
    </main>
  );
}

function Door({ href, eyebrow, title, note }: { href: string; eyebrow: string; title: string; note: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between gap-4 bg-card border border-rule rounded-[12px] px-5 py-5 hover:border-indigo transition-colors">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <p className="display text-[22px] mt-1">{title}</p>
        <p className="text-[13.5px] text-ink-3 mt-0.5">{note}</p>
      </div>
      <span className="text-indigo text-2xl transition-transform group-hover:translate-x-1" aria-hidden>→</span>
    </Link>
  );
}
