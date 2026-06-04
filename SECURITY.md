# Security Policy

## Reporting a vulnerability

If you find a security or privacy issue, **please do not open a public issue.**
Instead, use GitHub's private vulnerability reporting:

- Go to the repo → **Security** tab → **Report a vulnerability**, or
- Contact the maintainer **@ayush-syst** directly.

Please include steps to reproduce, the impact, and any suggested fix. You'll get an acknowledgement as soon as possible.

## Scope & threat model

This is a **100% client-side application**. There is no backend, no database, and no telemetry. That shapes what "security" means here:

- **Client data** (invoices, GSTINs, reconciliation) is stored **unencrypted in the browser's `localStorage`**. It never leaves the device except:
  - when the user explicitly exports a file, or
  - when the user enables AI features, which send the pasted invoice text to `api.anthropic.com` using the user's own key.
- **API keys** are stored in `localStorage` only and sent only to Anthropic. They are never transmitted to any project-owned server (there isn't one).

### Things we care about
- Any code path that exfiltrates client data or API keys to a third party.
- XSS via untrusted invoice text rendered into the DOM.
- Dependency (CDN) integrity issues.

### Out of scope (known & documented)
- `localStorage` being unencrypted — this is by design and disclosed in the README. Don't use a shared/public computer for real client data.
- The user choosing to use browser-direct AI calls (documented trade-off; a backend proxy is on the roadmap).

## For deployments

If you host a modified version: serve over **HTTPS**, keep the CDN library versions current, and consider adding a Content-Security-Policy. Per the **AGPL-3.0**, network deployments of modified versions must offer their source to users.
