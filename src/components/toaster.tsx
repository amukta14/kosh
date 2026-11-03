"use client";

import { useEffect, useState } from "react";
import { cx } from "./ui";

type Toast = { id: number; text: string; tone: "ok" | "error" };

export function toast(text: string, tone: Toast["tone"] = "ok") {
  window.dispatchEvent(new CustomEvent("kosh:toast", { detail: { text, tone } }));
}

/** Bottom-of-screen confirmations, so the result of an action is seen even if the form is off-screen. */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const { text, tone } = (e as CustomEvent).detail;
      const id = ++n;
      setItems((xs) => [...xs.slice(-2), { id, text, tone }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4500);
    };
    window.addEventListener("kosh:toast", on);
    return () => window.removeEventListener("kosh:toast", on);
  }, []);
  return (
    <div className="fixed bottom-5 inset-x-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4 no-print" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={cx("rise pointer-events-auto max-w-[480px] rounded-[10px] px-4 py-3 text-[14px] shadow-[0_16px_40px_-12px_rgba(28,27,24,0.45)] flex gap-3 items-start", t.tone === "ok" ? "bg-ink text-paper" : "bg-madder text-white")}>
          <span className={cx("mt-1.5 size-2 rounded-full shrink-0", t.tone === "ok" ? "bg-[#8fc29c]" : "bg-white")} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
