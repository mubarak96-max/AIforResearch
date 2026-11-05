# Data model (Firestore + Cloud Storage)

Every Postgres table became a collection. **Field names are the old column names (snake_case)**,
so code reads a document exactly like it read a row. `packages/server/src/firebase.ts` has the
helpers: `row()` / `rows()` return `{ id, ...fields }` with Firestore Timestamps turned back
into `Date`s; writing a `Date` stores a Timestamp. Ids are the old ids (uuid strings), new ones
come from `newId()` (a random UUID), except where noted.

Browsers never write Firestore directly: every write goes through the API with the Admin SDK,
which checks access, plan limits and credits. `firestore.rules` allows a few read-only
listeners (your own profile, documents you are a member of) and denies everything else.

## People and accounts

| Path | Was | Notes |
| --- | --- | --- |
| `users/{uid}` | `users` | `uid` is the **Firebase Auth uid**. `account_id, email (lower case), full_name, is_admin, email_verified_at, disabled_at, created_at, last_seen_at, newsletter_opt_out, newsletter_dirty, newsletter_synced, newsletter_synced_at, newsletter_error`. No password: Firebase Auth has it. |
| `legacy_passwords/{email}` | `users.password_hash` | Server-only. Argon2 hashes Firebase cannot import (tools/migrate). The first successful sign-in moves the password into Firebase Auth and deletes the entry. |
| `accounts/{id}` | `accounts` | Billing entity. `name, plan, stripe_customer_id, billing_status, billing_event_at, plan_subscription_id, plan_status, plan_interval, plan_period_end, plan_cancel_at_period_end, plan_source, plan_event_at, credits_milli, starter_granted_at, topup_*, low_balance_noticed_at, created_at`. |
| `accounts/{id}/plan_usage/{key}__{period}` | `plan_usage` | `key, period, amount`. Incremented with `FieldValue.increment` in a transaction. |
| `accounts/{id}/credit_ledger/{id}` | `credit_ledger` | When `reference` is set the doc id is `ref_<sha256(reference)[0:40]>`, so a Stripe session is granted once (`create()` fails on a repeat). |
| `accounts/{id}/credit_daily_free/{YYYY-MM-DD}` | `credit_daily_free` | `used_milli`. |
| — | `user_identities`, `user_passkeys` | Gone: Firebase Auth links Google, Microsoft and Apple to one user per email. Passkeys are not offered (Firebase has none). |

## Documents

| Path | Was | Notes |
| --- | --- | --- |
| `documents/{id}` | `documents` | `owner_user_id, title, comments, share_settings, activity, word_settings, word_count, has_ydoc, member_ids[], search_terms[], created_at, updated_at`. `member_ids` = owner + active members (for "shared with me" queries and the rules). `search_terms` = up to 400 lower-case words of the title and text (`searchTerms()`), queried with `array-contains`. |
| Storage `documents/{id}/blocks.json` | `documents.blocks` | Readable block JSON. In Storage because a long thesis passes Firestore's 1 MiB document limit. `lib/documentStore.ts`. |
| Storage `documents/{id}/ydoc.bin` | `documents.ydoc` | Live Yjs state, saved by services/collab. |
| `documents/{id}/members/{sha1(invite_email)}` | `document_members` | `user_id (null until claimed), invite_email (lower case), display_name, role, status, invited_by_user_id, invite_sent, created_at`. The id makes `(document, email)` unique. |
| `documents/{id}/versions/{id}` | `document_versions` | Metadata only; blocks in Storage `documents/{id}/versions/{versionId}.json`. |
| `chat_threads/{id}` | `chat_threads` | `document_id, user_id, title, messages, created_at, updated_at`. |
| `assets/{id}` | `assets` | Image metadata; bytes in Storage `assets/{id}`. |

Deleting a document: `deleteDeep(documents/{id})` (members, versions) + `deleteDocumentFiles(id)`.

## Library

| Path | Was | Notes |
| --- | --- | --- |
| `library_folders/{id}` | `library_folders` | `user_id, name, parent_id, source, created_at`. |
| `library_documents/{id}` | `library_documents` | Same columns, plus `doi_lower` (unique per user: checked in a transaction on a `library_doi/{user}__{sha1(doi)}` marker doc; imported items' source ids use markers `library_doi/{user}__ext_{sha1(external_id)}`) and `external_id`. File in Storage `library/{user}/{id}.pdf`. |
| `library_documents/{id}/chunks/{chunk_index}` | `library_chunks` | `user_id, document_id, chunk_index, page, content, terms[]` and, when an embeddings provider is set, `embedding` (a Firestore vector, 384 dims) and `embedding_model`. Search: `findNearest` on `embedding` when present, else `array-contains-any` on `terms` ranked in memory. |
| `library_connections/{user_id}__{provider}` | `library_connections` | Credentials encrypted with SETTINGS_KEY, as before. |
| `library_import_jobs/{id}` | `library_import_jobs` | Created by the API; **a Cloud Function (`onImportJobWritten`) runs the import in turns** (a new job, and each time a turn raises `attempt`), so it outlasts any one request or function call. |
| — | `auth_flows` | Gone: sign-in flows are Firebase's; the Zotero and Mendeley OAuth round trips carry signed state (SETTINGS_KEY). |

PDF text extraction runs in the **`onLibraryPdfUploaded` Storage trigger** (functions/), not in
the upload request.

## Cloud API, billing, admin

| Path | Was | Notes |
| --- | --- | --- |
| `api_keys/{id}` | `api_keys` | Looked up by `key_hash` (indexed). |
| `usage_events/{service}__{request_id}` | `usage_events` | The id makes retries idempotent (`create()`). |
| `plans/{id}` | `plans` + `plan_features` | Features are an embedded `features: [{ label, included, sort_order }]` array. |
| `app_settings/{key}` | `app_settings` | Encrypted values as before. Every instance listens with `onSnapshot`, so a change in Admin applies everywhere within a second. |
| `admin_audit/{auto}` | `admin_audit` | |
| `stripe_events/{event id}` | `stripe_events` | `create()` makes each event handled once. |
| `rate_limits/{key}:{ip hash}:{window}` | (memory) | TTL policy on `expires_at`. |

## Indexes and TTL

`firestore.indexes.json` holds the composite and collection-group indexes the queries need.
Turn on the TTL policy (Firestore console › TTL; firestore.indexes.json declares it) for `rate_limits.expires_at`.
