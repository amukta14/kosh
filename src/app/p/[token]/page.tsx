import { startCheckout } from "@/app/actions/pay";
import { Amount, Mark, Notice, cx } from "@/components/ui";
import { Submit } from "@/components/submit";
import { formatDate } from "@/domain/dates";
import { inr } from "@/domain/money";
import { t } from "@/lib/i18n";
import { payContext } from "@/server/paypage";

export const metadata = { title: "Pay fee", robots: { index: false } };

export default async function PayLink({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const { view, state, lang, token: tok } = await payContext(token);
  const d = t(lang);
  const first = view.student.name.split(" ")[0];
  const hi = lang === "hi";

  return (
    <main lang={lang} className={cx("min-h-dvh px-5 py-6 max-w-[440px] mx-auto flex flex-col", hi && "hi")}>
      <div className="flex items-center gap-2 text-indigo"><Mark /><span className="text-[13px] text-ink-3">Company A · {view.centre.name}</span></div>
      <div className="flex-1 flex flex-col justify-center py-10 rise">
        <p className="eyebrow">{first} · {d.instalment(state.seq)}</p>
        {state.balance <= 0 ? (
          <>
            <p className="display text-[34px] text-leaf mt-3">{hi ? "यह किस्त जमा है" : "This instalment is paid"}</p>
            <p className="text-ink-2 mt-2">{hi ? "धन्यवाद। इस किस्त के रिमाइंडर बंद हो गए हैं।" : "Thank you. Reminders for it have stopped."}</p>
          </>
        ) : view.student.status !== "active" ? (
          <div className="mt-4"><Notice tone="ink">{d.withdrawn}</Notice></div>
        ) : (
          <>
            <div className="mt-3"><Amount value={inr(state.balance)} size="xl" /></div>
            <p className={cx("mt-3 text-[16px] font-medium", state.status === "overdue" ? "text-madder" : "text-ink-2")}>
              {d.dueOn(formatDate(state.dueDate, lang))}
              {state.status === "overdue" && ` · ${d.daysLate(state.daysOverdue)}`}
            </p>
            {error && <div className="mt-4"><Notice tone="madder">{hi ? "भुगतान पूरा नहीं हुआ। फिर से कोशिश करें।" : "The payment did not go through. Please try again."}</Notice></div>}
            <form action={startCheckout} className="mt-8">
              <input type="hidden" name="token" value={tok} />
              <Submit size="lg" block pendingText={hi ? "खुल रहा है" : "Opening"}>{d.pay(inr(state.balance))}</Submit>
            </form>
            <p className="text-[12.5px] text-ink-3 mt-2.5 text-center">{d.payNote}</p>
          </>
        )}
      </div>
    </main>
  );
}
