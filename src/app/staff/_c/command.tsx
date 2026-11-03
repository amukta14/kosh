"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/dialog";
import { cx } from "@/components/ui";

export interface PaletteStudent {
  id: string;
  name: string;
  where: string;
  overdue: number;
  withdrawn: boolean;
}

interface Item {
  key: string;
  label: string;
  hint: string;
  href: string;
  group: "Go to" | "Students" | "Do";
  tone?: "madder";
}

const fmt = new Intl.NumberFormat("en-IN");

/** ⌘K / Ctrl+K / "/" palette: jump to any student or screen without the mouse. */
export function CommandPalette({ students, pages, compact }: { students: PaletteStudent[]; pages: { href: string; label: string }[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo<Item[]>(() => {
    const t = q.trim().toLowerCase();
    const go: Item[] = pages.map((p) => ({ key: p.href, label: p.label, hint: "Page", href: p.href, group: "Go to" }));
    const actions: Item[] = pages.some((p) => p.href === "/staff/refunds")
      ? [
          { key: "a-refund", label: "Start a refund", hint: "Calculator", href: "/staff/refunds/new", group: "Do" },
          { key: "a-overdue", label: "Show everyone overdue", hint: "Filter", href: "/staff/students?status=overdue", group: "Do" },
          { key: "a-60", label: "Show over 60 days late", hint: "Filter", href: "/staff/students?status=late60", group: "Do" },
          { key: "a-upload", label: "Upload attendance or scores", hint: "CSV", href: "/staff/uploads", group: "Do" },
        ]
      : [];
    const kids: Item[] = students
      .filter((s) => !t || s.name.toLowerCase().includes(t) || s.id.toLowerCase().includes(t) || s.id.replace("-", "").toLowerCase().includes(t))
      .slice(0, t ? 8 : 5)
      .map((s) => ({
        key: s.id,
        label: s.name,
        hint: `${s.id} · ${s.where}${s.withdrawn ? " · withdrawn" : s.overdue ? ` · ₹${fmt.format(s.overdue)} overdue` : ""}`,
        href: `/staff/students/${s.id}`,
        group: "Students",
        tone: s.overdue && !s.withdrawn ? "madder" : undefined,
      }));
    const match = (i: Item) => !t || i.label.toLowerCase().includes(t);
    return [...(t ? kids : []), ...actions.filter(match), ...go.filter(match), ...(t ? [] : kids)];
  }, [q, students, pages]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    list.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const go = (i?: Item) => {
    if (!i) return;
    setOpen(false);
    setQ("");
    router.push(i.href);
  };

  let lastGroup = "";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx("flex items-center gap-2 rounded-[8px] border border-rule bg-card text-ink-3 text-[13.5px] hover:border-ink-3 transition-colors", compact ? "h-9 px-2.5" : "h-9 px-3 w-full")}
        aria-label="Search students and pages"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        {!compact && <span className="flex-1 text-left">Find a student</span>}
        {!compact && <kbd className="text-[11px] font-sans border border-rule rounded px-1.5 py-px">⌘K</kbd>}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} label="Search" className="w-[560px] mt-[12vh] mb-auto">
        <div className="flex items-center gap-3 px-4 border-b border-rule">
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-ink-3 shrink-0" aria-hidden><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <input
            data-autofocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === "Enter") { e.preventDefault(); go(items[sel]); }
            }}
            placeholder="Name, STU-0587, or a page"
            className="h-14 flex-1 bg-transparent outline-none focus-visible:outline-none text-[16px] placeholder:text-ink-3"
            aria-label="Search"
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
          />
          <kbd className="text-[11px] text-ink-3 border border-rule rounded px-1.5 py-px">Esc</kbd>
        </div>
        <ul ref={list} id="palette-list" role="listbox" className="max-h-[50vh] overflow-auto p-2">
          {items.length === 0 && <li className="px-3 py-8 text-center text-ink-3 text-[14px]">No match for “{q}”</li>}
          {items.map((i, n) => {
            const head = i.group !== lastGroup ? (lastGroup = i.group) : null;
            return (
              <li key={i.key} role="none">
                {head && <p className="eyebrow px-3 pt-3 pb-1.5">{head}</p>}
                <button
                  role="option"
                  aria-selected={n === sel}
                  data-i={n}
                  onMouseMove={() => setSel(n)}
                  onClick={() => go(i)}
                  className={cx("w-full flex items-center justify-between gap-4 px-3 h-11 rounded-[8px] text-left", n === sel ? "bg-indigo text-white" : "text-ink")}
                >
                  <span className="font-medium text-[14.5px] truncate">{i.label}</span>
                  <span className={cx("text-[12.5px] truncate", n === sel ? "text-white/75" : i.tone === "madder" ? "text-madder" : "text-ink-3")}>{i.hint}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-rule px-4 h-10 flex items-center gap-4 text-[12px] text-ink-3">
          <span><kbd className="font-sans">↑↓</kbd> move</span><span><kbd className="font-sans">↵</kbd> open</span><span className="ml-auto">Press / anywhere to search</span>
        </div>
      </Modal>
    </>
  );
}
