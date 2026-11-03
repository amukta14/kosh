"use client";

import { createContext, useContext } from "react";
import { useFormStatus } from "react-dom";

/** Pending state for forms submitted through onSubmit (which keeps inputs on error). */
export const PendingCtx = createContext<boolean | null>(null);

export function usePending() {
  const ctx = useContext(PendingCtx);
  const { pending } = useFormStatus();
  return ctx ?? pending;
}

/** Builds FormData including the clicked submit button, then runs the action in a transition. */
export function submitWith(e: React.FormEvent<HTMLFormElement>, run: (fd: FormData) => void) {
  e.preventDefault();
  const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
  const fd = new FormData(e.currentTarget, sub && sub.type === "submit" ? sub : undefined);
  run(fd);
}
