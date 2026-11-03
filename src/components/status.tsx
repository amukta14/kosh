import { Tag, type Tone } from "./ui";
import { statusLabel, type InstalmentState, type Ledger } from "@/domain/fees";
import type { RiskBand } from "@/domain/risk";

export function InstalmentTag({ i }: { i: InstalmentState }) {
  const tone: Tone = i.status === "paid" ? "leaf" : i.status === "overdue" ? (i.paid > 0 ? "ochre" : "madder") : i.status === "due_today" ? "ochre" : "ink";
  return <Tag tone={tone}>{statusLabel(i)}</Tag>;
}

export function LedgerTag({ l, withdrawn }: { l: Ledger; withdrawn?: boolean }) {
  if (withdrawn) return <Tag tone="ink">Withdrawn</Tag>;
  if (l.overdue > 0) return <Tag tone="madder">{l.maxDaysOverdue}d overdue</Tag>;
  if (l.next && l.next.daysUntilDue <= 14 && l.next.status !== "overdue") return <Tag tone="ochre">{l.next.status === "due_today" ? "Due today" : `Due in ${l.next.daysUntilDue}d`}</Tag>;
  if (l.balance === 0) return <Tag tone="leaf">Fully paid</Tag>;
  return <Tag tone="leaf">Up to date</Tag>;
}

export function RiskTag({ band }: { band: RiskBand }) {
  if (band === "high") return <Tag tone="madder" solid>At risk</Tag>;
  if (band === "watch") return <Tag tone="ochre">Watch</Tag>;
  if (band === "insufficient") return <Tag tone="ink">Too little data</Tag>;
  return null;
}
