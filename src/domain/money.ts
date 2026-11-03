const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inrFmt2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function inr(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  return `${sign}₹${inrFmt.format(Math.abs(Math.round(amount)))}`;
}

export function inr2(amount: number): string {
  return `₹${inrFmt2.format(amount)}`;
}

/** Compact Indian units: ₹4.2L, ₹1.3Cr. */
export function inrCompact(amount: number): string {
  const a = Math.abs(amount);
  if (a >= 1e7) return `₹${(amount / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `₹${(amount / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `₹${(amount / 1e3).toFixed(1)}k`;
  return inr(amount);
}

export const GST_RATE = 18; // coaching services, SAC 999293 (assumption A7)
export const SAC_CODE = "999293";

/**
 * Splits a GST-inclusive amount into taxable value + CGST + SGST (intra-state,
 * Rajasthan). Works in paise so the parts always add back to the total.
 */
export function gstSplit(inclusive: number, rate = GST_RATE) {
  const totalPaise = Math.round(inclusive * 100);
  const taxablePaise = Math.round((totalPaise * 100) / (100 + rate));
  const gstPaise = totalPaise - taxablePaise;
  const cgstPaise = Math.floor(gstPaise / 2);
  const sgstPaise = gstPaise - cgstPaise;
  return {
    total: totalPaise / 100,
    taxable: taxablePaise / 100,
    cgst: cgstPaise / 100,
    sgst: sgstPaise / 100,
    rate,
  };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below100(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}
function below1000(n: number) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? below100(r) : ""].filter(Boolean).join(" ");
}

/** Amount in words, Indian system: 1,20,000 → "One Lakh Twenty Thousand Rupees Only". */
export function rupeesInWords(amount: number): string {
  let n = Math.round(amount);
  if (n === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(`${below1000(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (n) parts.push(below1000(n));
  return `${parts.join(" ")} Rupees Only`;
}
