# NEXT_STEPS.md — roadmap & backlog

> Prioritized future work. Items marked 🔴 **BIG** are large/difficult — before starting one,
> Claude must warn the user and suggest a more powerful model (currently **Opus 4.8**).
>
> **Last updated:** 2026-06-04

---

## Now / near-term (low risk, high value)

- [ ] **Push to GitHub** (`ayush-syst/gst-bill-assistant`, public) — *in progress.*
- [ ] **Add screenshots/GIF to the README** — capture the loaded-sample dashboard, the bill
      register, and a reconciliation result. Big credibility boost for an OSS launch.
- [ ] **Update the AI model id** — `app.js` hardcodes `claude-sonnet-4-20250514`. Move it to a
      single config constant and update to a current model (e.g. a Claude 4.x Sonnet) so it's
      easy to change in one place.
- [ ] **Version/footer cleanup** — the UI says "v3.0" in a few places; wire it to one constant.
- [ ] **Basic favicon + social preview (og:) meta** for when it's shared/deployed.
- [ ] **Enable GitHub Pages** and do the first deploy when the user is ready.

## Correctness & trust (the make-or-break layer)

- [ ] 🔴 **BIG — Harden GSTR-2B reconciliation.** This is the feature the whole product lives or
      dies on. Needs: invoice-number normalization (case, leading zeros, separators), date
      tolerance, rounding rules (₹1–2 paise diffs), GSTIN-level grouping, and clear match
      confidence. *Warn the user + suggest a model before starting.*
- [ ] 🔴 **BIG — Automated test suite for the core.** Pure-function tests for extraction (regex),
      GSTIN validation, GST math, duplicate detection, and reconciliation matching, with a
      fixture set of real-world-messy invoices and 2B files. No-framework option: a small
      `node:test` runner over extracted pure functions.
- [ ] **GSTIN validation depth** — verify the checksum (last digit), not just structure + state.
- [ ] **Robust CSV parsing** — handle quoted fields, commas-in-values, BOM, and varied 2B column
      headers from different portals/tools.

## Product / growth

- [ ] 🔴 **BIG — Optional cloud sync + team accounts.** So 2+ staff at a firm can share a client.
      This is the #1 thing blocking multi-user firms. Must be opt-in and keep a local-only mode.
      Requires a real backend + auth + a privacy/security model (DPDP Act). *Warn + suggest model.*
- [ ] 🔴 **BIG — Backend AI proxy.** Route Claude calls through a small serverless function so end
      users don't need their own key, usage can be metered/billed, and keys aren't browser-exposed.
      Pairs naturally with Vercel/Cloudflare hosting. *Warn + suggest model.*
- [ ] **GSTR-2A support** + period-over-period ITC carry-forward / provisional-ITC tracking.
- [ ] **More export targets** — Busy, Marg, Vyapar; and a clean generic JSON/CSV schema.
- [ ] **WhatsApp document intake** — a smoother path from forwarded files to the tool (the
      original differentiator idea).
- [ ] **Pricing/landing page** + a real go-to-market for small CA firms.

## Engineering hygiene

- [ ] Split `app.js` into logical ES modules **only if** it stays a no-build static site
      (use native `<script type="module">`). Don't add a bundler casually.
- [ ] Add a simple CSP and Subresource Integrity hashes for the CDN libraries.
- [ ] Accessibility pass (keyboard nav, ARIA, focus states, contrast in dark mode).
- [ ] Consider pinning/self-hosting the CDN libs so the app works fully offline.

## Parking lot (ideas, not committed)

- Bank-statement / expense reconciliation alongside purchase bills.
- e-Invoice (IRN) and e-Way bill cross-checks.
- Multi-language UI (Hindi + regional) for staff.
- A "firm admin" view aggregating all clients' filing readiness.
