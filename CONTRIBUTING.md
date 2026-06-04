# Contributing to GST Bill Assistant

Thanks for your interest! This project helps Indian CA firms review GST purchase bills and reconcile against GSTR-2B. Contributions of all sizes are welcome.

## Ground rules

- **No build step.** This is intentionally a plain HTML/CSS/JS static site. Please don't introduce a framework or bundler without discussing it in an issue first.
- **Keep it local-first.** The app must keep working 100% client-side with no server. Don't add code that silently sends client data anywhere.
- **Never commit secrets.** API keys belong in the user's browser only. `.env*` is git-ignored.
- **Preserve the trust posture.** The app must never claim to *file* GST returns or replace professional judgement. Human approval stays mandatory.

## Project layout

| Path | What lives here |
|---|---|
| `index.html` | Page markup + CDN library tags |
| `assets/css/styles.css` | All styling |
| `assets/js/app.js` | All application logic |
| `scripts/dev-server.mjs` | Local dev server (zero deps) |
| `docs/` | Project context, current task, roadmap |

## Running locally

```bash
npm run dev      # http://localhost:4173
```

Or just open `index.html` in a browser.

## Making a change

1. **Open an issue** describing the bug/feature (especially for extraction or reconciliation logic — these are correctness-critical).
2. Create a branch: `git checkout -b fix/short-description`.
3. Make the change. Match the existing code style (vanilla JS, the existing helper patterns, the CSS design tokens in `:root`).
4. **Test manually** across the relevant flow: add invoices → extract → reconcile → export. Use *Load Sample Data* and the 2B template.
5. Check the browser console for errors and confirm dark mode + mobile layout still look right.
6. Commit with a clear message and open a PR explaining *what* and *why*.

## Good first contributions

- Extraction accuracy: more invoice layouts, better regex fallbacks, GSTIN edge cases.
- Reconciliation edge cases: invoice-number normalization, date tolerance, rounding.
- Export fidelity: Tally XML / Zoho CSV corrections, more accounting-software targets.
- Accessibility: keyboard nav, ARIA labels, contrast.
- A small automated test suite for the extraction/reconciliation core (see `docs/NEXT_STEPS.md`).

## Code review

The maintainer (@ayush-syst) reviews PRs. Keep PRs focused — one concern per PR is much easier to review and merge.

## License

By contributing, you agree your contributions are licensed under the project's **AGPL-3.0-or-later** license.
