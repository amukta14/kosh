import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { completeTestPayment } from "@/app/actions/pay";
import { Submit } from "@/components/submit";
import { db, schema } from "@/db";
import { inr } from "@/domain/money";
import { readPayToken } from "@/server/paylink";

export const metadata = { title: "Test payment", robots: { index: false } };

/**
 * Stand-in for the payment gateway's hosted checkout. It looks deliberately
 * different from Kosh, as a real gateway page would.
 */
export default async function Gateway({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ t?: string }> }) {
  const { orderId } = await params;
  const { t: token = "" } = await searchParams;
  const order = await db.query.gatewayOrders.findFirst({ where: eq(schema.gatewayOrders.id, orderId) });
  if (!order || !readPayToken(token)) notFound();

  return (
    <main className="min-h-dvh bg-[#eef0f3] font-[system-ui] text-[#111827] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-sm border border-[#e5e7eb] overflow-hidden">
        <div className="bg-[#111827] text-white px-5 py-4 flex items-center justify-between">
          <span className="font-semibold tracking-tight">PayGate</span>
          <span className="text-[11px] bg-amber-400 text-black font-bold px-2 py-0.5 rounded">TEST MODE</span>
        </div>
        <div className="px-5 py-5 border-b border-[#e5e7eb]">
          <p className="text-[13px] text-[#6b7280]">Company A Coaching Pvt Ltd</p>
          <p className="text-[30px] font-semibold mt-1 num">{inr(order.amount)}</p>
          <p className="text-[12px] text-[#6b7280] mt-1 font-mono">{order.id}</p>
        </div>
        {order.status !== "created" ? (
          <p className="p-5 text-[14px]">This order is already {order.status}.</p>
        ) : (
          <form action={completeTestPayment} className="p-5 flex flex-col gap-3">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="token" value={token} />
            <fieldset className="flex flex-col gap-2">
              <legend className="text-[13px] text-[#6b7280] mb-1">Pay using</legend>
              {["UPI", "Debit / credit card", "Net banking"].map((m, i) => (
                <label key={m} className="flex items-center gap-3 border border-[#e5e7eb] rounded-lg px-3 h-11 text-[14px] has-[:checked]:border-[#111827]">
                  <input type="radio" name="method" value={m} defaultChecked={i === 0} className="accent-[#111827]" /> {m}
                </label>
              ))}
            </fieldset>
            <p className="text-[12px] text-[#6b7280]">No real money moves in test mode.</p>
            <Submit name="outcome" value="success" size="lg" block className="!bg-[#111827] !rounded-lg">Pay {inr(order.amount)}</Submit>
            <button name="outcome" value="fail" className="text-[13px] text-[#6b7280] underline underline-offset-4">Simulate a failed payment</button>
          </form>
        )}
      </div>
    </main>
  );
}
