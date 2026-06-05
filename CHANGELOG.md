# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added (competitor-inspired — v3.5)
- **GSTR-3B net-ITC summary.** A dedicated card breaks the GST on purchases into Eligible &
  matched (claim now) / At-risk (hold) / Not-yet-reconciled / Blocked Sec 17(5), and highlights
  the **Net ITC you can claim now** — the CA's "how much ITC this month?" answer. Tested
  `itcSummary()` (23 tests).

### Added (competitor-inspired — v3.4)
- **Vendor compliance scorecard.** The Vendor Summary tab is now a supplier-compliance view with
  per-vendor **match rate** and a **risk badge** (High = invoices missing in 2B → supplier likely
  hasn't filed; Medium = value mismatches; Low = all matched), sorted worst-risk first — the kind
  of ITC-leakage insight ClearTax/GSTHero/IRIS charge for. Tested pure `vendorCompliance()`.
- **Configurable 2B match tolerance.** Set the rupee rounding tolerance for reconciliation in
  Settings (default ₹2) — mirrors the "customizable matching rules" of paid tools.
- **Rate-wise tax summary.** The "HSN & Rate" tab now also groups bills by GST slab
  (0/3/5/12/18/28%, snapping computed rates to the nearest slab) for GSTR-1 / 3B prep. Tested
  pure `gstRate()` / `rateWiseSummary()`. Tabs relabeled (HSN & Rate, Vendor Compliance).

### Added (polish — v3.3, "four nice things")
- **Full backup & restore.** Download *all* clients to one JSON file and restore them — plus a
  "Saved HH:MM:SS" timestamp and an in-app note explaining data is auto-saved in the browser.
- **Visual reconciliation bar.** A stacked bar (Matched / Mismatch / Missing in 2B / Not checked)
  in the insights card; click a segment or legend item to filter the register.
- **Clickable metric cards.** Click "Need Review" to jump-filter the bill register to those rows
  (and "Bills Extracted" to clear filters).
- **Compact density toggle.** A denser table view for large registers, remembered per browser.

### Changed (offline / assets)
- **PDF.js is now self-hosted** (`assets/vendor/pdfjs/`) instead of loaded from a CDN, so PDF
  text extraction works fully offline. Verified by extracting text via the local worker.
  (Image OCR via Tesseract stays on CDN — full self-hosting is heavy/fragile; see NEXT_STEPS.)
- Added a **favicon** and **theme-color**; landing page now has Open Graph / Twitter-card meta.

### Added (landing page)
- **Marketing landing page** is now the homepage (`index.html`): hero, feature grid, "how it
  works", and CTAs into the tool. The app moved to **`app.html`** (same code, just renamed).
  Self-contained, responsive, no backend — keeps the no-signup / local-only positioning.

### Added (new features — v3.2)
- **Return-period date check.** Bills whose invoice date falls outside the selected GST return
  period are flagged as a "Wrong period" exception in the Action Center (unparseable dates are
  never flagged, to avoid false positives). New tested helpers `parseInvoiceMonth` /
  `invoicePeriodMismatch`.
- **Invalid GSTIN flagged in the register.** Vendor GSTINs that fail format/checksum now show a
  red border + tooltip directly in the bill table (updates live while editing), not just lumped
  into "Review".
- **Import bills from CSV.** Load an existing bill register (Excel/CSV) via header-aliased columns,
  with a downloadable template — for firms already keeping books in a spreadsheet.
- **Add 2B-only invoices to books.** One click pulls "in GSTR-2B but missing from books" rows into
  the register (pre-filled from 2B, flagged for review) so missed ITC isn't lost.

### Added (accessibility)
- **Accessibility pass.** Visible keyboard `:focus-visible` ring on all interactive elements;
  `prefers-reduced-motion` support; `role="dialog"`/`aria-modal` on the onboarding, shortcuts,
  and settings modals; `aria-live` announcements for the toast and status line; an `aria-label`
  on the add-client-tab button; and an `.sr-only` helper. (Escape already closed all modals.)
- **Test suite for the core logic.** Pure domain logic (number/invoice normalization, GSTIN
  checksum, bill status, CSV parsing, header aliasing, **GSTR-2B reconciliation**, and **CSV bill
  import**) extracted into `assets/js/core.mjs` and covered by `tests/core.test.mjs` (**20 tests**,
  `node:test`, run with `npm test`) — including integration tests for the reconcile and import
  flows. `app.js` is an ES module that imports from this single source of truth, so the browser
  app and the tests share the exact same code.
- **Leading-zero-tolerant 2B matching.** Reconciliation now falls back to a "loose" invoice-number
  match (ignoring leading zeros, e.g. books `PP/891` ↔ 2B `PP/0891`) only when an exact match
  fails, and flags it transparently in the reco note so the reviewer can verify. Unmatched 2B rows
  are now tracked by row identity rather than key string (more robust).
- **GSTIN checksum validation.** GSTINs are now verified against the official mod-36 check-digit
  algorithm, not just structure — catching typos and OCR errors. The inline hint distinguishes
  "Valid — <state>" from "Checksum failed — likely a typo". Sample data updated to use
  checksum-valid GSTINs.

### Changed (correctness pass — v3.1)
- Reconciliation **mismatch notes now show the actual amounts** (e.g. "TAXABLE: books Rs.12,500
  vs 2B Rs.12,000") instead of just listing which fields differ.
- Centralized tunables into a single CONFIG block: `APP_VERSION`, `AI_MODEL`, `AMOUNT_TOLERANCE`.
- The UI version label is now driven from `APP_VERSION` (one source of truth) → shows **v3.1.0**.
- Updated the AI model id from the dated `claude-sonnet-4-20250514` to the current
  `claude-sonnet-4-6`, referenced via the `AI_MODEL` constant.

### Changed
- **Project restructure:** the single-file prototype (`gst-bill-assistant.html`, ~5,300 lines)
  was split into a proper static-site project — `index.html` (markup) +
  `assets/css/styles.css` + `assets/js/app.js` — with **no change to behavior**
  (the app was verified rendering and extracting identically after the split).
- Added open-source scaffolding: README, AGPL-3.0 license, contributing guide,
  security policy, changelog, `.gitignore`, zero-dependency dev server, and a
  GitHub Pages deploy workflow.
- Added project-handoff docs (`docs/PROJECT_CONTEXT.md`, `docs/CURRENT_TASK.md`,
  `docs/NEXT_STEPS.md`) for continuity across work sessions.

## [3.0.0] — prototype

The original single-file build. Feature-complete prototype including:
PDF/image OCR extraction, AI + regex extraction, GSTIN validation, duplicate
detection, GSTR-2B reconciliation, ITC insights, HSN/vendor summaries,
Tally CSV/XML + Zoho + Excel exports, multi-client tabs, approval workflow,
audit log, validation lab, fee calculator, month-on-month trend, AI exception
explainer, pilot/sales kit, dark mode, keyboard shortcuts, bulk actions,
auto-save, and onboarding.

[Unreleased]: https://github.com/ayush-syst/gst-bill-assistant/commits/main
