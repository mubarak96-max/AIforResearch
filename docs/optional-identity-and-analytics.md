# Optional institutional identity and analytics

These additions extend the existing Firebase sign-in and analytics projects. They do not change
hosting, Google/password sign-in, provider credentials, project membership or billing defaults.
There are no country, location or email-domain restrictions on using the app.

## Institutional sign-in

Leave `FIREBASE_SSO_PROVIDERS` unset for the existing Google/password choices. To expose an
already-configured Firebase SAML or OIDC provider, set the server environment value to a JSON array:

```json
[{"id":"saml.institution","label":"Institution sign-in"},{"id":"oidc.organization","label":"Organization sign-in"}]
```

Only public Firebase provider IDs and labels belong here. The API validates the `saml.` / `oidc.`
prefixes, drops invalid entries and exposes no other fields. Secrets, certificates, issuer and redirect
configuration remain in Firebase Authentication. The browser only starts a provider offered by this API.
These buttons do not discover providers from the user's email address or grant institution-wide access.
Firebase remains the authority for enabled providers and identity verification.

Firebase requires Authentication with Identity Platform for these protocols. Configure the provider,
authorized app domain and Firebase auth handler in the existing project before exposing its ID.
SAML uses the service-provider-initiated flow. This application still needs an email in the resulting
Firebase ID token; configure the identity provider's email mapping accordingly. See the official
[SAML setup](https://firebase.google.com/docs/auth/web/saml) and
[OpenID Connect setup](https://firebase.google.com/docs/auth/web/openid-connect).

Sign-in uses Firebase's popup, with redirect fallback when blocked. The existing Firebase session
and app profile flow are reused. Account → Sign-in methods can explicitly link an institution to an
existing signed-in Firebase account. An email collision is not silently merged; Firebase's existing
account-linking error sends the user back to their original sign-in method. Disconnecting the last
sign-in method is refused.

This is optional identity integration, not SCIM provisioning, tenant enforcement, institutional seat
billing, domain ownership verification, a compliance certification or an implemented institutional
contract. No provider has been configured or enabled by this code change. Validate popup, redirect,
linking, email claims and logout with a real configured test identity before enabling a provider.

## Privacy and measurements

The existing GTM container `GTM-THRFTJ7T` and Clarity project `zbxvles1es` remain the configured
destinations. Neither loads without a browser choice. Public-page analytics and adult public-page
recordings are separate choices. All visitors receive the same controls; no location is inferred.
Choices expire after 180 days and are available from Account, Help, Privacy and Cookies.

Only an explicit set of public information pages can load these scripts. Authentication, account,
editor, research, tools and unknown routes are excluded. A tracked public page uses a fresh document
navigation when entering an excluded page, removing loaded tag code before private content mounts.
Private editor events use the first-party API rather than GTM. Advertising consent is always denied.

Clarity consent denial can still permit cookieless collection, so revocation/exit also calls `stop`
and discards the loaded page runtime. The supported API references are
[Clarity consent v2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2),
[Clarity's exported stop API](https://github.com/microsoft/clarity/blob/master/packages/clarity-js/src/clarity.ts),
and [Google basic consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic).
The body is masked as an additional recording safeguard; masking is not the private-page boundary.

The editor callback and API both allowlist event names and fields. Current events cover document
creation, review completion, imports and autocomplete. Only fixed source choices, a bounded issue
count or a coarse duration bucket survive. No writing, questions, source names, paths, document IDs,
user IDs or account IDs are copied into event payloads or daily aggregates. Unknown events are dropped.
`product_event_totals` stores daily event/dimension counts; it does not store individual event records.
Ordinary authentication and abuse-prevention logs remain part of running the service.

Tests cover default-denied and expired choices, private route exclusion, malicious/unknown event
fields, server-side sanitization, daily aggregation and consent/auth requirements. Browser smoke tests
should also check public → private navigation and consent revocation with the deployed GTM/Clarity
configuration. The contents of the remote GTM container are not versioned in this repository; keep
that container limited to the disclosed analytics and do not add a second recorder through it.
