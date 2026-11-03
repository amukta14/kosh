/**
 * Matches an incoming bank/UPI credit to a student.
 *
 * Rule: we only auto-apply a payment when the reference names a real student
 * ID and the amount fits within what that student owes. Everything else goes
 * to the accounts queue with suggestions. Suggestions are never applied
 * automatically: a wrong match would mark the wrong child as paid.
 */

export interface Candidate {
  id: string; // STU-0587
  name: string;
  parentName: string;
  balance: number; // total still owed on the course
  nextDue: number; // balance of the next instalment
}

export interface Incoming {
  amount: number;
  reference: string;
  payerName: string;
}

export type MatchResult =
  | { kind: "auto"; studentId: string; reason: string }
  | { kind: "queue"; reason: string; suggestions: { studentId: string; why: string; score: number }[] };

const ID_RE = /STU[\s\-_/]?(\d{4})/i;

export function extractStudentId(reference: string): string | null {
  const m = reference.match(ID_RE);
  return m ? `STU-${m[1]}` : null;
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach((t) => tb.has(t) && common++);
  return common / Math.min(ta.size, tb.size);
}

export function matchIncoming(inc: Incoming, candidates: Candidate[]): MatchResult {
  if (!Number.isInteger(inc.amount) || inc.amount <= 0) {
    return { kind: "queue", reason: "Amount is not a positive whole rupee value", suggestions: [] };
  }
  const id = extractStudentId(inc.reference);
  const byId = id ? candidates.find((c) => c.id === id) : undefined;

  if (byId) {
    if (byId.balance <= 0) return { kind: "queue", reason: `${id} has nothing outstanding, possible duplicate`, suggestions: [] };
    if (inc.amount > byId.balance)
      return {
        kind: "queue",
        reason: `${id} owes ${byId.balance}, received ${inc.amount}. Overpayment needs a person to decide`,
        suggestions: [{ studentId: byId.id, why: "Student ID in reference", score: 1 }],
      };
    return { kind: "auto", studentId: byId.id, reason: `Student ID ${id} found in reference` };
  }

  const suggestions = candidates
    .map((c) => {
      const nameScore = Math.max(nameSimilarity(inc.payerName, c.parentName), nameSimilarity(inc.payerName, c.name), nameSimilarity(inc.reference, c.name));
      const amountScore = inc.amount === c.nextDue ? 1 : inc.amount <= c.balance ? 0.3 : 0;
      const score = nameScore * 0.65 + amountScore * 0.35;
      const why = [nameScore >= 0.5 ? "name matches" : null, amountScore === 1 ? "amount equals next instalment" : null]
        .filter(Boolean)
        .join(", ");
      return { studentId: c.id, why, score };
    })
    .filter((s) => s.score >= 0.4 && s.why)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    kind: "queue",
    reason: id ? `Reference names ${id}, which is not on our rolls` : "No student ID in reference",
    suggestions,
  };
}
