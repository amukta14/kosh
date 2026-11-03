import { Card, SectionTitle } from "@/components/ui";
import { formatMonth } from "@/domain/dates";

export function TallyExport({ today }: { today: string }) {
  const months: string[] = [];
  for (let d = new Date(today.slice(0, 7) + "-01T00:00:00Z"); d >= new Date("2026-04-01T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() - 1)) {
    months.push(d.toISOString().slice(0, 7));
  }
  return (
    <div>
      <SectionTitle aside="Month-end">Export to Tally</SectionTitle>
      <Card className="p-4">
        <form action="/api/export/tally" method="get" className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1.5 text-[13px] text-ink-2 font-medium flex-1 min-w-[140px]">
            Month
            <select name="month" defaultValue={months[1] ?? months[0]} className="h-10 rounded-[7px] border border-rule bg-card px-3 text-[15px] text-ink">
              {months.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
            </select>
          </label>
          <button name="format" value="xml" className="h-10 px-4 rounded-[8px] bg-indigo text-white text-sm font-medium hover:bg-indigo-deep">Tally XML</button>
          <button name="format" value="csv" className="h-10 px-4 rounded-[8px] border border-rule bg-card text-sm font-medium hover:border-ink-3">CSV</button>
        </form>
        <p className="text-[12.5px] text-ink-3 mt-3">One Receipt voucher per payment, split into taxable value, CGST and SGST, with the centre as the income ledger. Import through Tally Prime, Import Data.</p>
      </Card>
    </div>
  );
}
