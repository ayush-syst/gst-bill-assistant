# CURRENT_TASK.md — what's being worked on right now

> Short, living file. Update it when the active task changes. For permanent knowledge use
> `PROJECT_CONTEXT.md`; for the backlog use `NEXT_STEPS.md`.
>
> **Reminder (standing instruction):** before starting anything big/difficult, Claude should
> warn the user and suggest a more powerful model (currently **Opus 4.8**).
>
> **Last updated:** 2026-06-04

---

## ✅ Just completed: Restructure the single HTML file into a proper project

- [x] Read & understood the full 5,300-line prototype and all ~40 features
- [x] Split it **byte-for-byte** into `index.html` + `assets/css/styles.css` + `assets/js/app.js`
- [x] Verified identical behavior in a browser (render + sample-data extraction, no console errors)
- [x] Added README, AGPL-3.0 LICENSE, CONTRIBUTING, SECURITY, CHANGELOG, .gitignore
- [x] Added zero-dependency dev server (`npm run dev`) + GitHub Pages deploy workflow
- [x] Wrote the three handoff docs (PROJECT_CONTEXT / CURRENT_TASK / NEXT_STEPS)

## 🔜 Active / immediate next steps

1. **Initialize git locally** (`git init`, first commit) in `C:\Users\Ayush\OneDrive\Desktop\GST App`.
2. **Create the GitHub repo** `ayush-syst/gst-bill-assistant` (public, AGPL-3.0) and push.
3. **Confirm** the repo looks right (README renders, files present).
4. (Deferred by user) Enable GitHub Pages when ready to deploy.

## Notes / context for the next session

- Deployment was intentionally deferred ("deploy later") — the Pages workflow is ready but
  set to **manual trigger** so it won't fail before Pages is enabled.
- The original prototype is preserved at `C:\Users\Ayush\OneDrive\Documents\gst-bill-assistant.html`.
- After the push, the natural next work item is **hardening GSTR-2B reconciliation** — see
  `NEXT_STEPS.md`. That's a "big/difficult" item → warn the user + suggest a model first.
