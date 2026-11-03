"use client";

import { useState } from "react";
import { Nav, type NavItem } from "./nav";

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="h-9 px-3 rounded-[7px] border border-rule text-[14px] bg-card">
        {open ? "Close" : "Menu"}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 bg-paper border-b border-rule px-4 py-3 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.25)]">
          <Nav items={items} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
