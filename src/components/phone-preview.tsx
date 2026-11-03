"use client";

import { useState } from "react";
import { Modal } from "./dialog";
import { Button, cx } from "./ui";

export interface PreviewMessage {
  id: string;
  body: string;
  sentOn: string;
  lang: "en" | "hi";
}

const linkRe = /(https?:\/\/\S+)/g;

/** The parent's WhatsApp thread, drawn as a phone. Opens at the newest message, like the real app. */
export function PhonePreview({ messages, parentName, phone }: { messages: PreviewMessage[]; parentName: string; phone: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" tone="secondary" size="sm" onClick={() => setOpen(true)} disabled={!messages.length}>
        See on parent&apos;s phone
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} label="Parent's phone" className="!bg-transparent !border-0 !shadow-none">
        <div className="relative w-[320px] h-[640px] max-h-[86vh] rounded-[44px] bg-[#111] p-[10px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]">
          <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
          <div className="h-full w-full rounded-[34px] overflow-hidden flex flex-col bg-[#ece5dd]">
            <div className="bg-[#075e54] text-white pt-10 pb-3 px-4 flex items-center gap-3">
              <span className="size-9 rounded-full bg-white/90 text-[#075e54] grid place-items-center font-bold text-[13px]">CA</span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-tight truncate">Company A Fees</p>
                <p className="text-[11.5px] text-white/75 truncate">to {parentName} · +{phone.slice(0, 2)} {phone.slice(2, 7)} {phone.slice(7)}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto text-white/80 text-[13px]" aria-label="Close preview">Close</button>
            </div>
            <div className="flex-1 overflow-auto px-3 py-4 flex flex-col-reverse gap-2 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] bg-[length:14px_14px]">
              {messages.map((m) => (
                <div key={m.id} className={cx("self-start max-w-[86%] bg-white rounded-[8px] rounded-tl-none px-2.5 py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-[13px] text-[#111b21] leading-snug", m.lang === "hi" && "hi")}>
                  <p className="whitespace-pre-line break-words">
                    {m.body.split(linkRe).map((part, i) => (part.startsWith("http") ? <span key={i} className="text-[#027eb5] underline break-all">{part}</span> : part))}
                  </p>
                  <p className="text-[10px] text-[#667781] text-right mt-0.5">{m.sentOn.slice(8)}/{m.sentOn.slice(5, 7)} · 8:30 am</p>
                </div>
              ))}
              <p className="self-center text-[11px] bg-[#fdf4c5] text-[#54656f] rounded-md px-2 py-1 mb-1 text-center max-w-[90%]">Messages are sent automatically and stop when the fee is paid.</p>
            </div>
            <div className="bg-[#f0f0f0] px-3 py-2.5 text-[12px] text-[#667781] text-center">Replies go to the centre accounts desk</div>
          </div>
        </div>
      </Modal>
    </>
  );
}
