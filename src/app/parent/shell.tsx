import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { setLanguage } from "@/app/actions/parent";
import { cx, Mark } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";
import type { StudentView } from "@/server/queries";

export function ParentShell({ lang, kids, current, tab, path, children }: { lang: Lang; kids: StudentView[]; current: StudentView; tab: "pay" | "fees" | "progress"; path: string; children: ReactNode }) {
  const d = t(lang);
  const q = kids.length > 1 ? `?c=${current.student.id}` : "";
  return (
    <div lang={lang} className={cx("min-h-dvh flex flex-col", lang === "hi" && "hi")}>
      <header className="px-4 pt-4 pb-2 flex items-center justify-between max-w-[520px] w-full mx-auto">
        <Link href={`/parent${q}`} className="text-indigo" aria-label="Kosh home"><Mark size={24} /></Link>
        <div className="flex items-center gap-1">
          <form action={setLanguage} className="flex rounded-[7px] border border-rule overflow-hidden text-[13px]">
            <input type="hidden" name="back" value={`${path}${q}`} />
            <button name="lang" value="en" className={cx("px-2.5 h-8", lang === "en" ? "bg-ink text-paper" : "text-ink-2")} aria-pressed={lang === "en"}>EN</button>
            <button name="lang" value="hi" className={cx("px-2.5 h-8 hi", lang === "hi" ? "bg-ink text-paper" : "text-ink-2")} aria-pressed={lang === "hi"}>हिं</button>
          </form>
          <form action={logoutAction}>
            <button className="h-8 px-2.5 text-[13px] text-ink-2 hover:text-ink">{d.logout}</button>
          </form>
        </div>
      </header>

      {kids.length > 1 && (
        <nav className="px-4 max-w-[520px] w-full mx-auto" aria-label={d.child}>
          <div className="flex gap-1 p-1 bg-paper-2 rounded-[9px]">
            {kids.map((k) => (
              <Link key={k.student.id} href={`${path}?c=${k.student.id}`} className={cx("flex-1 text-center h-9 grid place-items-center rounded-[7px] text-[14px]", k.student.id === current.student.id ? "bg-card shadow-[0_1px_0_var(--color-rule)] font-medium" : "text-ink-2")}>
                {k.student.name.split(" ")[0]}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <main className="flex-1 px-4 pb-28 pt-3 max-w-[520px] w-full mx-auto">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-paper/95 backdrop-blur border-t border-rule no-print" aria-label="Sections">
        <div className="max-w-[520px] mx-auto grid grid-cols-3 h-16">
          {([["pay", "/parent", d.tabPay], ["fees", "/parent/fees", d.tabFees], ["progress", "/parent/progress", d.tabProgress]] as const).map(([k, href, label]) => (
            <Link key={k} href={`${href}${q}`} aria-current={tab === k ? "page" : undefined} className={cx("grid place-items-center text-[14px] relative", tab === k ? "text-ink font-semibold" : "text-ink-3")}>
              {tab === k && <span className="absolute top-0 h-[3px] w-10 bg-indigo rounded-b" />}
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
