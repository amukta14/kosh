"use client";

import type { ComponentProps } from "react";

/** GET filter form that submits itself when a select changes. */
export function AutoForm(p: ComponentProps<"form">) {
  return (
    <form
      {...p}
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") e.currentTarget.requestSubmit();
      }}
    />
  );
}
