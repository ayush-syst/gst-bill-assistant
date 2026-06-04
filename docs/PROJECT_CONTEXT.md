# PROJECT_CONTEXT.md — GST Bill Assistant

> **Purpose of this file:** permanent, self-contained project knowledge. If you are a
> fresh Claude chat (or a new contributor) with *only* this file, you should be able to
> understand the whole project and continue work. Keep it updated at every milestone.
>
> **Last updated:** 2026-06-04

---

## ⚙️ Standing instructions (read first, keep these here permanently)

1. **Heads-up before big/difficult work.** When you (Claude) are about to start something
   large or hard — a major refactor, a backend, reconciliation-engine changes, a framework
   migration — **stop and tell the user first**, and **suggest which model to switch to**
   for that stage. The user will upgrade the model so you have more horsepower, and this
   also signals to them that something significant is starting. (Current best model for
   heavy work: **Claude Opus 4.8**.)

2. **Maintain the three context files automatically.** Whenever a milestone is reached,
   update:
   - `docs/PROJECT_CONTEXT.md` — permanent knowledge (this file)
   - `docs/CURRENT_TASK.md` — what's being worked on right now
   - `docs/NEXT_STEPS.md` — the roadmap / backlog
   Then the user can start a fresh chat and upload just these to continue cheaply
   (a ~10–20k token summary instead of the full history).

3. **Open-source discipline.** Everything lives on GitHub (owner **@ayush-syst**), license
   **AGPL-3.0**. Never commit API keys. Keep the app **local-first** (no server, no
   telemetry). Never claim the tool *files* GST returns.

---

## 1. What this project is

**GST Bill Assistant — Purchase Review Desk for Indian CA Firms.**

An AI-assisted tool that helps Chartered Accountant firms turn messy client **purchase
invoices** (PDFs, images, WhatsApp forwards, Excel) into clean, voucher-ready accounting
entries, and **reconcile them against GSTR-2B** before claiming Input Tax Credit (ITC).
It runs **entirely in the browser** — no server, no cloud, data never leaves the device.

**Original MVP idea:** upload invoices → extract vendor/GSTIN/invoice/date/taxable/CGST-SGST-IGST/HSN/total
→ validate → export voucher-ready data for Tally/Zoho/CSV → later add GSTR-2B reconciliation.
The actual build went **well beyond** that MVP (see feature inventory below).

**Who's building it:** Ayush Yadav (GitHub **@ayush-syst**), solo. Wants to deploy, host, and
eventually launch this as a real (commercial-capable) open-source product.

## 2. Current state (as of 2026-06-04)

- ✅ The original **single 5,300-line HTML file** was converted into a **proper static-site
  project** (see structure below). The CSS and JS were moved **byte-for-byte** into separate
  files — **behavior is identical** (verified: app renders correctly, "Load Sample Data" +
  regex parse extracted 4 bills with correct totals, no console errors).
- ✅ Full open-source scaffolding added (README, LICENSE, CONTRIBUTING, SECURITY, CHANGELOG,
  .gitignore, dev server, GitHub Pages workflow).
- ✅ These three handoff docs created.
- ✅ **Published to GitHub:** https://github.com/ayush-syst/gst-bill-assistant (public, AGPL-3.0),
  `main` branch, first commit `801b813`. All 16 files confirmed on the remote.
- ⏳ **Next:** iterate on the roadmap (`NEXT_STEPS.md`). Deployment is intentionally deferred
  ("deploy later") — the GitHub Pages workflow is ready and set to manual trigger.

> The original prototype file still exists at `C:\Users\Ayush\OneDrive\Documents\gst-bill-assistant.html`
> (untouched — kept as a reference/backup).

## 3. Architecture

**Stack:** plain **HTML + CSS + vanilla JS**. No framework, no bundler, no build step.
Chosen deliberately so the heavily-debugged prototype code moves over unchanged, stays
auditable, and hosts anywhere.

```
gst-bill-assistant/
├── index.html              # Page markup + CDN <script> tags; links the css/js below
├── assets/
│   ├── css/styles.css      # ALL styles: :root design tokens, components, dark mode, responsive
│   └── js/
│       ├── app.js          # UI/app logic (ES module): extraction, reco, exports, state, render
│       └── core.mjs        # Pure domain logic (GST/GSTIN/CSV/status) — imported by app + tests
├── tests/core.test.mjs     # node:test suite for core.mjs (npm test) — 14 tests
├── scripts/dev-server.mjs  # Zero-dependency static server (node:http)
├── docs/                   # PROJECT_CONTEXT / CURRENT_TASK / NEXT_STEPS
├── .github/workflows/deploy.yml   # GitHub Pages (manual trigger until Pages is enabled)
├── package.json            # scripts only — NO runtime dependencies
└── README · LICENSE · CONTRIBUTING · SECURITY · CHANGELOG · .gitignore
```

**External libraries (loaded via CDN in `index.html`, not bundled):**
- **PDF.js** (`pdf.js/3.11.174`) — PDF text extraction
- **Tesseract.js** (`tesseract.js@5`) — in-browser image OCR
- **Google Fonts: Inter** — typography

**AI integration:** `app.js` calls the **Anthropic API directly from the browser**
(`https://api.anthropic.com/v1/messages`, header `anthropic-dangerous-direct-browser-access: true`).
Model currently hardcoded: `claude-sonnet-4-20250514`. The user pastes their **own** Anthropic
key, stored in `localStorage` only. Two AI features: **AI Extract** (invoice → JSON bills) and
**AI Exception Explainer**. Regex extraction is the offline fallback (no key needed).

**State & storage:** all in-memory JS state (`bills`, `clientTabs`, `gstr2bRows`,
`auditEvents`, etc.) persisted to **`localStorage`**. Auto-save runs every 30s. Multi-client
"tabs" each hold their own bills/workspace. Work files can be exported/imported as JSON.

**Key `localStorage` keys:** `gstDarkMode`, `gstOnboardDone`, auto-save session, saved
clients, trend data, settings (firm name/GSTIN, API key, default ledger/ITC type).

## 4. Feature inventory (everything the app does)

**Input/extraction:** PDF upload (PDF.js), image OCR (Tesseract.js), .txt/.csv upload, paste
text, AI extract (Claude), offline regex extract.
**Review engine:** GSTIN structure + state-code validation, duplicate detection, status engine
(Ready / Review / ITC-blocked / Check-total / Duplicate), ITC classification (Input goods /
service / Capital / Blocked), editable bill register, confidence score per row.
**Insights:** extraction summary, ITC-ready vs ITC-at-risk, missing-in-books, priority actions,
HSN-wise summary, vendor-wise summary, firm dashboard (clients/hours-saved/cost-saved/plan).
**Reconciliation:** GSTR-2B CSV upload + auto-match, flags Missing-in-2B / Mismatch / Blocked /
Not-checked, reco report download, exception CSV, 2B CSV template.
**Exports:** Tally CSV, Tally XML vouchers, Zoho CSV, Excel (.xlsx, hand-rolled), CA Review Pack,
Reviewed/Approved CSV, WhatsApp message, client follow-up message.
**Firm workflow:** multi-client tabs (+ duplicate tab), saved clients, JSON work-file
save/load/import/export, approval workflow (reviewer + 4-point checklist + audit log),
validation lab (safety checks + score), fee/ROI calculator, month-on-month trend,
AI exception explainer, pilot & sales kit.
**UX:** onboarding modal, dark mode, keyboard shortcuts, search/filter, bulk actions, column
sort, sticky summary bar, undo stack, auto-save indicator, copy-on-click, toasts, settings
modal, mobile hamburger sidebar, print report.

## 5. Important decisions (and why)

| Decision | Rationale |
|---|---|
| **Split into static HTML/CSS/JS, not a framework** | The prototype was heavily debugged; a rewrite risks breaking it. The user explicitly wanted the site to stay the same. Plain static = zero-risk move + hosts anywhere. |
| **AGPL-3.0 license** | Commercial product in a crowded space; AGPL stops competitors from running modified copies as SaaS without sharing changes. User still retains full commercial rights as the copyright holder. |
| **Byte-for-byte split, verified in a browser** | Guarantees no behavior change; verified via preview server + screenshot + a functional extraction test. |
| **Keep AI calls browser-direct for now** | Matches the prototype, keeps it local-first, no backend needed yet. Backend proxy is a roadmap item for the launch phase. |
| **Zero-dependency dev server** | No `npm install` needed; nothing to break; the project stays pure static. |
| **Deploy later** | User chose to defer hosting; the Pages workflow is ready to flip on when wanted. |
| **GitHub Pages as default host** | Free, simplest for static; can move to Vercel/Netlify/Cloudflare anytime (no build = trivial). |

## 6. Constraints

- **Must stay local-first** — no server-side storage of client data without an explicit,
  designed-in privacy model.
- **Must not claim to file GST returns** — human approval is mandatory; this is the legal/trust
  posture and a selling point.
- **No secrets in the repo** — API keys live only in the user's browser.
- **Windows dev environment** (PowerShell). Project path: `C:\Users\Ayush\OneDrive\Desktop\GST App`.
  Note: it's inside OneDrive, which syncs — generally fine, but be aware of sync locks.
- **Keep the prototype's look & feel** — the user likes the current layout.

## 7. Product assessment (honest rating)

**8.5/10 as an MVP; ~6/10 as a launch-ready commercial product** — the gap is architectural,
not features.
- **Market is real:** purchase-bill entry + 2A/2B reconciliation is genuine, repetitive CA
  pain. Competitors (ClearTax, GSTHero, IRIS, Cygnet, TallyPrime add-ons) validate demand but
  make it crowded.
- **Viable wedge:** small/mid CA firms doing ~20–300 bills/month who live in Excel + manual
  Tally entry today. Win on speed, price, AI-assist, WhatsApp-friendliness — not head-on vs
  ClearTax.
- **What blocks "launch":** (1) localStorage-only → no team sharing/cloud backup; (2) AI key in
  browser → can't meter/bill end users; (3) **GSTR-2B matching accuracy is make-or-break** —
  must be bulletproof; (4) DPDP-Act/data-security posture before firms trust it.
- **Can it succeed? Realistically yes**, IF the reconciliation is rock-solid and go-to-market is
  a focused niche.

## 8. GitHub

- Owner: **@ayush-syst** (GitHub user id 269085001). GitHub is connected to Claude via MCP.
- Planned repo: **`ayush-syst/gst-bill-assistant`**, public, AGPL-3.0.
- Default branch: `main`.

## 9. How to continue from here (handoff)

If you're a fresh chat: read this file + `CURRENT_TASK.md` + `NEXT_STEPS.md`. The live code is
in `index.html`, `assets/css/styles.css`, `assets/js/app.js`, `assets/js/core.mjs`. Run
`npm run dev` to see it (ES modules require an http server — `file://` won't load). Run
`npm test` for the core-logic suite. The original prototype is preserved at
`C:\Users\Ayush\OneDrive\Documents\gst-bill-assistant.html`. Pick the top item from
`NEXT_STEPS.md`, and **remember standing instruction #1** (warn + suggest a model before big work).
