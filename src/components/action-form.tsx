"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { FormState } from "@/app/actions/payments";
import { Notice } from "./ui";

/** Wraps a server action form with inline success / error messages. */
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
  const [state, run] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={run} className={className} noValidate>
      {children}
      {state?.error && <div className="mt-3"><Notice tone="madder">{state.error}</Notice></div>}
      {state?.ok && <div className="mt-3"><Notice tone="leaf">{state.ok}</Notice></div>}
    </form>
  );
}
