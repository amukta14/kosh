"use client";

import { applyUnmatched, simulateCredit } from "@/app/actions/payments";
import { ActionForm } from "@/components/action-form";
import { Submit } from "@/components/submit";
import { Field, Input, Select } from "@/components/ui";

export function ApplyForm({ id, suggestion }: { id: string; suggestion?: string }) {
  return (
    <ActionForm action={applyUnmatched} className="flex flex-col" resetOnSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`sid-${id}`}>Student ID</label>
        <Input id={`sid-${id}`} name="studentId" defaultValue={suggestion} placeholder="STU-0000" className="h-9 max-w-[140px] num uppercase" />
        <Submit size="sm" className="h-9" pendingText="Applying">Apply</Submit>
      </div>
    </ActionForm>
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
