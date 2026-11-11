# Data model (Firestore + Cloud Storage)

Every Postgres table became a collection. **Field names are the old column names (snake_case)**,
so code reads a document exactly like it read a row. `lib/server/firebase.ts` has the
helpers: `row()` / `rows()` return `{ id, ...fields }` with Firestore Timestamps turned back
into `Date`s; writing a `Date` stores a Timestamp. Ids are the old ids (uuid strings), new ones
come from `newId()` (a random UUID), except where noted.

Browsers never write Firestore directly: every write goes through the API with the Admin SDK,
which checks access and plan limits. `firestore.rules` allows a few read-only
listeners (your own profile, documents you are a member of) and denies everything else.

## People and accounts

| Path | Was | Notes |
| --- | --- | --- |
| `users/{uid}` | `users` | `uid` is the **Firebase Auth uid**. `account_id, email (lower case), full_name, is_admin, email_verified_at, disabled_at, created_at, last_seen_at, newsletter_opt_out, newsletter_dirty, newsletter_synced, newsletter_synced_at, newsletter_error`. No password: Firebase Auth has it. |
| `legacy_passwords/{email}` | `users.password_hash` | Server-only. Argon2 hashes Firebase cannot import (tools/migrate). The first successful sign-in moves the password into Firebase Auth and deletes the entry. |
| `accounts/{id}` | `accounts` | Billing entity. `name, plan, dodo_customer_id, dodo_payment_method_id, dodo_billing, billing_status, billing_event_at, plan_subscription_id, plan_status, plan_interval, plan_period_end, plan_cancel_at_period_end, plan_source, plan_event_at, created_at`. |
| `accounts/{id}/plan_usage/{key}__{period}` | `plan_usage` | `key, period, amount`. Incremented with `FieldValue.increment` in a transaction. |
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

| `documents/{id}/writing_sessions/{sessionId}` | (new) | The authorship record: `user_id, user_name, started_at, last_at` (ms), running totals `active_seconds, typed, pasted_external, pasted_internal, ai_inserted, deleted`, and `pastes[]` (`at, chars, hash, internal`: pastes of 200+ characters, a SHA-256 of the text, never the text). Sent by the editor every 45 s (`useWritingActivity`); totals never go down. |
| `authorship_reports/{token}` | (new) | A frozen authorship report: `user_id, document_id, payload, hash` (SHA-256 of the canonical payload JSON), `created_at`. The token (random, 20 characters) is the public link `/verify/{token}`; the API is the only reader. |

Versions with `daily_key` (`YYYY-MM-DD`) are the day's snapshot for the authorship record and are never pruned, like named ones.

Deleting a document: `deleteDeep(documents/{id})` (members, versions) + `deleteDocumentFiles(id)`. Writing sessions go with it (a subcollection); issued authorship reports stay with their author until withdrawn or the account is deleted.

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

| `review_matrices/{id}` | (new) | Literature review matrix: `user_id, title, columns[{id, label, prompt}], document_ids[]` (Library documents, row order), `created_at, updated_at`. |
| `review_matrices/{id}/rows/{libraryDocumentId}` | (new) | `cells: { [columnId]: { value, quote, page, status (done/empty/error), basis (full_text/abstract/none/writer), edited, updated_at } }`. A cell with `edited` is the writer's own and is never refilled. |

## Usage and billing

Plans are not stored: they are defined in `lib/server/lib/plans.ts`. Settings are not stored
either: they come from the environment.

| Path | Was | Notes |
| --- | --- | --- |
| `usage_events/{service}__{request_id}` | `usage_events` | The id makes retries idempotent (`create()`). |
| `billing_events/{webhook-id}` | `billing_events` | Dodo Payments webhook deliveries; `create()` makes each one handled once. |
| `billing_products/plan_{plan}_{month\|year}` | | Dodo product of a plan's price: `kind: 'plan', product_id, cents, currency, trial_days, mode`. Ignored once the price in code or the mode differs, and a new one is made at the next checkout. |
| `rate_limits/{key}:{ip hash}:{window}` | (memory) | TTL policy on `expires_at`. |

## Indexes and TTL

`firestore.indexes.json` holds the composite and collection-group indexes the queries need.
Turn on the TTL policy (Firestore console › TTL; firestore.indexes.json declares it) for `rate_limits.expires_at`.
