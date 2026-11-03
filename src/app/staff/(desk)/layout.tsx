import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { logoutAction } from "@/app/actions/auth";
import { Wordmark } from "@/components/ui";
import { db, schema } from "@/db";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { ClockBar } from "../_c/clock-bar";
import { MobileNav } from "../_c/mobile-nav";
import { Nav, type NavItem } from "../_c/nav";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const s = await requireRole("accounts", "counsellor");
  const today = await getToday();
  const [[unm], [refunds], [flags]] = await Promise.all([
    db.select({ n: count() }).from(schema.unmatchedPayments).where(eq(schema.unmatchedPayments.status, "open")),
    db.select({ n: count() }).from(schema.refunds).where(and(eq(schema.refunds.status, "pending_approval"))),
    db.select({ n: count() }).from(schema.riskFlags).where(eq(schema.riskFlags.status, "open")),
  ]);

  const items: NavItem[] =
    s.role === "counsellor"
      ? [{ href: "/staff/risk", label: "Call list", count: flags.n }]
      : [
          { href: "/staff", label: "Dues" },
          { href: "/staff/students", label: "Students" },
          { href: "/staff/payments", label: "Payments", count: unm.n },
          { href: "/staff/reminders", label: "Reminders" },
          { href: "/staff/refunds", label: "Refunds", count: refunds.n },
          { href: "/staff/risk", label: "Call list", count: flags.n },
          { href: "/staff/uploads", label: "Uploads" },
        ];
  const weekday = WEEKDAYS[new Date(today + "T00:00:00Z").getUTCDay()];

  return (
    <div className="min-h-dvh flex flex-col">
      {process.env.DEMO_MODE === "true" && <ClockBar today={today} weekday={weekday} />}
      <div className="flex-1 flex">
        <aside className="hidden lg:flex w-[232px] shrink-0 flex-col border-r border-rule px-4 py-6 sticky top-0 h-dvh">
          <Link href={s.role === "counsellor" ? "/staff/risk" : "/staff"} className="px-3"><Wordmark /></Link>
          <nav className="mt-8 flex-1" aria-label="Desk"><Nav items={items} /></nav>
          <div className="px-3 text-[13px]">
            <p className="font-medium">{s.name}</p>
            <p className="text-ink-3 capitalize">{s.role}</p>
            <form action={logoutAction}><button className="text-ink-2 hover:text-ink mt-2 underline underline-offset-4 decoration-rule">Log out</button></form>
          </div>
        </aside>
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="lg:hidden relative flex items-center justify-between px-4 h-14 border-b border-rule">
            <Wordmark />
            <div className="flex items-center gap-2">
              <form action={logoutAction}><button className="text-[13px] text-ink-2 px-2">Log out</button></form>
              <MobileNav items={items} />
            </div>
          </header>
          <main className="flex-1 px-4 sm:px-6 lg:px-10 py-7 lg:py-9 max-w-[1240px] w-full">{children}</main>
        </div>
      </div>
    </div>
  );
}
