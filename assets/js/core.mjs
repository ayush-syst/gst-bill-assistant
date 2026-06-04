// =============================================================
// core.mjs — pure, DOM-free domain logic (the correctness core)
//
// This is the single source of truth for GST/reconciliation logic. It has no
// dependency on the DOM or app state, so it can be imported by the browser app
// (assets/js/app.js) AND by the Node test suite (tests/core.test.mjs).
// =============================================================

/** Rs. rounding tolerance used for total checks and 2B matching. */
export const AMOUNT_TOLERANCE = 2;

// ---------- Number / string normalization ----------

/** Extract a clean numeric string from a value (strips ₹, commas, spaces). */
export function normalizeNumber(value) {
  if (!value) return "";
  const cleaned = String(value).replace(/[₹,\s]/g, "").match(/-?\d+(\.\d+)?/);
  return cleaned ? cleaned[0] : "";
}

/** Normalize an invoice number for exact comparison (uppercase, alphanumeric only). */
export function normalizeInvoiceNo(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Looser invoice key for fallback matching: strips leading zeros from each digit
 * group (so "INV-0042" and "INV42" collide). Leading zeros mid-number are kept
 * (e.g. "INV1020" is unchanged).
 */
export function normalizeInvoiceLoose(value) {
  return normalizeInvoiceNo(value).replace(/(^|[A-Z])0+(\d)/g, "$1$2");
}

// ---------- GSTIN ----------

const GSTIN_CODE = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Compute the official GSTIN check digit (15th char) from the first 14 chars. */
export function gstinCheckDigit(first14) {
  let factor = 2, sum = 0;
  for (let i = first14.length - 1; i >= 0; i--) {
    let d = factor * GSTIN_CODE.indexOf(first14[i]);
    factor = factor === 2 ? 1 : 2;
    d = Math.floor(d / 36) + (d % 36);
    sum += d;
  }
  return GSTIN_CODE[(36 - (sum % 36)) % 36];
}

/** True if the GSTIN is 15 chars and its checksum digit is correct. */
export function gstinChecksumOk(gstin) {
  const g = String(gstin || "").toUpperCase();
  return /^[0-9A-Z]{15}$/.test(g) && gstinCheckDigit(g.slice(0, 14)) === g[14];
}

/** Validate a GSTIN: 15-char structure + official checksum (catches typos/OCR errors). */
export function isValidGstin(gstin) {
  const g = String(gstin || "").toUpperCase();
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g) && gstinChecksumOk(g);
}

/** Extract the 2-digit state code from a GSTIN. */
export function gstinStateCode(gstin) {
  return (gstin && gstin.length >= 2) ? gstin.substring(0, 2) : "";
}

// ---------- Bill math & status ----------

/** Sum of CGST + SGST + IGST for a bill. */
export function billGst(bill) {
  return Number(bill.cgst || 0) + Number(bill.sgst || 0) + Number(bill.igst || 0);
}

/** Determine the review status of a bill row. */
export function rowStatus(bill) {
  const missing = ["vendor", "gstin", "invoiceNo", "date", "taxable", "total"].filter(k => !bill[k]);
  if (missing.length || !isValidGstin(bill.gstin)) return "Review";
  if (bill.itcType === "Blocked / review") return "ITC blocked";
  if (bill.risk === "Duplicate") return "Duplicate";
  const gst = billGst(bill);
  const expected = Number(bill.taxable || 0) + gst;
  if (Math.abs(expected - Number(bill.total || 0)) > AMOUNT_TOLERANCE) return "Check total";
  return "Ready";
}

/** Map a status string to a badge CSS class. */
export function statusBadgeClass(status) {
  if (status === "Ready") return "badge-ok";
  if (status === "Check total" || status === "ITC blocked") return "badge-warn";
  return "badge-bad";
}

// ---------- CSV ----------

/** Parse a CSV string into an array of arrays (handles quotes, commas, CRLF). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && quoted && next === '"') {
      current += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(current);
      if (row.some(c => c.trim())) rows.push(row);
      row = [];
      current = "";
    } else {
      current += ch;
    }
  }
  row.push(current);
  if (row.some(c => c.trim())) rows.push(row);
  return rows;
}

/** Normalize a header label for matching (lowercase alphanumerics only). */
export function normalizeHeader(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Look up a record field by any of the given header aliases. */
export function getByHeader(record, aliases) {
  for (const alias of aliases) {
    const found = Object.keys(record).find(k => normalizeHeader(k) === normalizeHeader(alias));
    if (found) return record[found];
  }
  return "";
}
