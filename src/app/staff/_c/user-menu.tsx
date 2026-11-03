"use client";

import { logoutAction } from "@/app/actions/auth";
import { Menu, MenuItem } from "@/components/dialog";
import { cx } from "@/components/ui";

export function UserMenu({ name, role }: { name: string; role: string }) {
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <Menu
      up
      trigger={(open) => (
        <span className={cx("flex items-center gap-3 px-2 py-2 rounded-[8px] hover:bg-paper-2", open && "bg-paper-2")}>
          <span className="size-8 rounded-full bg-indigo text-white grid place-items-center text-[12px] font-semibold">{initials}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-medium truncate">{name}</span>
            <span className="block text-[12px] text-ink-3 capitalize">{role}</span>
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="text-ink-3"><path d="M3 7.5l3-3 3 3" stroke="currentColor" fill="none" strokeWidth="1.5" /></svg>
        </span>
      )}
    >
      <MenuItem href="/refund-policy">Public refund policy <span className="text-ink-3">↗</span></MenuItem>
      <MenuItem href="/login">Parent login page <span className="text-ink-3">↗</span></MenuItem>
      <div className="h-px bg-rule my-1" />
      <p className="px-2.5 py-1.5 text-[12px] text-ink-3">Press <kbd className="border border-rule rounded px-1">/</kbd> to find a student</p>
      <MenuItem danger onClick={() => logoutAction()}>Log out</MenuItem>
    </Menu>
  );
}
