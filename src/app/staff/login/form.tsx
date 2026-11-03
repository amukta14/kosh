"use client";

import { useActionState } from "react";
import { staffLoginAction } from "@/app/actions/auth";
import { Field, Input, Notice } from "@/components/ui";
import { Submit } from "@/components/submit";

export function StaffLoginForm() {
  const [state, action] = useActionState(staffLoginAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <Notice tone="madder">{state.error}</Notice>}
      <Field label="Work email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Submit block size="lg" pendingText="Logging in">Log in</Submit>
    </form>
  );
}
