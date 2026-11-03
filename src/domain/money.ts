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
