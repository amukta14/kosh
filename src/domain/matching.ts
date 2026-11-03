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

/**
 * 1 = first name and surname match, 0.6 = surname only, 0.35 = first name only.
 * Bank narrations often carry initials ("R SHARMA"), so an initial counts as a first-name match.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  const surname = ta[ta.length - 1] === tb[tb.length - 1];
  const fa = a.trim().toLowerCase().split(/\s+/)[0] ?? "";
  const fb = tb[0];
  const first = fa === fb || (fa.length === 1 && fb.startsWith(fa));
  return surname && first ? 1 : surname ? 0.6 : first && ta.length > 1 && tb.length > 1 ? 0.35 : 0;
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
      // A matching amount alone is never enough: hundreds of students owe the same instalment.
      const score = nameScore >= 0.6 ? nameScore * 0.65 + amountScore * 0.35 : 0;
      const why = [nameScore === 1 ? "full name matches" : nameScore >= 0.6 ? "same surname" : null, amountScore === 1 ? "amount equals next instalment" : null]
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
