import type { RiskFactor } from "@/domain/risk";

/** Why the model thinks so: each signal's share of the score, as a bar. */
export function RiskFactors({ factors }: { factors: RiskFactor[] }) {
  const total = factors.reduce((a, f) => a + f.weight, 0) || 1;
  return (
    <ul className="flex flex-col gap-2.5">
      {factors.map((f) => (
        <li key={f.key} className="text-[13px]">
          <div className="flex justify-between gap-3">
            <span className="font-medium">{f.label}</span>
            <span className="text-ink-3 num text-right">{f.value}</span>
          </div>
          <div className="h-1 bg-paper-2 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full rounded-full bg-madder/80" style={{ width: `${(f.weight / total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
