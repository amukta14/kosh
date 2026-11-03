import { isIsoDate } from "./dates";

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface RowError {
  line: number;
  message: string;
}

export interface AttendanceRow {
  studentId: string;
  month: string;
  present: number;
  total: number;
}

export interface ScoreRow {
  studentId: string;
  testName: string;
  testDate: string;
  score: number;
  maxScore: number;
}

const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);

function headerIndex(header: string[], cols: string[]): Record<string, number> | string {
  const h = header.map((x) => x.trim().toLowerCase());
  const idx: Record<string, number> = {};
  for (const c of cols) {
    const i = h.indexOf(c);
    if (i < 0) return `Missing column "${c}". Expected: ${cols.join(", ")}`;
    idx[c] = i;
  }
  return idx;
}

/**
 * Validates every row against the batch roster. Nothing is written unless the
 * whole file is clean, so a half-imported sheet can never skew the risk model.
 */
export function validateAttendance(text: string, roster: Set<string>) {
  const rows = parseCsv(text);
  const errors: RowError[] = [];
  const out: AttendanceRow[] = [];
  if (rows.length < 2) return { rows: out, errors: [{ line: 1, message: "File has no data rows" }] };
  const idx = headerIndex(rows[0], ["student_id", "month", "present", "total"]);
  if (typeof idx === "string") return { rows: out, errors: [{ line: 1, message: idx }] };
  const seen = new Set<string>();
  rows.slice(1).forEach((r, k) => {
    const line = k + 2;
    const studentId = (r[idx.student_id] ?? "").trim().toUpperCase();
    const month = (r[idx.month] ?? "").trim();
    const present = int(r[idx.present] ?? "");
    const total = int(r[idx.total] ?? "");
    if (!roster.has(studentId)) return errors.push({ line, message: `${studentId || "(blank)"} is not in this batch` });
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return errors.push({ line, message: `Month "${month}" must look like 2026-10` });
    if (Number.isNaN(present) || Number.isNaN(total)) return errors.push({ line, message: "Present and total must be whole numbers" });
    if (total === 0 || total > 31) return errors.push({ line, message: `Total classes ${total} must be 1–31` });
    if (present > total) return errors.push({ line, message: `Present (${present}) is more than total (${total})` });
    const key = `${studentId}|${month}`;
    if (seen.has(key)) return errors.push({ line, message: `Duplicate row for ${studentId} in ${month}` });
    seen.add(key);
    out.push({ studentId, month, present, total });
  });
  return { rows: out, errors };
}

export function validateScores(text: string, roster: Set<string>) {
  const rows = parseCsv(text);
  const errors: RowError[] = [];
  const out: ScoreRow[] = [];
  if (rows.length < 2) return { rows: out, errors: [{ line: 1, message: "File has no data rows" }] };
  const idx = headerIndex(rows[0], ["student_id", "test_name", "test_date", "score", "max_score"]);
  if (typeof idx === "string") return { rows: out, errors: [{ line: 1, message: idx }] };
  const seen = new Set<string>();
  rows.slice(1).forEach((r, k) => {
    const line = k + 2;
    const studentId = (r[idx.student_id] ?? "").trim().toUpperCase();
    const testName = (r[idx.test_name] ?? "").trim();
    const testDate = (r[idx.test_date] ?? "").trim();
    const score = int(r[idx.score] ?? "");
    const maxScore = int(r[idx.max_score] ?? "");
    if (!roster.has(studentId)) return errors.push({ line, message: `${studentId || "(blank)"} is not in this batch` });
    if (!testName || testName.length > 60) return errors.push({ line, message: "Test name is required (max 60 characters)" });
    if (!isIsoDate(testDate)) return errors.push({ line, message: `Date "${testDate}" must look like 2026-10-12` });
    if (Number.isNaN(score) || Number.isNaN(maxScore) || maxScore === 0)
      return errors.push({ line, message: "Score and max score must be whole numbers, max above 0" });
    if (score > maxScore) return errors.push({ line, message: `Score ${score} is above max ${maxScore}` });
    const key = `${studentId}|${testName}`;
    if (seen.has(key)) return errors.push({ line, message: `Duplicate row for ${studentId} in ${testName}` });
    seen.add(key);
    out.push({ studentId, testName, testDate, score, maxScore });
  });
  return { rows: out, errors };
}
