import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Eight-petal buta from Sanganeri print, used only as the mark. */
export function Mark({ size = 22, className }: { size?: number; className?: string }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      {petals.map((r) => (
        <ellipse key={r} cx="12" cy="5.6" rx="2.3" ry="4.2" transform={`rotate(${r} 12 12)`} fill="currentColor" opacity={r % 90 === 0 ? 1 : 0.55} />
      ))}
      <circle cx="12" cy="12" r="2.4" fill="var(--color-paper)" />
      <circle cx="12" cy="12" r="1.1" fill="var(--color-madder)" />
    </svg>
  );
}

export function Wordmark({ sub }: { sub?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-indigo">
      <Mark />
      <span className="display text-[21px] leading-none font-medium text-ink">Kosh</span>
      {sub && <span className="text-xs text-ink-3 pl-1 border-l border-rule ml-1">{sub}</span>}
    </span>
  );
}

const btn = {
  base: "inline-flex items-center justify-center gap-2 rounded-[8px] font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none select-none",
  size: { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-14 px-6 text-[17px]" },
  tone: {
    primary: "bg-indigo text-white hover:bg-indigo-deep active:bg-indigo-deep",
    secondary: "bg-card text-ink border border-rule hover:border-ink-3",
    ghost: "text-ink-2 hover:text-ink hover:bg-paper-2",
    danger: "bg-card text-madder border border-madder/40 hover:bg-madder-wash",
  },
};

type BtnProps = { tone?: keyof typeof btn.tone; size?: keyof typeof btn.size; block?: boolean };

export function Button({ tone = "primary", size = "md", block, className, ...p }: ComponentProps<"button"> & BtnProps) {
  return <button {...p} className={cx(btn.base, btn.size[size], btn.tone[tone], block && "w-full", className)} />;
}

export function ButtonLink({ tone = "primary", size = "md", block, className, ...p }: ComponentProps<typeof Link> & BtnProps) {
  return <Link {...p} className={cx(btn.base, btn.size[size], btn.tone[tone], block && "w-full", className)} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div {...p} className={cx("bg-card border border-rule rounded-[var(--radius-card)]", className)} />;
}

export function SectionTitle({ children, aside, id }: { children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-3" id={id}>
      <h2 className="display text-[19px] font-medium">{children}</h2>
      {aside && <div className="text-sm text-ink-3">{aside}</div>}
    </div>
  );
}

export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div className="min-w-0">
        <h1 className="display text-[30px] sm:text-[34px] leading-[1.1] font-medium">{title}</h1>
        {sub && <p className="text-ink-2 mt-1.5 text-[15px]">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}

export type Tone = "madder" | "ochre" | "leaf" | "indigo" | "ink";
const toneCls: Record<Tone, { dot: string; text: string; wash: string }> = {
  madder: { dot: "bg-madder", text: "text-madder", wash: "bg-madder-wash" },
  ochre: { dot: "bg-ochre", text: "text-ochre", wash: "bg-ochre-wash" },
  leaf: { dot: "bg-leaf", text: "text-leaf", wash: "bg-leaf-wash" },
  indigo: { dot: "bg-indigo", text: "text-indigo", wash: "bg-indigo-wash" },
  ink: { dot: "bg-ink-3", text: "text-ink-2", wash: "bg-paper-2" },
};

export function Tag({ tone = "ink", children, solid }: { tone?: Tone; children: ReactNode; solid?: boolean }) {
  const t = toneCls[tone];
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap", t.text, solid && cx(t.wash, "px-2 py-0.5 rounded-[5px]"))}>
      <span className={cx("size-1.5 rounded-full shrink-0", t.dot)} />
      {children}
    </span>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? <p className="text-[13px] text-madder">{error}</p> : hint ? <p className="text-[12.5px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-[7px] border border-rule bg-card px-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15 aria-[invalid=true]:border-madder";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input {...p} className={cx(inputCls, className)} />;
}

export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select {...p} className={cx(inputCls, "pr-8 appearance-none bg-[length:12px] bg-no-repeat bg-[right_10px_center]", className)} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23857f74' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")` }} />;
}

export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea {...p} className={cx(inputCls, "h-auto py-2 font-mono text-[13px]", className)} />;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <Mark size={28} className="text-rule mb-3" />
      <p className="font-medium">{title}</p>
      {children && <p className="text-sm text-ink-3 mt-1 max-w-sm">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "indigo", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  const t = toneCls[tone];
  return (
    <div className={cx("rounded-[8px] px-4 py-3 text-[14px] border-l-[3px]", t.wash, tone === "madder" ? "border-madder" : tone === "ochre" ? "border-ochre" : tone === "leaf" ? "border-leaf" : "border-indigo")} role={tone === "madder" ? "alert" : "status"}>
      {title && <p className={cx("font-semibold mb-0.5", t.text)}>{title}</p>}
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

/** Large serif amount. The rupee sign is set smaller so the figure reads first. */
export function Amount({ value, className, size = "lg" }: { value: string; className?: string; size?: "md" | "lg" | "xl" }) {
  const sign = value.startsWith("−") ? "−" : "";
  const body = value.replace(/^[−]?₹/, "");
  const cls = size === "xl" ? "text-[64px] sm:text-[76px]" : size === "lg" ? "text-[40px]" : "text-[26px]";
  return (
    <span className={cx("display num leading-none font-normal", cls, className)}>
      {sign}
      <span className="text-[0.55em] align-[0.42em] mr-[0.04em] text-ink-2">₹</span>
      {body}
    </span>
  );
}

export function Kv({ k, v, className }: { k: ReactNode; v: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4 py-2", className)}>
      <span className="text-ink-2 text-[14px]">{k}</span>
      <span className="num text-[14.5px] text-right">{v}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}
