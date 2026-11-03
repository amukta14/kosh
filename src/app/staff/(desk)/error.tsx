"use client";

import { Button, Notice } from "@/components/ui";

export default function DeskError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-lg">
      <Notice tone="madder" title="This page could not load">
        Nothing was changed. Try again, and if it keeps happening send this code to support: <span className="font-mono">{error.digest ?? "n/a"}</span>
      </Notice>
      <Button className="mt-4" onClick={reset}>Try again</Button>
    </div>
  );
}
