"use client";

import { useActionState, useState, useTransition } from "react";
import { templateFor, uploadAction, type UploadState } from "@/app/actions/uploads";
import { Submit } from "@/components/submit";
import { Button, Card, Field, Notice, Select, Textarea, cx } from "@/components/ui";

export function Uploader({ batches, month }: { batches: { id: string; label: string }[]; month: string }) {
  const [state, action] = useActionState<UploadState, FormData>(uploadAction, null);
  const [kind, setKind] = useState<"attendance" | "scores">(state?.kind ?? "attendance");
  const [batchId, setBatch] = useState(state?.batchId ?? "");
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const clean = state && !state.error && !state.done && state.errors?.length === 0 && (state.count ?? 0) > 0 && state.text === text;

  return (
    <form action={action} className="grid lg:grid-cols-[1fr_340px] gap-8">
      <div className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="What" htmlFor="kind">
            <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as "attendance" | "scores")}>
              <option value="attendance">Monthly attendance</option>
              <option value="scores">Test scores</option>
            </Select>
          </Field>
          <Field label="Batch" htmlFor="batchId">
            <Select id="batchId" name="batchId" value={batchId} onChange={(e) => setBatch(e.target.value)}>
              <option value="">Choose a batch</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Sheet (CSV)" htmlFor="text" hint={kind === "attendance" ? "Columns: student_id, month, present, total" : "Columns: student_id, test_name, test_date, score, max_score"}>
          <Textarea id="text" name="text" rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "attendance" ? `student_id,month,present,total\nSTU-0587,${month},14,24` : "student_id,test_name,test_date,score,max_score\nSTU-0587,Unit Test 7,2026-11-17,102,300"} />
        </Field>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="h-10 px-4 rounded-[8px] border border-rule bg-card text-sm font-medium grid place-items-center cursor-pointer hover:border-ink-3">
            Choose CSV file
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
          </label>
          <Button type="button" tone="ghost" disabled={!batchId || pending} onClick={() => start(async () => setText(await templateFor(batchId, kind, month)))}>
            {pending ? "Loading" : "Fill in roster template"}
          </Button>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <Card className="p-4 flex flex-col gap-3">
          <p className="eyebrow">Step 1</p>
          <Submit name="intent" value="check" tone="secondary" pendingText="Checking">Check the sheet</Submit>
          <p className="eyebrow mt-2">Step 2</p>
          <Submit name="intent" value="import" disabled={!clean} pendingText="Importing">{clean ? `Import ${state!.count} rows` : "Import"}</Submit>
          <p className="text-[12px] text-ink-3">Nothing is saved unless every row passes. Re-uploading a month or test replaces the old numbers.</p>
        </Card>
        {state?.error && <Notice tone="madder">{state.error}</Notice>}
        {state?.done && <Notice tone="leaf" title="Imported">{state.done}</Notice>}
        {state?.errors && state.errors.length > 0 && (
          <Notice tone="madder" title={`${state.errors.length} row${state.errors.length > 1 ? "s" : ""} need fixing`}>
            <ul className="mt-1 flex flex-col gap-0.5 text-[13px] max-h-60 overflow-auto">
              {state.errors.slice(0, 30).map((e, i) => <li key={i}><span className="num font-medium">Line {e.line}:</span> {e.message}</li>)}
            </ul>
          </Notice>
        )}
        {clean && state?.preview && (
          <Card className="p-4">
            <p className="text-[13px] font-medium text-leaf mb-2">All {state.count} rows look right</p>
            <table className="w-full text-[12.5px] num">
              <tbody className="ledger">{state.preview.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cx("py-1.5", j === 2 && "text-right")}>{c}</td>)}</tr>)}</tbody>
            </table>
          </Card>
        )}
      </aside>
    </form>
  );
}
