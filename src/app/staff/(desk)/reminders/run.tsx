"use client";

import { runRemindersNow } from "@/app/actions/reminders";
import { ActionForm } from "@/components/action-form";
import { Submit } from "@/components/submit";

export function RunNow() {
  return (
    <ActionForm action={runRemindersNow} className="flex flex-col items-end">
      <Submit tone="secondary" pendingText="Running">Run today's job now</Submit>
    </ActionForm>
  );
}
