"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { advanceClock, type ClockState } from "@/app/actions/clock";
import { Spinner } from "@/components/submit";

function Step({ days, label, reset }: { days?: number; label: string; reset?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      name={reset ? "reset" : "days"}
      value={reset ? "1" : String(days)}
      disabled={pending}
      className="h-7 px-2.5 rounded-[6px] border border-white/20 hover:bg-white/10 disabled:opacity-50 text-[12.5px] whitespace-nowrap"
      onClick={(e) => {
        if (reset && !confirm("Reset all demo data back to 2 Nov 2026?")) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}

function Pending() {
  const { pending } = useFormStatus();
  return pending ? <span className="flex items-center gap-1.5 text-white/70"><Spinner /> Running daily jobs</span> : null;
}

export function ClockBar({ today, weekday }: { today: string; weekday: string }) {
  const [state, action] = useActionState<ClockState, FormData>(advanceClock, null);
  return (
    <form action={action} className="bg-ink text-paper text-[12.5px] px-4 lg:px-8 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 no-print">
      <span className="text-white/60">Demo clock</span>
      <span className="font-medium num">{weekday} {today}</span>
      <div className="flex gap-1.5">
        <Step days={1} label="+1 day" />
        <Step days={7} label="+1 week" />
        <Step reset label="Reset" />
      </div>
      <Pending />
      {state?.message && <span className="text-[#cfe3d3]">{state.message}</span>}
      {state?.error && <span className="text-[#f3c4bb]">{state.error}</span>}
    </form>
  );
}
