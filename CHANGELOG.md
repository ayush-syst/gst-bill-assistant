# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
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
