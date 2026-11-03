import { PageHead } from "@/components/ui";
import { requireRole } from "@/server/auth";
import { getToday } from "@/server/clock";
import { listCentresAndBatches } from "@/server/queries";
import { Uploader } from "./uploader";

export const metadata = { title: "Uploads" };

export default async function Uploads() {
  await requireRole("accounts");
  const today = await getToday();
  const { centres, batches } = await listCentresAndBatches();
  const name = new Map(centres.map((c) => [c.id, c.name]));
  const opts = batches.map((b) => ({ id: b.id, label: `${name.get(b.centreId)} · ${b.name}` })).sort((a, b) => a.label.localeCompare(b.label));
  return (
    <>
      <PageHead title="Attendance and test scores" sub="Upload one batch at a time. Parents see the results in their portal, and the dropout-risk model rescans right after." />
      <Uploader batches={opts} month={today.slice(0, 7)} />
    </>
  );
}
