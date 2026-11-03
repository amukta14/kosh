"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export interface NavItem {
  href: string;
  label: string;
  count?: number;
}

export function Nav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((i) => {
        const active = i.href === "/staff" ? path === "/staff" : path.startsWith(i.href);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cx("flex items-center justify-between h-9 px-3 rounded-[7px] text-[14px]", active ? "bg-card text-ink font-medium shadow-[inset_2px_0_0_var(--color-indigo)]" : "text-ink-2 hover:text-ink hover:bg-paper-2")}
            >
              {i.label}
              {!!i.count && <span className={cx("num text-[11.5px] min-w-5 h-5 px-1.5 grid place-items-center rounded-full", active ? "bg-indigo text-white" : "bg-madder-wash text-madder")}>{i.count}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
