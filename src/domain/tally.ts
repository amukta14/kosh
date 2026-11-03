import { gstSplit } from "./money";

export interface TallyReceipt {
  receiptNo: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  centre: string;
  method: string;
  reference: string;
  amount: number;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const ledgerForMethod = (m: string) => (m === "cash" ? "Cash" : m === "gateway" ? "Payment Gateway Clearing" : "HDFC Bank Current A/c");

/**
 * Tally Prime "Import Data" XML: one Receipt voucher per payment. Fee income is
 * split into taxable value + Output CGST + Output SGST so GST returns reconcile.
 * Ledger names are assumptions (A12) and would be mapped to the client's chart.
 */
export function buildTallyXml(rows: TallyReceipt[], company = "Company A"): string {
  const vouchers = rows
    .map((r) => {
      const g = gstSplit(r.amount);
      const d = r.date.replace(/-/g, "");
      return `   <TALLYMESSAGE xmlns:UDF="TallyUDF">
    <VOUCHER VCHTYPE="Receipt" ACTION="Create">
     <DATE>${d}</DATE>
     <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
     <VOUCHERNUMBER>${esc(r.receiptNo)}</VOUCHERNUMBER>
     <NARRATION>${esc(`${r.studentId} ${r.studentName} · ${r.centre} · ${r.method.toUpperCase()} ${r.reference}`)}</NARRATION>
     <ALLLEDGERENTRIES.LIST><LEDGERNAME>${esc(ledgerForMethod(r.method))}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${g.total.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>
     <ALLLEDGERENTRIES.LIST><LEDGERNAME>${esc(`Coaching Fee Income - ${r.centre}`)}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${g.taxable.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>
     <ALLLEDGERENTRIES.LIST><LEDGERNAME>Output CGST 9%</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${g.cgst.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>
     <ALLLEDGERENTRIES.LIST><LEDGERNAME>Output SGST 9%</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${g.sgst.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>
    </VOUCHER>
   </TALLYMESSAGE>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
 <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>${esc(company)}</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC>
   <REQUESTDATA>
${vouchers}
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>
`;
}

const csvCell = (v: string | number) => {
  const s = String(v);
  // Guard against spreadsheet formula injection as well as commas/quotes.
  const safe = /^[=+\-@]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function buildReceiptsCsv(rows: TallyReceipt[]): string {
  const head = ["Receipt No", "Date", "Student ID", "Student", "Centre", "Method", "Reference", "Amount", "Taxable", "CGST", "SGST"];
  const body = rows.map((r) => {
    const g = gstSplit(r.amount);
    return [r.receiptNo, r.date, r.studentId, r.studentName, r.centre, r.method, r.reference, r.amount, g.taxable.toFixed(2), g.cgst.toFixed(2), g.sgst.toFixed(2)]
      .map(csvCell)
      .join(",");
  });
  return [head.join(","), ...body].join("\n") + "\n";
}
