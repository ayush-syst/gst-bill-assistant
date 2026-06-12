// Tests for the pure domain logic in assets/js/core.mjs
// Run with:  npm test   (which runs `node --test`)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AMOUNT_TOLERANCE,
  normalizeNumber, normalizeInvoiceNo, normalizeInvoiceLoose, normalizeInvoiceOcr,
  gstinCheckDigit, gstinChecksumOk, isValidGstin, gstinStateCode,
  billGst, rowStatus, statusBadgeClass,
  parseCsv, normalizeHeader, getByHeader,
  parseInvoiceMonth, invoicePeriodMismatch,
  reconcile, consolidate2bRows, parseBillsCsv, vendorCompliance,
  gstRate, rateWiseSummary, itcSummary,
} from "../assets/js/core.mjs";

// ---------- normalizeNumber ----------
test("normalizeNumber strips currency, commas, spaces", () => {
  assert.equal(normalizeNumber("₹1,234.50"), "1234.50");
  assert.equal(normalizeNumber("Rs. 100"), "100");
  assert.equal(normalizeNumber("  42 "), "42");
  assert.equal(normalizeNumber("-9.5"), "-9.5");
  assert.equal(normalizeNumber(""), "");
  assert.equal(normalizeNumber("abc"), "");
});

// ---------- invoice normalization ----------
test("normalizeInvoiceNo keeps only uppercase alphanumerics", () => {
  assert.equal(normalizeInvoiceNo("inv-2026/1042"), "INV20261042");
  assert.equal(normalizeInvoiceNo("  BLR 2451/26 "), "BLR245126");
});

test("normalizeInvoiceLoose drops leading zeros per digit group only", () => {
  assert.equal(normalizeInvoiceLoose("INV-0042"), "INV42");
  assert.equal(normalizeInvoiceLoose("PP/0891"), "PP891");
  assert.equal(normalizeInvoiceLoose("0042"), "42");
  assert.equal(normalizeInvoiceLoose("INV1020"), "INV1020"); // mid-number zeros preserved
  assert.equal(normalizeInvoiceLoose("INV42"), "INV42");
  // the whole point: a leading-zero variant and its plain form collide
  assert.equal(normalizeInvoiceLoose("PP/0891"), normalizeInvoiceLoose("PP/891"));
});

test("normalizeInvoiceOcr folds OCR-confusable chars (and leading zeros)", () => {
  // an OCR misread of the trailing "1" as "I" still collides
  assert.equal(normalizeInvoiceOcr("PP/89I"), normalizeInvoiceOcr("PP/891"));
  // every confusable folds (the key is internal-only, both sides fold identically):
  // I→1 and O→0, then the leading zeros strip away
  assert.equal(normalizeInvoiceOcr("INVO042"), "1NV42");   // I→1, O→0, then leading-zero strip
  assert.equal(normalizeInvoiceOcr("5B"), "58");           // S→5, B→8
  assert.equal(normalizeInvoiceOcr("GZ"), "62");           // G→6, Z→2
  // still a superset of the leading-zero collision
  assert.equal(normalizeInvoiceOcr("PP/0891"), normalizeInvoiceOcr("PP/891"));
});

// ---------- GSTIN ----------
test("gstinCheckDigit matches the official example", () => {
  assert.equal(gstinCheckDigit("27AAPFU0939F1Z"), "V");
});

test("isValidGstin accepts valid GSTINs and rejects bad checksum/structure", () => {
  assert.equal(isValidGstin("27AAPFU0939F1ZV"), true);
  assert.equal(isValidGstin("27ABCDE1234F1Z0"), true);
  assert.equal(isValidGstin("29AAICA3918J1ZE"), true);
  assert.equal(isValidGstin("27AAHCA1234M1ZO"), true);
  assert.equal(isValidGstin("27AAHCA1234M1Z2"), false); // wrong check digit
  assert.equal(isValidGstin("27AAPFU0939F1ZX"), false); // wrong check digit
  assert.equal(isValidGstin("27AAPFU0939F1Z"), false);  // 14 chars
  assert.equal(isValidGstin("ABCDE1234F1Z0XX"), false); // bad structure
  assert.equal(isValidGstin(""), false);
  assert.equal(isValidGstin(null), false);
});

test("gstinChecksumOk and gstinStateCode", () => {
  assert.equal(gstinChecksumOk("27AAPFU0939F1ZV"), true);
  assert.equal(gstinChecksumOk("27AAPFU0939F1ZX"), false);
  assert.equal(gstinStateCode("27AAPFU0939F1ZV"), "27");
  assert.equal(gstinStateCode(""), "");
});

// ---------- bill math & status ----------
test("billGst sums the three taxes", () => {
  assert.equal(billGst({ cgst: "100", sgst: "100", igst: "0" }), 200);
  assert.equal(billGst({ igst: "180" }), 180);
  assert.equal(billGst({}), 0);
});

const readyBill = {
  vendor: "Acme", gstin: "27ABCDE1234F1Z0", invoiceNo: "INV1", date: "12/05/2026",
  taxable: "100", cgst: "9", sgst: "9", igst: "0", total: "118",
  itcType: "Input goods", risk: "",
};

test("rowStatus: a complete, balanced bill is Ready", () => {
  assert.equal(rowStatus(readyBill), "Ready");
});

test("rowStatus: within tolerance still Ready, beyond tolerance is Check total", () => {
  assert.equal(rowStatus({ ...readyBill, total: String(118 + AMOUNT_TOLERANCE) }), "Ready");
  assert.equal(rowStatus({ ...readyBill, total: "130" }), "Check total");
});

test("rowStatus: blocked ITC, duplicate, and review precedence", () => {
  assert.equal(rowStatus({ ...readyBill, itcType: "Blocked / review" }), "ITC blocked");
  assert.equal(rowStatus({ ...readyBill, risk: "Duplicate" }), "Duplicate");
  assert.equal(rowStatus({ ...readyBill, vendor: "" }), "Review");            // missing field
  assert.equal(rowStatus({ ...readyBill, gstin: "27AAHCA1234M1Z2" }), "Review"); // bad checksum
});

test("statusBadgeClass maps statuses to classes", () => {
  assert.equal(statusBadgeClass("Ready"), "badge-ok");
  assert.equal(statusBadgeClass("Check total"), "badge-warn");
  assert.equal(statusBadgeClass("ITC blocked"), "badge-warn");
  assert.equal(statusBadgeClass("Review"), "badge-bad");
  assert.equal(statusBadgeClass("Duplicate"), "badge-bad");
});

// ---------- CSV ----------
test("parseCsv handles quotes, embedded commas, and CRLF", () => {
  const rows = parseCsv('a,b,c\n1,"2,3",4\r\n5,6,7');
  assert.deepEqual(rows, [["a", "b", "c"], ["1", "2,3", "4"], ["5", "6", "7"]]);
});

test("parseCsv skips fully-blank lines and unescapes doubled quotes", () => {
  const rows = parseCsv('x\n\n"he said ""hi"""');
  assert.deepEqual(rows, [["x"], ['he said "hi"']]);
});

test("getByHeader resolves aliases case/space/punctuation-insensitively", () => {
  const record = { "Supplier GSTIN": "27ABCDE1234F1Z0", "Invoice Number": "INV1" };
  assert.equal(getByHeader(record, ["GSTIN", "Supplier GSTIN"]), "27ABCDE1234F1Z0");
  assert.equal(getByHeader(record, ["Invoice No", "Invoice Number"]), "INV1");
  assert.equal(getByHeader(record, ["Nope"]), "");
  assert.equal(normalizeHeader("Invoice No."), "invoiceno");
});

// ---------- dates / return period ----------
test("parseInvoiceMonth handles the common invoice date formats", () => {
  assert.equal(parseInvoiceMonth("12/05/2026"), "2026-05"); // DD/MM/YYYY
  assert.equal(parseInvoiceMonth("18-05-2026"), "2026-05");
  assert.equal(parseInvoiceMonth("21 May 2026"), "2026-05");
  assert.equal(parseInvoiceMonth("09.06.26"), "2026-06");   // 2-digit year
  assert.equal(parseInvoiceMonth("2026-05-31"), "2026-05"); // ISO
  assert.equal(parseInvoiceMonth("2026-05"), "2026-05");
  assert.equal(parseInvoiceMonth("garbage"), "");
  assert.equal(parseInvoiceMonth("12/13/2026"), "");        // month 13 invalid (day-first)
  assert.equal(parseInvoiceMonth(""), "");
});

test("invoicePeriodMismatch flags only confidently-out-of-period dates", () => {
  assert.equal(invoicePeriodMismatch({ date: "12/05/2026" }, "2026-05"), false); // in period
  assert.equal(invoicePeriodMismatch({ date: "12/04/2026" }, "2026-05"), true);  // prior month
  assert.equal(invoicePeriodMismatch({ date: "garbage" }, "2026-05"), false);    // unparseable → no flag
  assert.equal(invoicePeriodMismatch({ date: "12/04/2026" }, ""), false);        // no period → no flag
});

// ---------- reconcile (integration) ----------
const b = (gstin, invoiceNo, amts) => ({ gstin, invoiceNo, ...amts });

test("reconcile: exact match, mismatch, missing-in-2B, and unmatched 2B rows", () => {
  const bills = [
    b("27ABCDE1234F1Z0", "INV-1", { taxable: "1000", cgst: "90", sgst: "90", igst: "0", total: "1180" }),
    b("27ABCDE1234F1Z0", "INV-2", { taxable: "5000", cgst: "0", sgst: "0", igst: "900", total: "5900" }),
    b("27ABCDE1234F1Z0", "INV-9", { taxable: "300", cgst: "27", sgst: "27", igst: "0", total: "354" }),
  ];
  const rows = [
    { gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-1", taxable: "1000", cgst: "90", sgst: "90", igst: "0", total: "1180" },
    { gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-2", taxable: "4500", cgst: "0", sgst: "0", igst: "810", total: "5310" }, // differs
    { gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-7", taxable: "200", cgst: "18", sgst: "18", igst: "0", total: "236" },   // only in 2B
  ];
  const { bills: out, unmatched } = reconcile(bills, rows);
  assert.equal(out[0].reco, "Matched");
  assert.equal(out[1].reco, "Mismatch");
  assert.match(out[1].recoNote, /TAXABLE: books 5000 vs 2B 4500/);
  assert.equal(out[2].reco, "Missing in 2B");
  assert.equal(unmatched.length, 1);
  assert.equal(unmatched[0].invoiceNo, "INV-7");
});

test("reconcile: leading-zero fallback matches and is flagged", () => {
  const bills = [b("27ABCDE1234F1Z0", "PP/891", { taxable: "8600", cgst: "774", sgst: "774", igst: "0", total: "10148" })];
  const rows = [{ gstin: "27ABCDE1234F1Z0", invoiceNo: "PP/0891", taxable: "8600", cgst: "774", sgst: "774", igst: "0", total: "10148" }];
  const { bills: out, unmatched } = reconcile(bills, rows);
  assert.equal(out[0].reco, "Matched");
  assert.match(out[0].recoNote, /ignoring leading zeros/);
  assert.equal(unmatched.length, 0);
});

test("reconcile: amount diffs within tolerance are still Matched", () => {
  const bills = [b("27ABCDE1234F1Z0", "INV-1", { taxable: "1000", total: "1180" })];
  const rows = [{ gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-1", taxable: "1001", total: "1181" }]; // off by 1 (≤2)
  assert.equal(reconcile(bills, rows)[ "bills" ][0].reco, "Matched");
});

test("reconcile tier 3 (OCR): invoice-no misread still matches, flagged + tagged", () => {
  const bills = [b("27ABCDE1234F1Z0", "PP/891", { taxable: "8600", cgst: "774", sgst: "774", igst: "0", total: "10148" })];
  // 2B has the same invoice but the trailing "1" was OCR'd as "I"
  const rows = [{ gstin: "27ABCDE1234F1Z0", invoiceNo: "PP/89I", taxable: "8600", cgst: "774", sgst: "774", igst: "0", total: "10148" }];
  const { bills: out, unmatched } = reconcile(bills, rows);
  assert.equal(out[0].reco, "Matched");
  assert.equal(out[0].matchType, "ocr");
  assert.match(out[0].recoNote, /OCR misread/);
  assert.equal(unmatched.length, 0);
});

test("reconcile tier 4 (GSTIN + amount): different invoice text, equal amounts → probable match", () => {
  const bills = [b("27ABCDE1234F1Z0", "INV-2026-0042", { taxable: "1000", cgst: "90", sgst: "90", igst: "0", total: "1180" })];
  // same supplier + identical amounts, but the 2B invoice string is formatted completely differently
  const rows = [{ gstin: "27ABCDE1234F1Z0", invoiceNo: "42/2026-27", taxable: "1000", cgst: "90", sgst: "90", igst: "0", total: "1180" }];
  const { bills: out, unmatched } = reconcile(bills, rows);
  assert.equal(out[0].reco, "Matched");
  assert.equal(out[0].matchType, "amount");
  assert.match(out[0].recoNote, /GSTIN \+ amount/);
  assert.equal(unmatched.length, 0);
});

test("reconcile tier 4 does NOT fire when totals differ beyond tolerance", () => {
  const bills = [b("27ABCDE1234F1Z0", "INV-A", { taxable: "1000", total: "1180" })];
  const rows = [{ gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-B", taxable: "1000", total: "1300" }]; // total off by 120
  const { bills: out, unmatched } = reconcile(bills, rows);
  assert.equal(out[0].reco, "Missing in 2B");
  assert.equal(unmatched.length, 1);
});

test("reconcile: a 2B row is claimed once — exact wins over a looser tier", () => {
  // Two book bills, same GSTIN. One is the exact INV-1; the other has a different
  // invoice but the same amounts. Only one real 2B row (INV-1) exists.
  const bills = [
    b("27ABCDE1234F1Z0", "INV-1",   { taxable: "1000", total: "1180" }),
    b("27ABCDE1234F1Z0", "OTHER-9", { taxable: "1000", total: "1180" }),
  ];
  const rows = [{ gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-1", taxable: "1000", total: "1180" }];
  const { bills: out, unmatched } = reconcile(bills, rows);
  assert.equal(out[0].reco, "Matched");        // exact claims the row
  assert.equal(out[0].matchType, "exact");
  assert.equal(out[1].reco, "Missing in 2B");  // amount tier can't reuse a claimed row
  assert.equal(unmatched.length, 0);
});

test("reconcile: exact matches keep an empty note and 'exact' matchType", () => {
  const bills = [b("27ABCDE1234F1Z0", "INV-1", { taxable: "1000", cgst: "90", sgst: "90", igst: "0", total: "1180" })];
  const rows = [{ gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-1", taxable: "1000", cgst: "90", sgst: "90", igst: "0", total: "1180" }];
  const out = reconcile(bills, rows).bills[0];
  assert.equal(out.reco, "Matched");
  assert.equal(out.matchType, "exact");
  assert.equal(out.recoNote, "");
});

// ---------- consolidate2bRows (split invoices) ----------
test("consolidate2bRows sums same-invoice lines and counts them", () => {
  const rows = [
    { gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-1", taxable: "5000", cgst: "0", sgst: "0", igst: "900", total: "5900" },
    { gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-1", taxable: "5000", cgst: "0", sgst: "0", igst: "600", total: "5600" }, // same invoice, 2nd rate line
    { gstin: "29AAICA3918J1ZE", invoiceNo: "INV-2", taxable: "1000", cgst: "90", sgst: "90", igst: "0", total: "1180" }, // distinct
  ];
  const out = consolidate2bRows(rows);
  assert.equal(out.length, 2);
  const inv1 = out.find(r => r.invoiceNo === "INV-1");
  assert.equal(inv1.lines, 2);
  assert.equal(inv1.taxable, 10000);   // 5000 + 5000
  assert.equal(inv1.igst, 1500);       // 900 + 600
  assert.equal(inv1.total, 11500);     // 5900 + 5600
  assert.equal(out.find(r => r.invoiceNo === "INV-2").lines, 1);
});

test("reconcile: one bill matches an invoice the 2B split into multiple lines", () => {
  const bills = [b("27ABCDE1234F1Z0", "INV-1", { taxable: "10000", cgst: "0", sgst: "0", igst: "1500", total: "11500" })];
  const rows = [
    { gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-1", taxable: "5000", cgst: "0", sgst: "0", igst: "900", total: "5900" },
    { gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-1", taxable: "5000", cgst: "0", sgst: "0", igst: "600", total: "5600" },
  ];
  const { bills: out, unmatched } = reconcile(bills, rows);
  assert.equal(out[0].reco, "Matched");                       // summed 2B == book → match
  assert.match(out[0].recoNote, /Consolidated 2 2B lines/);   // and the CA is told it was a sum
  assert.equal(unmatched.length, 0);                          // no phantom "missing in books" row
});

test("reconcile: consolidated 2B sum that still differs from books is a Mismatch", () => {
  const bills = [b("27ABCDE1234F1Z0", "INV-1", { taxable: "9000", igst: "1620", total: "10620" })];
  const rows = [
    { gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-1", taxable: "5000", igst: "900", total: "5900" },
    { gstin: "27ABCDE1234F1Z0", invoiceNo: "INV-1", taxable: "5000", igst: "900", total: "5900" }, // sum 10000 ≠ books 9000
  ];
  const out = reconcile(bills, rows).bills[0];
  assert.equal(out.reco, "Mismatch");
  assert.match(out.recoNote, /Consolidated 2 2B lines/);
  assert.match(out.recoNote, /TAXABLE: books 9000 vs 2B 10000/);
});

// ---------- parseBillsCsv (integration) ----------
test("parseBillsCsv maps header-aliased columns and skips empty rows", () => {
  const csv = [
    "Supplier Name,Vendor GSTIN,Bill No,Invoice Date,Taxable Value,CGST,SGST,IGST,Total",
    'Foo Traders,27abcde1234f1z0,IMP-1,03/05/2026,"2,000",180,180,0,2360',
    ",,,,,,,,",
  ].join("\n");
  const out = parseBillsCsv(csv);
  assert.equal(out.length, 1);
  assert.equal(out[0].vendor, "Foo Traders");
  assert.equal(out[0].gstin, "27ABCDE1234F1Z0"); // upper-cased
  assert.equal(out[0].invoiceNo, "IMP-1");
  assert.equal(out[0].taxable, "2000");          // comma stripped
  assert.equal(out[0].ledger, "Purchase Account"); // default
});

// ---------- vendorCompliance ----------
test("vendorCompliance scores risk and sorts worst-first", () => {
  const bills = [
    { vendor: "Good Co", gstin: "27ABCDE1234F1Z0", reco: "Matched", cgst: "90", sgst: "90", taxable: "1000", total: "1180", itcType: "Input goods", risk: "" },
    { vendor: "Good Co", gstin: "27ABCDE1234F1Z0", reco: "Matched", cgst: "45", sgst: "45", taxable: "500", total: "590", itcType: "Input goods", risk: "" },
    { vendor: "Risky Co", gstin: "29AAICA3918J1ZE", reco: "Missing in 2B", igst: "180", taxable: "1000", total: "1180", itcType: "Input goods", risk: "" },
    { vendor: "Mismatch Co", gstin: "24AABCP1234K1ZP", reco: "Mismatch", cgst: "60", sgst: "60", taxable: "700", total: "820", itcType: "Input goods", risk: "" },
  ];
  const rows = vendorCompliance(bills);
  const byName = Object.fromEntries(rows.map(r => [r.vendor, r]));
  assert.equal(byName["Good Co"].matchRate, 100);
  assert.equal(byName["Good Co"].risk, "Low");
  assert.equal(byName["Good Co"].itcReady, 270);
  assert.equal(byName["Risky Co"].risk, "High");   // missing in 2B
  assert.equal(byName["Risky Co"].itcRisk, 180);
  assert.equal(byName["Mismatch Co"].risk, "Medium");
  assert.equal(rows[0].risk, "High");              // worst sorted first
});

// ---------- rate-wise summary ----------
test("gstRate computes effective rate and rateWiseSummary buckets to slabs", () => {
  assert.equal(gstRate({ taxable: "1000", cgst: "90", sgst: "90" }), 18);
  assert.equal(gstRate({ taxable: "0" }), null);

  const bills = [
    { taxable: "1000", cgst: "90", sgst: "90", igst: "0", total: "1180" },   // 18%
    { taxable: "2000", cgst: "0", sgst: "0", igst: "359", total: "2359" },   // ~17.95% → snaps to 18
    { taxable: "1000", cgst: "60", sgst: "60", igst: "0", total: "1120" },   // 12%
    { taxable: "0",    cgst: "0", sgst: "0", igst: "0", total: "0" },        // N/A
  ];
  const rows = rateWiseSummary(bills);
  const byRate = Object.fromEntries(rows.map(r => [String(r.rate), r]));
  assert.equal(byRate["18"].bills, 2);             // both 18% bills grouped
  assert.equal(byRate["18"].taxable, 3000);
  assert.equal(byRate["12"].bills, 1);
  assert.ok(byRate["N/A"]);                          // zero-taxable bucket exists
  assert.equal(rows[0].rate, "N/A");                // N/A sorts first
});

// ---------- net ITC (GSTR-3B) summary ----------
test("itcSummary buckets ITC into eligible / blocked / at-risk / unreconciled", () => {
  const bills = [
    { cgst: "90", sgst: "90", reco: "Matched", itcType: "Input goods", risk: "" },        // eligible 180
    { igst: "180", reco: "Missing in 2B", itcType: "Input goods", risk: "" },              // at-risk 180
    { cgst: "45", sgst: "45", reco: "Matched", itcType: "Blocked / review", risk: "" },    // blocked 90
    { cgst: "30", sgst: "30", reco: "Matched", itcType: "Input goods", risk: "Duplicate" },// at-risk 60 (dup)
    { cgst: "10", sgst: "10", reco: "", itcType: "Input goods", risk: "" },                // unreconciled 20
  ];
  const s = itcSummary(bills);
  assert.equal(s.total, 180 + 180 + 90 + 60 + 20);
  assert.equal(s.eligible, 180);
  assert.equal(s.blocked, 90);
  assert.equal(s.atRisk, 240);          // missing 180 + duplicate 60
  assert.equal(s.unreconciled, 20);
  assert.equal(s.netAvailable, 180);    // == eligible
});
