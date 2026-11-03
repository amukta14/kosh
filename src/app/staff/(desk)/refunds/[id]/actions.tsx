"use client";

import { approveRefund, markRefundPaid } from "@/app/actions/refunds";
import { ActionForm } from "@/components/action-form";
import { Submit } from "@/components/submit";
import { Field, Input } from "@/components/ui";

export function Approve({ id }: { id: string }) {
  return (
    <ActionForm action={approveRefund} resetOnSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <Submit block pendingText="Approving">Approve refund</Submit>
    </ActionForm>
  );
}

export function MarkPaid({ id }: { id: string }) {
  return (
    <ActionForm action={markRefundPaid} className="flex flex-col gap-3" resetOnSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <Field label="Bank UTR / reference" htmlFor="payoutReference"><Input id="payoutReference" name="payoutReference" placeholder="NEFT/OUT/12345" /></Field>
      <Submit block pendingText="Saving">Mark as paid</Submit>
    </ActionForm>
  );
}
