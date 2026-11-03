"use client";

import { applyUnmatched, returnUnmatched, simulateCredit } from "@/app/actions/payments";
import { ConfirmSubmit } from "@/components/dialog";
import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { Submit } from "@/components/submit";
import { Field, Input, Select } from "@/components/ui";

export function ApplyForm({ id, suggestion, amount }: { id: string; suggestion?: string; amount: string }) {
  const [sid, setSid] = useState(suggestion ?? "");
  return (
    <ActionForm action={applyUnmatched} className="flex flex-col" resetOnSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`sid-${id}`}>Student ID</label>
        <Input id={`sid-${id}`} name="studentId" value={sid} onChange={(e) => setSid(e.target.value.toUpperCase())} placeholder="STU-0000" className="h-9 max-w-[140px] num uppercase" />
        <ConfirmSubmit
          size="sm"
          title={`Apply ${amount} to ${sid || "this student"}?`}
          body={<>This records a payment and issues a GST receipt in that student's name. Reminders for the instalment stop if it is now paid. Check the name on the bank line first.</>}
          confirmLabel="Apply payment"
          disabled={!/^STU-?\d{4}$/.test(sid)}
        >
          Apply
        </ConfirmSubmit>
      </div>
    </ActionForm>
  );
}

export function ReturnForm({ id, amount, payer }: { id: string; amount: string; payer: string }) {
  return (
    <form action={returnUnmatched}>
      <input type="hidden" name="id" value={id} />
      <ConfirmSubmit tone="ghost" size="sm" title={`Return ${amount}?`} body={<>Mark this credit to be sent back to {payer || "the payer"}. It leaves the queue and nothing is recorded against any student.</>} confirmLabel="Mark as returned">
        Return
      </ConfirmSubmit>
    </form>
  );
}

export function SimulateCreditForm() {
  return (
    <ActionForm action={simulateCredit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" htmlFor="c-amount"><Input id="c-amount" name="amount" inputMode="numeric" placeholder="15000" /></Field>
        <Field label="Channel" htmlFor="c-source">
          <Select id="c-source" name="source" defaultValue="neft"><option value="neft">NEFT</option><option value="upi">UPI</option></Select>
        </Field>
      </div>
      <Field label="Bank narration" htmlFor="c-ref" hint="Try “FEE STU0587” to auto-match, or “school fees” to see it queued."><Input id="c-ref" name="reference" placeholder="NEFT/HDFC/FEE STU0587" /></Field>
      <Field label="Payer name" htmlFor="c-payer"><Input id="c-payer" name="payerName" placeholder="RAKESH SHARMA" /></Field>
      <Submit pendingText="Matching">Feed into matcher</Submit>
    </ActionForm>
  );
}
