# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
