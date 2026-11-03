"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { advanceClock, type ClockState } from "@/app/actions/clock";
import { Spinner } from "@/components/submit";
import { formatDate } from "@/domain/dates";
import { Modal } from "@/components/dialog";
import { Button } from "@/components/ui";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/toaster";

function Step({ days, label }: { days: number; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      name="days"
      value={String(days)}
      disabled={pending}
      className="h-7 px-2.5 rounded-[6px] border border-white/20 hover:bg-white/10 disabled:opacity-50 text-[12.5px] whitespace-nowrap"
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
  useEffect(() => {
    if (state?.message) toast(state.message);
    if (state?.error) toast(state.error, "error");
  }, [state]);
  return (
    <form action={action} className="bg-ink text-paper text-[12.5px] px-4 lg:px-8 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 no-print">
      <span className="text-white/60">Demo clock</span>
      <span className="font-medium num">{weekday} {formatDate(today)}</span>
      <div className="flex gap-1.5">
        <Step days={1} label="+1 day" />
        <Step days={7} label="+1 week" />
        <ResetButton />
      </div>
      <Pending />
      {state?.message && <span className="text-[#cfe3d3]">{state.message}</span>}
      {state?.error && <span className="text-[#f3c4bb]">{state.error}</span>}
    </form>
  );
}

function ResetButton() {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const { pending } = useFormStatus();
  useEffect(() => {
    if (!armed) return;
    anchor.current?.closest("form")?.requestSubmit();
    setArmed(false);
  }, [armed]);
  return (
    <>
      <span ref={anchor} hidden />
      {armed && <input type="hidden" name="reset" value="1" />}
      <button type="button" disabled={pending} onClick={() => setOpen(true)} className="h-7 px-2.5 rounded-[6px] border border-white/20 hover:bg-white/10 disabled:opacity-50 text-[12.5px]">Reset</button>
      <Modal open={open} onClose={() => setOpen(false)} label="Reset demo" className="w-[420px]">
        <div className="p-6 text-ink">
          <h2 className="display text-[22px]">Reset the demo?</h2>
          <p className="text-[14.5px] text-ink-2 mt-2">All payments, refunds, uploads and reminders made during this demo are removed, and the clock goes back to Monday 2 Nov 2026.</p>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" tone="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" tone="danger" data-autofocus onClick={() => { setOpen(false); setArmed(true); }}>Reset everything</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
