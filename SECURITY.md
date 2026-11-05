# Security

Please report vulnerabilities privately to the maintainers (see the repository's security contact), not in a public issue. Include what you found, how to reproduce it and what an attacker could do with it.

When testing, please don't access other people's data, run load tests or use social engineering.

## Running your own copy safely

- Keep `SETTINGS_KEY`, `INTERNAL_SECRET` and your other secrets in Secret Manager, never in the repository. `SETTINGS_KEY` encrypts the provider keys admins save in the browser.
- Browsers never write Firestore or Storage directly: `firestore.rules` and `storage.rules` deny client writes, and the API checks every request. Keep it that way.
- People become admins only from `ADMIN_EMAILS` after confirming their email.
- Live Stripe keys work only with `BILLING_LIVE=1` in the server's environment, so payments can't be switched on from the browser.
- Keep the converter (`services/convert`) on internal ingress only.
