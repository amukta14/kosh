import Link from "next/link";
import { eq } from "drizzle-orm";
import { ButtonLink, Mark, cx } from "@/components/ui";
import { db, schema } from "@/db";
import { inr } from "@/domain/money";
import { REMINDER_OFFSETS } from "@/domain/reminders";
import { addDays, daysBetween } from "@/domain/dates";
import { getToday } from "@/server/clock";
import { receiptKey } from "@/server/paylink";
import { payContext } from "@/server/paypage";

export const metadata = { title: "Payment result", robots: { index: false } };

export default async function Done({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ o?: string }> }) {
  const { token } = await params;
  const { o = "" } = await searchParams;
  const { view, state, lang, token: tok } = await payContext(token);
  const order = await db.query.gatewayOrders.findFirst({ where: eq(schema.gatewayOrders.id, o) });
  const hi = lang === "hi";
  const payment = order?.status === "paid" ? await db.query.payments.findFirst({ where: eq(schema.payments.gatewayOrderId, order.id) }) : null;

  if (!order || order.studentId !== view.student.id || !payment) {
    return (
      <main lang={lang} className={cx("min-h-dvh px-5 py-10 max-w-[440px] mx-auto", hi && "hi")}>
        <Mark className="text-indigo" />
        <h1 className="display text-[30px] mt-8 text-madder">{hi ? "भुगतान नहीं हुआ" : "Payment did not go through"}</h1>
        <p className="text-ink-2 mt-2">{hi ? "आपके खाते से पैसा नहीं कटा है। दोबारा कोशिश करें।" : "No money was taken. You can try again."}</p>
        <ButtonLink href={`/p/${tok}`} size="lg" block className="mt-8">{hi ? "फिर से कोशिश करें" : "Try again"}</ButtonLink>
      </main>
    );
  }

  const today = await getToday();
  const stopped = state.balance <= 0 ? REMINDER_OFFSETS.filter((off) => daysBetween(today, addDays(state.dueDate, off)) > 0).length : 0;

  return (
    <main lang={lang} className={cx("min-h-dvh px-5 py-10 max-w-[440px] mx-auto", hi && "hi")}>
      <Mark className="text-indigo" />
      <div className="mt-10 relative">
        <div className="stamp absolute -top-4 right-0 border-[3px] border-leaf text-leaf rounded-[6px] px-3 py-1 display text-[22px] tracking-wider uppercase">{hi ? "जमा" : "Paid"}</div>
        <p className="eyebrow">{hi ? "भुगतान सफल" : "Payment received"}</p>
        <p className="display text-[52px] num mt-2">{inr(payment.amount)}</p>
        <p className="text-ink-2 mt-1 num">{payment.receiptNo}</p>
      </div>
      <div className="mt-8 rounded-[10px] bg-leaf-wash/70 px-4 py-3 text-[14.5px]">
        {state.balance <= 0
          ? hi
            ? `किस्त ${state.seq} पूरी जमा। इसके ${stopped ? `${stopped} आने वाले ` : ""}रिमाइंडर बंद कर दिए गए हैं।`
            : `Instalment ${state.seq} is fully paid.${stopped ? ` ${stopped} upcoming reminders for it are cancelled.` : " No more reminders will be sent for it."}`
          : hi ? `अभी ${inr(state.balance)} बाकी है।` : `${inr(state.balance)} is still due on this instalment.`}
      </div>
      <ButtonLink href={`/receipt/${payment.id}?k=${receiptKey(payment.id)}`} size="lg" block className="mt-6">{hi ? "GST रसीद देखें" : "View GST receipt"}</ButtonLink>
      <Link href="/parent" className="block text-center text-[14px] text-ink-2 mt-4 underline underline-offset-4">{hi ? "पोर्टल पर जाएँ" : "Go to the parent portal"}</Link>
    </main>
  );
}
