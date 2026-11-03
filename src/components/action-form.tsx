"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { FormState } from "@/app/actions/payments";
import { Notice } from "./ui";
import { toast } from "./toaster";
import { PendingCtx, submitWith } from "./pending";

/**
 * Wraps a server action form with inline and toast messages. Submits through
 * onSubmit rather than the action prop, so what the user typed stays in place
 * when the server says no.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = true,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, run, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) toast(state.ok);
    if (state?.error) toast(state.error, "error");
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <PendingCtx.Provider value={pending}>
      <form ref={ref} onSubmit={(e) => submitWith(e, (fd) => startTransition(() => run(fd)))} className={className} noValidate aria-busy={pending}>
        {children}
        {state?.error && <div className="mt-3"><Notice tone="madder">{state.error}</Notice></div>}
        {state?.ok && <div className="mt-3"><Notice tone="leaf">{state.ok}</Notice></div>}
      </form>
    </PendingCtx.Provider>
  );
}
