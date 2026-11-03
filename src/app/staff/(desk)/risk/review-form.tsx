"use client";

import { reviewFlag } from "@/app/actions/risk";
import { ActionForm } from "@/components/action-form";
import { Submit } from "@/components/submit";
import { Textarea } from "@/components/ui";

export function ReviewForm({ id }: { id: string }) {
  return (
    <ActionForm action={reviewFlag} className="flex flex-col gap-2" resetOnSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`note-${id}`}>What did you find?</label>
      <Textarea id={`note-${id}`} name="note" rows={2} placeholder="What did you find? e.g. Spoke to father, fees after harvest, attending again." className="font-sans text-[14px]" />
      <div className="flex flex-wrap gap-2">
        <Submit name="outcome" value="called" size="sm">Called, follow up</Submit>
        <Submit name="outcome" value="false_flag" size="sm" tone="secondary">False flag</Submit>
      </div>
    </ActionForm>
  );
}
