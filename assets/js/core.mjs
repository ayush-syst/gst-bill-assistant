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

/** Letters most often confused with digits by OCR, folded to their digit lookalike. */
const OCR_FOLD = { O: "0", I: "1", L: "1", S: "5", B: "8", Z: "2", G: "6" };

/**
 * OCR-tolerant invoice key: on top of the leading-zero-loose key, folds the
 * characters OCR most often misreads (O→0, I/L→1, S→5, B→8, Z→2, G→6) so a
 * scan of "PP/891" that comes through as "PP/89I" still collides. Riskier than
 * the loose key (it can over-merge), so it is only used as a later fallback and
 * always flagged for the reviewer.
 */
export function normalizeInvoiceOcr(value) {
  const folded = normalizeInvoiceNo(value).replace(/[OILSBZG]/g, ch => OCR_FOLD[ch]);
  return folded.replace(/(^|[A-Z])0+(\d)/g, "$1$2");
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

// ---------- Dates / return period ----------

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Parse an invoice date into a "YYYY-MM" string, or "" if unparseable.
 * Handles Indian DD/MM/YYYY (and -, .), "DD Mon YYYY", and ISO YYYY-MM(-DD).
 * Day-first is assumed (Indian convention).
 */
export function parseInvoiceMonth(dateStr) {
  const s = String(dateStr || "").trim();
  if (!s) return "";

  // DD Mon YYYY  e.g. "21 May 2026"
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    return mon ? `${m[3]}-${String(mon).padStart(2, "0")}` : "";
  }

  // DD/MM/YYYY | DD-MM-YYYY | DD.MM.YYYY  (2- or 4-digit year)
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const mon = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    return mon >= 1 && mon <= 12 ? `${year}-${String(mon).padStart(2, "0")}` : "";
  }

  // ISO  YYYY-MM or YYYY-MM-DD
  m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (m) {
    const mon = Number(m[2]);
    return mon >= 1 && mon <= 12 ? `${m[1]}-${String(mon).padStart(2, "0")}` : "";
  }

  return "";
}

/**
 * True if the bill's invoice date is parseable and falls in a different month than
 * the selected return period ("YYYY-MM"). Unparseable dates / no period → false
 * (we don't flag what we can't confidently judge).
 */
export function invoicePeriodMismatch(bill, returnPeriod) {
  const rp = String(returnPeriod || "").trim();
  if (!rp) return false;
  const im = parseInvoiceMonth(bill && bill.date);
  return im !== "" && im !== rp;
}

// ---------- Reconciliation (pure) ----------

/** The five amount fields compared between a book bill and its 2B row. */
const RECO_FIELDS = ["taxable", "cgst", "sgst", "igst", "total"];

/**
 * Consolidate GSTR-2B rows that belong to the SAME invoice (identical GSTIN +
 * invoice number) into one entry whose amounts are the sum of the lines. This lets
 * a single booked bill still match when the 2B — or a tool that converted it — lists
 * that invoice as several line items (split by rate/HSN), and stops a genuinely
 * duplicated 2B invoice from leaving a phantom "missing in books" row. Rows with no
 * GSTIN and no invoice number are left un-grouped. Each result carries `lines` =
 * how many original 2B rows it represents.
 */
export function consolidate2bRows(rows) {
  const groups = new Map();
  (rows || []).forEach((r, idx) => {
    const gstin = String(r.gstin || "").toUpperCase();
    const inv = normalizeInvoiceNo(r.invoiceNo);
    const key = (gstin || inv) ? `${gstin}|${inv}` : `__blank_${idx}`;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, {
        gstin: r.gstin || "", invoiceNo: r.invoiceNo || "",
        taxable: Number(r.taxable || 0), cgst: Number(r.cgst || 0), sgst: Number(r.sgst || 0),
        igst: Number(r.igst || 0), total: Number(r.total || 0), lines: 1,
      });
    } else {
      RECO_FIELDS.forEach(f => { g[f] += Number(r[f] || 0); });
      g.lines += 1;
    }
  });
  return [...groups.values()];
}

/**
 * Reconcile booked bills against GSTR-2B rows with a multi-tier matching cascade.
 *
 * 2B rows for the same invoice are first consolidated (see consolidate2bRows), so a
 * single bill matches an invoice the 2B split across lines. Then each pass runs
 * across ALL still-unmatched bills before the next, and every 2B entry can be claimed
 * only once — so a safe exact match is never stolen by a looser fallback. Tiers,
 * strongest first:
 *   1. exact        — GSTIN + invoice number (alphanumeric, case-insensitive)
 *   2. leading-zero — GSTIN + invoice ignoring leading zeros ("PP/891" ≈ "PP/0891")
 *   3. ocr          — GSTIN + invoice with OCR-confusable chars folded ("89I" ≈ "891")
 *   4. amount       — GSTIN + both taxable AND total within tolerance, invoice no differs
 *                     (kills the false "Missing in 2B" when only the invoice text differs)
 *
 * Output statuses stay "Matched" / "Mismatch" / "Missing in 2B" (so the rest of the
 * app is unaffected); fallback tiers are spelled out in `recoNote` and tagged on
 * `matchType` ("exact" | "leading-zero" | "ocr" | "amount" | "" when unmatched).
 * `unmatched` holds the consolidated 2B entries with no book match (each with `lines`).
 * `money` formats amounts inside notes (defaults to plain numbers).
 */
export function reconcile(bills, rows, { tolerance = AMOUNT_TOLERANCE, money = (n) => String(n) } = {}) {
  // Consolidate split 2B lines, then wrap so each entry can be claimed exactly once.
  const rowList = consolidate2bRows(rows).map(r => ({ r, claimed: false }));
  const billList = (bills || []).map(bill => ({ bill, match: null, matchType: "" }));

  // First row wins for any given key (later duplicates fall through to other tiers).
  const idxExact = new Map(), idxLoose = new Map(), idxOcr = new Map();
  const byGstin = new Map();
  rowList.forEach(rw => {
    const g = String(rw.r.gstin || "").toUpperCase();
    const ek = `${g}|${normalizeInvoiceNo(rw.r.invoiceNo)}`;
    const lk = `${g}|${normalizeInvoiceLoose(rw.r.invoiceNo)}`;
    const ok = `${g}|${normalizeInvoiceOcr(rw.r.invoiceNo)}`;
    if (!idxExact.has(ek)) idxExact.set(ek, rw);
    if (!idxLoose.has(lk)) idxLoose.set(lk, rw);
    if (!idxOcr.has(ok)) idxOcr.set(ok, rw);
    if (!byGstin.has(g)) byGstin.set(g, []);
    byGstin.get(g).push(rw);
  });

  // A keyed pass: claim the first unclaimed 2B row whose key matches each open bill.
  const keyedPass = (index, keyFn, type) => {
    billList.forEach(bl => {
      if (bl.match) return;
      const g = String(bl.bill.gstin || "").toUpperCase();
      const rw = index.get(`${g}|${keyFn(bl.bill.invoiceNo)}`);
      if (rw && !rw.claimed) { rw.claimed = true; bl.match = rw.r; bl.matchType = type; }
    });
  };

  keyedPass(idxExact, normalizeInvoiceNo, "exact");
  keyedPass(idxLoose, normalizeInvoiceLoose, "leading-zero");
  keyedPass(idxOcr, normalizeInvoiceOcr, "ocr");

  // Tier 4 — invoice number differs entirely: fall back to GSTIN + amount.
  // Require BOTH taxable and total within tolerance (a strong pair signal), and
  // pick the closest unclaimed row for that GSTIN.
  billList.forEach(bl => {
    if (bl.match) return;
    const g = String(bl.bill.gstin || "").toUpperCase();
    let best = null, bestDiff = Infinity;
    (byGstin.get(g) || []).forEach(rw => {
      if (rw.claimed) return;
      const dTax = Math.abs(Number(bl.bill.taxable || 0) - Number(rw.r.taxable || 0));
      const dTot = Math.abs(Number(bl.bill.total || 0) - Number(rw.r.total || 0));
      if (dTax <= tolerance && dTot <= tolerance && (dTax + dTot) < bestDiff) {
        bestDiff = dTax + dTot; best = rw;
      }
    });
    if (best) { best.claimed = true; bl.match = best.r; bl.matchType = "amount"; }
  });

  const out = billList.map(({ bill, match, matchType }) => {
    if (!match) return { ...bill, reco: "Missing in 2B", matchType: "", recoNote: "No GSTIN + invoice match in 2B" };

    // When the 2B side was several lines for this invoice, say so — the 2B figures
    // shown below are the consolidated sum.
    const consNote = match.lines > 1 ? `Consolidated ${match.lines} 2B lines for this invoice. ` : "";

    let prefix = "";
    if (matchType === "leading-zero")
      prefix = `Matched ignoring leading zeros (books "${bill.invoiceNo}" ≈ 2B "${match.invoiceNo}"). `;
    else if (matchType === "ocr")
      prefix = `Probable match — invoice no likely an OCR misread (books "${bill.invoiceNo}" ≈ 2B "${match.invoiceNo}"). Verify. `;
    else if (matchType === "amount")
      prefix = `Probable match on GSTIN + amount — invoice no differs (books "${bill.invoiceNo}" vs 2B "${match.invoiceNo}"). Verify. `;

    const mismatches = RECO_FIELDS.filter(f => Math.abs(Number(bill[f] || 0) - Number(match[f] || 0)) > tolerance);
    if (mismatches.length) {
      const detail = mismatches
        .map(f => `${f.toUpperCase()}: books ${money(Number(bill[f] || 0))} vs 2B ${money(Number(match[f] || 0))}`)
        .join("; ");
      return { ...bill, reco: "Mismatch", matchType, recoNote: consNote + prefix + detail };
    }
    return { ...bill, reco: "Matched", matchType, recoNote: (consNote + prefix).trim() };
  });

  return { bills: out, unmatched: rowList.filter(rw => !rw.claimed).map(rw => rw.r) };
}

// ---------- CSV → bills (pure) ----------

/** Map a bills CSV (header row + data) into normalized bill field objects (no id). */
export function parseBillsCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(row => {
    const rec = {};
    headers.forEach((h, i) => { rec[h] = row[i] || ""; });
    return {
      vendor:    String(getByHeader(rec, ["Vendor", "Vendor Name", "Supplier", "Supplier Name"])).trim(),
      gstin:     String(getByHeader(rec, ["GSTIN", "Vendor GSTIN", "Supplier GSTIN", "GSTIN of supplier"])).trim().toUpperCase(),
      invoiceNo: String(getByHeader(rec, ["Invoice No", "Invoice Number", "Bill No", "Bill Number"])).trim(),
      date:      String(getByHeader(rec, ["Date", "Invoice Date"])).trim(),
      hsn:       String(getByHeader(rec, ["HSN", "HSN/SAC", "HSN Code", "SAC", "SAC Code"])).trim(),
      taxable:   normalizeNumber(getByHeader(rec, ["Taxable", "Taxable Value", "Taxable Amount"])),
      cgst:      normalizeNumber(getByHeader(rec, ["CGST", "Central Tax"])),
      sgst:      normalizeNumber(getByHeader(rec, ["SGST", "State Tax"])),
      igst:      normalizeNumber(getByHeader(rec, ["IGST", "Integrated Tax"])),
      total:     normalizeNumber(getByHeader(rec, ["Total", "Invoice Value", "Total Invoice Value", "Total Amount"])),
      ledger:    String(getByHeader(rec, ["Ledger"]) || "Purchase Account"),
      itcType:   String(getByHeader(rec, ["ITC Type", "ITC"]) || "Input goods"),
    };
  }).filter(b => b.vendor || b.gstin || b.invoiceNo || b.taxable);
}

// ---------- Vendor compliance scorecard ----------

/**
 * Per-vendor reconciliation scorecard (borrowed from how the big GST tools surface
 * "supplier compliance" / ITC-leakage risk). Returns rows sorted worst-risk first.
 * Risk: High = some invoices missing in 2B (supplier likely hasn't filed),
 *       Medium = value mismatches, Low = all matched, "—" = not reconciled yet.
 */
export function vendorCompliance(bills) {
  const groups = new Map();
  (bills || []).forEach(b => {
    const vendor = b.vendor || "Unknown";
    if (!groups.has(vendor)) {
      groups.set(vendor, {
        vendor, gstin: b.gstin || "",
        bills: 0, taxable: 0, gst: 0, total: 0, itcReady: 0, itcRisk: 0,
        matched: 0, missing: 0, mismatch: 0, notChecked: 0,
      });
    }
    const g = groups.get(vendor);
    if (!g.gstin && b.gstin) g.gstin = b.gstin;
    const gst = billGst(b);
    g.bills++;
    g.taxable += Number(b.taxable || 0);
    g.gst += gst;
    g.total += Number(b.total || 0);
    const reco = b.reco || "Not checked";
    if (reco === "Matched") g.matched++;
    else if (reco === "Missing in 2B") g.missing++;
    else if (reco === "Mismatch") g.mismatch++;
    else g.notChecked++;
    if (reco === "Matched" && b.itcType !== "Blocked / review" && b.risk !== "Duplicate") g.itcReady += gst;
    else if (b.reco) g.itcRisk += gst;
  });

  return [...groups.values()].map(g => {
    const checked = g.matched + g.missing + g.mismatch;
    const matchRate = checked ? Math.round((g.matched / checked) * 100) : null;
    let risk = "—";
    if (checked) risk = g.missing > 0 ? "High" : g.mismatch > 0 ? "Medium" : "Low";
    return { ...g, matchRate, risk };
  }).sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2, "—": 3 };
    return (order[a.risk] - order[b.risk]) || (b.total - a.total);
  });
}

// ---------- Rate-wise tax summary (GSTR-1 / 3B prep) ----------

/** Effective GST rate (%) for a bill, or null if taxable is zero/unknown. */
export function gstRate(bill) {
  const taxable = Number(bill && bill.taxable || 0);
  if (taxable <= 0) return null;
  return (billGst(bill) / taxable) * 100;
}

/**
 * Group bills into GST rate slabs (0/3/5/12/18/28%) for filing prep.
 * A computed rate snaps to the nearest standard slab if within ~1%, else shows the actual rate.
 * Bills with no taxable value land in an "N/A" bucket. Sorted ascending by rate.
 */
export function rateWiseSummary(bills, slabs = [0, 0.25, 3, 5, 12, 18, 28]) {
  const snap = (r) => {
    let best = slabs[0], d = Infinity;
    for (const s of slabs) { const dd = Math.abs(s - r); if (dd < d) { d = dd; best = s; } }
    return d <= 1 ? best : Math.round(r * 100) / 100;
  };
  const groups = new Map();
  (bills || []).forEach(b => {
    const r = gstRate(b);
    const key = r === null ? "N/A" : snap(r);
    if (!groups.has(key)) groups.set(key, { rate: key, bills: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, total: 0 });
    const g = groups.get(key);
    g.bills++;
    g.taxable += Number(b.taxable || 0);
    g.cgst += Number(b.cgst || 0);
    g.sgst += Number(b.sgst || 0);
    g.igst += Number(b.igst || 0);
    g.gst += billGst(b);
    g.total += Number(b.total || 0);
  });
  return [...groups.values()].sort((a, b) => {
    const ra = a.rate === "N/A" ? -1 : a.rate;
    const rb = b.rate === "N/A" ? -1 : b.rate;
    return ra - rb;
  });
}

// ---------- Net ITC summary (GSTR-3B style) ----------

/**
 * Break the GST on purchases into the buckets a CA needs for GSTR-3B:
 *  - eligible: matched in 2B, not blocked, not duplicate → claimable now
 *  - blocked: Sec 17(5) / "Blocked / review" ITC type → cannot claim
 *  - atRisk: missing in 2B, mismatch, or duplicate → hold/verify before claiming
 *  - unreconciled: not yet checked against 2B
 *  - netAvailable: ITC you can safely claim now (== eligible)
 */
export function itcSummary(bills) {
  const s = { total: 0, eligible: 0, blocked: 0, atRisk: 0, unreconciled: 0, netAvailable: 0 };
  (bills || []).forEach(b => {
    const gst = billGst(b);
    s.total += gst;
    if (b.itcType === "Blocked / review") { s.blocked += gst; return; }
    if (b.risk === "Duplicate") { s.atRisk += gst; return; }
    const reco = b.reco || "";
    if (reco === "Matched") s.eligible += gst;
    else if (reco === "Missing in 2B" || reco === "Mismatch") s.atRisk += gst;
    else s.unreconciled += gst;
  });
  s.netAvailable = s.eligible;
  return s;
}
