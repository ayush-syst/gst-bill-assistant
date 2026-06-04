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
