# CURRENT_TASK.md — what's being worked on right now

> Short, living file. Update it when the active task changes. For permanent knowledge use
> `PROJECT_CONTEXT.md`; for the backlog use `NEXT_STEPS.md`.
>
> **Reminder (standing instruction):** before starting anything big/difficult, Claude should
> warn the user and suggest a more powerful model (currently **Opus 4.8**).
>
> **Last updated:** 2026-06-04

---

## ✅ Just completed: Restructure → proper project → published to GitHub

- [x] Read & understood the full 5,300-line prototype and all ~40 features
- [x] Split it **byte-for-byte** into `index.html` + `assets/css/styles.css` + `assets/js/app.js`
- [x] Verified identical behavior in a browser (render + sample-data extraction, no console errors)
- [x] Added README, AGPL-3.0 LICENSE, CONTRIBUTING, SECURITY, CHANGELOG, .gitignore/.gitattributes
- [x] Added zero-dependency dev server (`npm run dev`) + GitHub Pages deploy workflow
- [x] Wrote the three handoff docs (PROJECT_CONTEXT / CURRENT_TASK / NEXT_STEPS)
- [x] `git init` + first commit (`801b813`)
- [x] **Published to GitHub:** https://github.com/ayush-syst/gst-bill-assistant (public, AGPL-3.0)
      — all 16 files confirmed on `origin/main`

## 🛠️ In progress: "Make it 10/10" (user wants ALL of: reconciliation accuracy, polish/UX,
   code quality, new features — then deploy). Working in committed waves.

**Wave 1 — Correctness core ✅ DONE (v3.1.0):**
- [x] GSTIN **checksum** validation (official mod-36 check digit) + clearer inline hint
- [x] Fixed sample data to use checksum-valid GSTINs (so the demo passes real validation)
- [x] Reconciliation **mismatch notes now show book-vs-2B amounts**
- [x] Centralized CONFIG (`APP_VERSION`, `AI_MODEL`, `AMOUNT_TOLERANCE`); version wired to UI
- [x] Bumped AI model id → `claude-sonnet-4-6`
- [x] Verified in-browser (sample→reconcile, checksum valid/typo, no console errors)

**Wave 2 — Reconciliation depth ✅ DONE:**
- [x] Leading-zero-tolerant invoice matching (exact first, then loose fallback, flagged in note)
- [x] Unmatched-2B tracking by row identity (not key string)
- [x] Verified in-browser: `PP/891` book ↔ `PP/0891` 2B matches via fallback; no console errors

**Wave 3 — Code quality + tests ✅ DONE:**
- [x] Extracted pure domain logic into `assets/js/core.mjs` (single source of truth)
- [x] `app.js` converted to an ES module that imports from core.mjs (only `closeSettings`
      needed exposing on `window`; no generated inline handlers)
- [x] `tests/core.test.mjs` — 14 `node:test` tests, all passing (`npm test`)
- [x] Verified in-browser: full flow, settings modal via `window.closeSettings`, no console errors

**Next waves (planned):**
- Wave 4 — Polish/UX: empty states, error handling, accessibility, mobile.
- Wave 5 — New features (highest-value first; will propose before building).

(Deferred by user: enabling GitHub Pages + first deploy — only once it's 10/10.)

## Notes / context for the next session

- Deployment was intentionally deferred ("deploy later") — the Pages workflow is ready but
  set to **manual trigger** so it won't fail before Pages is enabled.
- The original prototype is preserved at `C:\Users\Ayush\OneDrive\Documents\gst-bill-assistant.html`.
- Item #4 above is a "big/difficult" item → **warn the user + suggest a model first** (standing
  instruction #1).
