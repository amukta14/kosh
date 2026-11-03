"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./ui";
import type { ComponentProps } from "react";

export function Submit({ children, pendingText, ...p }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || p.disabled} aria-busy={pending} {...p}>
      {pending && <Spinner />}
      {pending ? (pendingText ?? children) : children}
    </Button>
  );
}

export function Spinner() {
  return <span className="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden />;
}
