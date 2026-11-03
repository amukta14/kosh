"use client";

import { approveRefund, markRefundPaid } from "@/app/actions/refunds";
import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/dialog";
import { Field, Input } from "@/components/ui";

export function Approve({ id, amount }: { id: string; amount: string }) {
  return (
    <ActionForm action={approveRefund} resetOnSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <ConfirmSubmit block title={`Approve a refund of ${amount}?`} body="You are the second check. Confirm the leaving date and the material deduction match the written request." confirmLabel="Approve">
        Approve refund
      </ConfirmSubmit>
    </ActionForm>
  );
}

export function MarkPaid({ id }: { id: string }) {
  return (
    <ActionForm action={markRefundPaid} className="flex flex-col gap-3" resetOnSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <Field label="Bank UTR / reference" htmlFor="payoutReference"><Input id="payoutReference" name="payoutReference" placeholder="NEFT/OUT/12345" /></Field>
      <ConfirmSubmit block title="Mark this refund as paid?" body="Only do this after the bank transfer has gone out. The refund is then closed." confirmLabel="Mark paid">Mark as paid</ConfirmSubmit>
    </ActionForm>
  );
}
