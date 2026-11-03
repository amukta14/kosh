"use client";

import { startTransition, useActionState } from "react";
import { staffLoginAction } from "@/app/actions/auth";
import { PendingCtx, submitWith } from "@/components/pending";
import { Field, Input, Notice } from "@/components/ui";
import { Submit } from "@/components/submit";

export function StaffLoginForm() {
  const [state, action, pending] = useActionState(staffLoginAction, null);
  return (
    <PendingCtx.Provider value={pending}>
      <form onSubmit={(e) => submitWith(e, (fd) => startTransition(() => action(fd)))} className="flex flex-col gap-4">
        {state?.error && <Notice tone="madder">{state.error}</Notice>}
        <Field label="Work email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Submit block size="lg" pendingText="Logging in">Log in</Submit>
      </form>
    </PendingCtx.Provider>
  );
}
