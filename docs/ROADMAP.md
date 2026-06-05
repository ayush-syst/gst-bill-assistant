# Product Roadmap — toward an end-to-end CA automation platform

> **Vision:** automate the *automatable* grunt work of an Indian CA firm — extraction,
> reconciliation, classification, report prep, reminders, exports — while a qualified CA
> always keeps the **judgment and final sign-off**. Not "replace the CA"; "give the CA back
> their hours."
>
> **Guiding principle:** *Automate the grunt, the CA approves.* The tool never files returns,
> never gives tax/legal advice, and never claims legal completeness. A human reviewer signs off.
>
> **Last updated:** 2026-06-04

---

## Why phased (not all-at-once)

1. **Depth beats breadth early.** One workflow done excellently and used by real firms is worth
   more than ten half-built ones. We win the GST purchase + GSTR-2B workflow first.
2. **Validate before we invest.** Real-world GST-2B files + a practising CA's review will tell us
   which rules to harden and which modules firms actually want. Build the *right* things.
3. **True end-to-end needs a backend.** Accounts, multi-user/team sync, document storage, and
   integrations (Tally connector, GST-portal via a GSP, e-invoice/IRN) require a server. That's a
   deliberate later phase — only once a paying firm needs it.

## What is automatable vs not

| Automatable (build these) | Keep human (never automate) |
|---|---|
| Invoice extraction (PDF/OCR/AI) | Final filing sign-off |
| GSTR-2A/2B reconciliation & ITC bucketing | Tax/legal advisory & judgment calls |
| Classification (ledger, ITC type) — *as suggestions* | Sec 17(5) / eligibility final call |
| Return-data prep (GSTR-1/3B/9 worksheets) | Anything the GST law leaves to professional discretion |
| Tally/Zoho/Excel export, voucher data | |
| Compliance due-date reminders, MIS reports | |
| Client document collection (WhatsApp) | |

---

## Phases

### ✅ Phase 0 — Foundation (DONE)
Single-file prototype → proper open-source project (tested `core.mjs`, landing page, CI-ready,
local-only, no backend). See `PROJECT_CONTEXT.md`.

### 🟦 Phase 1 — Win the GST purchase + 2B workflow (NOW)
Make the existing module genuinely excellent and trustworthy.
- [ ] **Validate with 1–3 real CAs on real GSTR-2B + invoice files** ← highest priority; also the
      compliance check (a CA tells us which rules to harden).
- [ ] Harden reconciliation: many-to-many / 1-to-many matching; GSTR-2A support.
- [ ] India-rules hardening *guided by the CA*: Cess column, RCM (reverse charge) flag, fuller
      Sec 17(5) categories, Sec 16 ITC conditions / time limits, intra- vs inter-state logic.
- [ ] Robustness on messy real data (varied 2B headers, OCR noise, rounding).
- [ ] Screenshots/demo; a simple "pilot kit" to get it in front of firms.

### 🟩 Phase 2 — Adjacent GST modules (after Phase 1 validation)
Add the next-most-valuable automatable pieces, one at a time.
- [ ] **Sales-side GSTR-1 prep** (mirror of purchase: extract sales invoices → GSTR-1 worksheet).
- [ ] **GSTR-3B worksheet** from the 2B + 3B-ITC summary we already compute.
- [ ] **Compliance due-date calendar** (GST/return reminders) — light, no backend needed.
- [ ] **GSTR-9 / annual** summary from monthly data + the trend feature.

### 🟨 Phase 3 — Platform & backend (only when a paying firm needs it)
The "complete end-to-end" leap. Requires real infrastructure.
- [ ] Backend: accounts, auth, team multi-user, cloud sync (opt-in; keep a local-only mode).
- [ ] Backend AI proxy (metered, no user-supplied key).
- [ ] Integrations: **Tally connector**, **GST portal via a GSP**, e-invoice/IRN, e-way bill.
- [ ] Security/compliance posture: DPDP Act, encryption, audit trails.
- [ ] Billing / subscriptions.

### 🟧 Phase 4 — Broaden beyond GST (later)
Other automatable CA work, each as its own validated module.
- [ ] **TDS** computation & returns (24Q/26Q).
- [ ] **Bank-statement reconciliation** & voucher entry.
- [ ] Simple **ITR** prep, MIS dashboards, client-document intake (WhatsApp-native).

---

## How we decide what's next
Default to the **top unchecked item in the current phase**. Don't start a later phase until the
current one is validated by real usage. New feature ideas go to `NEXT_STEPS.md`; this file holds
the *sequence and rationale*.

> **Standing instruction reminder:** before starting anything big/difficult (e.g. the Phase 3
> backend), warn the user and suggest a more powerful model (currently Opus 4.8).
