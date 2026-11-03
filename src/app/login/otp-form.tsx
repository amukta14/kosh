"use client";

import { useActionState } from "react";
import { otpAction, type OtpState } from "../actions/auth";
import { Field, Input, Notice } from "@/components/ui";
import { Submit } from "@/components/submit";

export function OtpForm() {
  const [state, action] = useActionState<OtpState, FormData>(otpAction, { step: "phone" });

  if (state.step === "phone") {
    return (
      <form action={action} className="flex flex-col gap-4" noValidate>
        <Field label="Mobile number registered with the centre" htmlFor="phone" error={state.error}>
          <div className="flex">
            <span className="h-12 px-3 grid place-items-center border border-r-0 border-rule rounded-l-[7px] bg-paper-2 text-ink-2 num">+91</span>
            <Input id="phone" name="phone" inputMode="numeric" autoComplete="tel-national" placeholder="98290 00587" defaultValue={state.phone} aria-invalid={!!state.error} className="h-12 rounded-l-none text-[17px] num tracking-wide" autoFocus required />
          </div>
        </Field>
        <Submit size="lg" block pendingText="Sending code">Send code · कोड भेजें</Submit>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <p className="text-[15px] text-ink-2">
        We sent a 6-digit code to <span className="num text-ink font-medium">{state.display}</span> if it is registered with us.
      </p>
      {state.demoCode && (
        <Notice tone="ochre" title="Demo mode">
          No SMS is sent in this demo. Your code is <span className="num font-semibold text-ink tracking-[0.2em]">{state.demoCode}</span>
        </Notice>
      )}
      <Field label="Code · कोड" htmlFor="code" error={state.error}>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" aria-invalid={!!state.error} className="h-14 text-[26px] num tracking-[0.5em] text-center" autoFocus required />
      </Field>
      <Submit size="lg" block pendingText="Checking">Log in · लॉग इन</Submit>
      <div className="flex justify-between text-[13px]">
        <button name="intent" value="change" className="text-ink-2 underline underline-offset-4 decoration-rule hover:decoration-ink">Change number</button>
        <button name="intent" value="resend" className="text-ink-2 underline underline-offset-4 decoration-rule hover:decoration-ink">Send again</button>
      </div>
    </form>
  );
}
