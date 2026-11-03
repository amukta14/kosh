"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, cx } from "./ui";

/** Native <dialog> modal: focus trap, Esc to close and backdrop come from the browser. */
export function Modal({ open, onClose, children, className, label }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        "m-auto bg-card text-ink rounded-[14px] border border-rule p-0 shadow-[0_30px_60px_-20px_rgba(28,27,24,0.35)] backdrop:bg-ink/35 backdrop:backdrop-blur-[2px] open:animate-[rise_0.2s_ease-out] max-w-[calc(100vw-32px)]",
        className,
      )}
    >
      {open && children}
    </dialog>
  );
}

/**
 * A submit button that asks first. It sits inside a server-action form. On
 * confirm it adds its name/value as a hidden field and submits the form, so
 * the server sees exactly what a normal submit button would send.
 */
export function ConfirmSubmit({
  children,
  title,
  body,
  confirmLabel = "Confirm",
  tone = "primary",
  size = "md",
  name,
  value,
  block,
  disabled,
}: {
  children: ReactNode;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  name?: string;
  value?: string;
  block?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!armed) return;
    anchor.current?.closest("form")?.requestSubmit();
    setArmed(false);
  }, [armed]);
  return (
    <>
      <span ref={anchor} hidden />
      {armed && name && <input type="hidden" name={name} value={value ?? ""} />}
      <Button type="button" tone={tone} size={size} block={block} disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} label={title} className="w-[420px]">
        <div className="p-6">
          <h2 className="display text-[22px] leading-tight">{title}</h2>
          <div className="text-[14.5px] text-ink-2 mt-2">{body}</div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" tone="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              tone={tone === "danger" ? "danger" : "primary"}
              data-autofocus
              onClick={() => {
                setOpen(false);
                setArmed(true);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Small popover menu. Closes on outside click and Esc. */
export function Menu({ trigger, children, align = "left", up }: { trigger: (open: boolean) => ReactNode; children: ReactNode; align?: "left" | "right"; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="w-full text-left">
        {trigger(open)}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cx(
            "absolute z-40 min-w-[220px] bg-card border border-rule rounded-[10px] p-1.5 shadow-[0_16px_40px_-16px_rgba(28,27,24,0.35)] rise",
            align === "right" ? "right-0" : "left-0",
            up ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, href, onClick, danger }: { children: ReactNode; href?: string; onClick?: () => void; danger?: boolean }) {
  const cls = cx("flex w-full items-center justify-between gap-3 h-9 px-2.5 rounded-[6px] text-[14px] text-left hover:bg-paper-2", danger ? "text-madder" : "text-ink");
  return href ? (
    <a role="menuitem" href={href} className={cls}>{children}</a>
  ) : (
    <button role="menuitem" type={onClick ? "button" : "submit"} onClick={onClick} className={cls}>{children}</button>
  );
}
