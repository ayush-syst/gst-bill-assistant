# GST Bill Assistant — Purchase Review Desk for Indian CA Firms

> AI-assisted GST **purchase-bill extraction**, **GSTR-2B reconciliation**, **ITC review**, and **Tally / Zoho / Excel exports** — built for the day-to-day reality of Indian Chartered Accountant firms. Runs **100% in your browser**. No server, no cloud, no data leaves the machine.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Dependencies: none](https://img.shields.io/badge/runtime%20deps-0-brightgreen.svg)](#tech-stack)
[![Local only](https://img.shields.io/badge/data-local%20only-orange.svg)](#privacy--security)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-success.svg)](CONTRIBUTING.md)

---

> [!IMPORTANT]
> **This tool does not file GST returns and is not a substitute for professional judgement.**
> It is a review and data-prep assistant. Every output must be approved by a qualified reviewer
> before it is used for filing. See the [Disclaimer](#disclaimer).

---

## What it does

CA firms drown in client purchase invoices every month — PDFs, phone photos, WhatsApp forwards, Excel dumps — that all have to become clean Tally/Zoho entries and be reconciled against GSTR-2B before Input Tax Credit (ITC) can be safely claimed. This tool compresses that workflow:

1. **Add invoices** — drop PDFs/images (OCR), upload `.txt`/`.csv`, or paste text.
2. **Extract** — AI extraction (Claude) reads any messy format, *or* offline regex extraction with no API key.
3. **Review** — every bill is validated (GSTIN structure, totals, duplicates), classified for ITC eligibility, and color-coded by status.
4. **Reconcile** — upload your GSTR-2B CSV; the tool matches every bill and flags *missing in 2B*, *value mismatch*, and *blocked ITC*.
5. **Approve & export** — a human reviewer signs off via a checklist + audit log, then exports to Tally CSV/XML, Zoho CSV, Excel, or a WhatsApp/client follow-up message.

## Features

### Extraction & input
- 📄 **PDF text extraction** (PDF.js) and 🖼️ **image OCR** (Tesseract.js) — drag & drop, multi-file
- 📋 Paste raw text or upload `.txt` / `.csv`
- ✦ **AI extraction** via Claude (bring your own Anthropic key) for any invoice layout
- ⚙️ **Offline regex extraction** — works with zero API key, fully local

### GST review engine
- ✅ **GSTIN validation** — 15-char structure + state-code check, with inline feedback
- 🔁 **Duplicate detection** across vendor + invoice number
- 🚦 **Status engine** — Ready / Needs-Review / ITC-Blocked / Check-Total / Duplicate
- 💳 **ITC classification** — Input goods / Input service / Capital goods / Blocked
- 📊 **ITC insights** — ITC-Ready vs ITC-at-Risk amounts, missing-in-books, confidence score
- 🧾 **HSN-wise** and **vendor-wise** summaries (useful for GSTR-1 / GSTR-9)

### GSTR-2B reconciliation
- Upload a 2B CSV → automatic matching of every booked bill
- Flags **Missing in 2B**, **Mismatch**, **Blocked ITC**, **Not checked**
- Downloadable reconciliation report + exception CSV
- Built-in 2B CSV template

### Outputs & exports
- 🧮 **Tally** — CSV *and* native **Tally XML vouchers**
- 📒 **Zoho Books** CSV
- 📊 **Excel (.xlsx)** — hand-rolled, no library
- 📱 **WhatsApp** & client follow-up message generators
- 📦 **CA Review Pack** and **Reviewed/Approved CSV** with exceptions, risk labels, and sign-off details

### Firm workflow & business tools
- 👥 **Multi-client tabs** with duplicate-tab support
- 💾 Saved clients + JSON **work-file** save / load / import / export
- ✍️ **Approval workflow** — reviewer name, 4-point checklist, immutable-style audit log
- 🏢 **Firm dashboard** — clients, hours saved, cost saved, suggested plan
- 💰 **Fee calculator** — what to charge the client and their ROI vs manual entry
- 📈 **Month-on-month trend** tracking
- ✦ **AI exception explainer** — plain-English explanations for junior staff
- 🎯 **Pilot & sales kit** — generate an outreach pitch and pilot pack from live metrics
- 🧪 **Validation lab** — non-filing safety checks with a validation score

### UX polish
Onboarding tour · dark mode · keyboard shortcuts · search & filter · bulk actions · column sort · sticky summary bar · undo stack · 30s auto-save · copy-on-click · toasts · mobile-responsive sidebar.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Markup / styles / logic | **Vanilla HTML + CSS + JS** | Zero build, zero framework, trivially auditable and hostable |
| PDF parsing | **PDF.js** (CDN) | Mature, client-side |
| Image OCR | **Tesseract.js** (CDN) | Runs OCR fully in-browser |
| AI (optional) | **Anthropic Claude API** | Best-in-class extraction; key stays in the user's browser |
| Storage | **`localStorage`** | No server, no accounts — data never leaves the device |
| Dev server | tiny `node:http` script | No dependencies to install |

**Runtime dependencies: none** (the CDN libraries are loaded directly by the browser). The only Node usage is an optional local dev server.

## Quick start

```bash
# 1. Clone
git clone https://github.com/ayush-syst/gst-bill-assistant.git
cd gst-bill-assistant

# 2. Run the local dev server (Node 18+)
npm run dev
# → http://localhost:4173

# 3. (optional) Run the core-logic test suite
npm test
```

> **Note:** the app now uses native ES modules, so it must be served over `http://`
> (via `npm run dev` or any static host) — opening `index.html` straight from the
> filesystem (`file://`) won't load. Once served, regex extraction works fully offline;
> only AI features and the OCR/PDF CDN libraries need internet.

Click **Load Sample Data** on the welcome screen to see the full workflow with demo invoices.

## Project structure

```
gst-bill-assistant/
├── index.html              # Markup + CDN libs (links the css/js below)
├── assets/
│   ├── css/styles.css      # All styles (design tokens, components, dark mode, responsive)
│   └── js/
│       ├── app.js          # Application/UI logic (ES module)
│       └── core.mjs        # Pure domain logic (GST/GSTIN/CSV/status) — the tested core
├── tests/
│   └── core.test.mjs       # node:test suite for core.mjs  (npm test)
├── scripts/
│   └── dev-server.mjs       # Zero-dependency static dev server
├── docs/
│   ├── PROJECT_CONTEXT.md  # Permanent project knowledge (architecture, decisions)
│   ├── CURRENT_TASK.md     # What's being worked on right now
│   └── NEXT_STEPS.md       # Roadmap & backlog
├── .github/workflows/deploy.yml   # GitHub Pages deploy (manual until enabled)
├── package.json            # Scripts only — no runtime deps
├── CONTRIBUTING.md  SECURITY.md  CHANGELOG.md  LICENSE
```

## Deployment

This is a static site — host it anywhere. The repo ships a ready-to-use **GitHub Pages** workflow.

**GitHub Pages (included):**
1. Push to GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Actions → *Deploy to GitHub Pages* → **Run workflow**.
4. Live at `https://ayush-syst.github.io/gst-bill-assistant/`.

**Vercel / Netlify / Cloudflare Pages:** point them at the repo with **no build command** and the **repo root** as the output/publish directory.

## AI features (bring your own key)

AI extraction and the exception explainer call the Anthropic API **directly from your browser** using a key *you* enter (stored only in `localStorage`). It is never sent anywhere except `api.anthropic.com`.

> Browser-direct API calls expose your key to client-side code and can't be metered. For a production/multi-user deployment, route AI through a small backend proxy — see [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md).

## Privacy & security

- **Local-only by design.** All client data lives in your browser's `localStorage`. No server, no telemetry, no account.
- Use **Export JSON** to back up or move a client's work file between machines.
- `localStorage` is **not encrypted** — don't use a shared/public computer for real client data.
- Never commit API keys. `.env*` is git-ignored.
- Report vulnerabilities via [`SECURITY.md`](SECURITY.md).

## Roadmap

See [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md) for the full backlog. Highlights:

- Harden GSTR-2B matching (invoice-number normalization, date tolerance, rounding rules)
- Optional cloud sync + team accounts (so 2+ staff can share a client)
- Backend AI proxy (metered, key-free for end users)
- GSTR-2A support and period-over-period ITC carry-forward
- Automated test suite for the extraction/reconciliation core

## Contributing

PRs and issues welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md). Good first areas: extraction accuracy, reconciliation edge cases, export-format fidelity, and accessibility.

## Disclaimer

This software **does not file GST returns, does not provide tax or legal advice, and must not be treated as the final source of truth.** A qualified reviewer must approve all outputs before filing. Data is stored unencrypted in the browser. The authors accept no liability for filings, ITC claims, or decisions made using this tool. Verify everything against the official GST portal.

## License

[GNU Affero General Public License v3.0 or later](LICENSE) (AGPL-3.0-or-later).

In short: you're free to use, study, modify, and share this software, **including for commercial purposes** — but if you run a modified version as a network service, you must make your modified source available to its users under the same license. © 2026 Ayush Yadav.
