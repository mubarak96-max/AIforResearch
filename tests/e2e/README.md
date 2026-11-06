# Browser tests

Playwright scripts that drive a running WriteOrbit like a person would: sign up, write, cite, export, pay with Stripe's test cards, and so on. Each prints `PASS` / `FAIL` lines and a total, and most save screenshots to `/shots`.

Run them against `pnpm dev:all` (the Firebase emulators plus the web app on :3000), or against a deployed site with `BASE=https://…`:

```bash
npm i -g playwright@1.56.1 && npx playwright install chromium
BASE=http://localhost:3000 node tests/e2e/editor-smoke.cjs
```

> These scripts were written for the self-hosted version. Scripts that set up state with
> `DATABASE_URL` (billing, credits) and the passkey script need porting to the Firestore
> emulator (`FIRESTORE_EMULATOR_HOST`) before they work here.

Some scripts need more:

- `DATABASE_URL` for scripts that set up state directly (billing, credits).
- `E2E_EMAIL` with an existing account when sign-ups are rate limited.
- A Stripe **test** key saved in Admin › Billing for `billing-*.cjs` and `cloud-credits.cjs`.
- AI and papers keys for the AI scripts (`editor-ai-flows.cjs`, `editor-review-checks.cjs`).

Good first runs: `editor-smoke.cjs` (create, type, live sync, reload) and `selfhost-smoke.cjs` (a fresh install with no keys).
