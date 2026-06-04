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

## 🔜 Active / immediate next steps (pick one)

Nothing is mid-flight. Good next candidates from `NEXT_STEPS.md`:
1. **Add README screenshots/GIF** (quick, high credibility) — capture the dashboard + bill
   register + a reconciliation result.
2. **Update the AI model id** — `app.js` hardcodes `claude-sonnet-4-20250514`; centralize it
   into one config constant and bump to a current Claude model.
3. (Deferred by user) **Enable GitHub Pages** + first deploy when ready.
4. 🔴 **BIG** — Begin **hardening GSTR-2B reconciliation** (the make-or-break feature).

## Notes / context for the next session

- Deployment was intentionally deferred ("deploy later") — the Pages workflow is ready but
  set to **manual trigger** so it won't fail before Pages is enabled.
- The original prototype is preserved at `C:\Users\Ayush\OneDrive\Documents\gst-bill-assistant.html`.
- Item #4 above is a "big/difficult" item → **warn the user + suggest a model first** (standing
  instruction #1).
