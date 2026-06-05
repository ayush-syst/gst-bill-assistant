// Tests for the pure domain logic in assets/js/core.mjs
// Run with:  npm test   (which runs `node --test`)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AMOUNT_TOLERANCE,
  normalizeNumber, normalizeInvoiceNo, normalizeInvoiceLoose,
  gstinCheckDigit, gstinChecksumOk, isValidGstin, gstinStateCode,
  billGst, rowStatus, statusBadgeClass,
  parseCsv, normalizeHeader, getByHeader,
  parseInvoiceMonth, invoicePeriodMismatch,
  reconcile, parseBillsCsv, vendorCompliance,
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
