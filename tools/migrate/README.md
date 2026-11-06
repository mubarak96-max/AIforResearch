# Moving a self-hosted WriteGrid to Firebase

`migrate.ts` reads the old PostgreSQL database and files folder and writes Firestore, Cloud
Storage and Firebase Authentication as described in [docs/data-model.md](../../docs/data-model.md).

## Before you start

1. Deploy rules and indexes first: `firebase deploy --only firestore,storage`.
2. Make a service account key with Firestore, Storage and Firebase Authentication admin roles.
3. Files: if the old install stored files on its disk, point `FILES_DIR` at that folder (the
   `files` volume). If it used Wasabi/S3, copy the bucket to a folder first
   (`aws s3 sync s3://your-bucket ./files`) and point `FILES_DIR` there.
4. Stop writes to the old install (or run the script twice: once early, once during a short
   freeze; every write uses the old id, so a second run just updates).

## Run

```bash
DATABASE_URL=postgres://writegrid:PASSWORD@localhost:5432/writegrid \
FILES_DIR=./files \
FIREBASE_PROJECT_ID=your-project \
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app \
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
pnpm migrate --dry-run          # counts only
pnpm migrate                    # everything
pnpm migrate --only=documents,files
```

Paths are relative to `tools/migrate` (pnpm runs the script there): use absolute paths to be safe.

Steps: `accounts`, `users`, `documents` (with members, versions, chats, assets), `library`
(folders, items, text chunks, connections), `cloud` (API keys, usage, plans, settings, Stripe
events, audit), `files`. Try it against the emulators first: set `FIRESTORE_EMULATOR_HOST`,
`FIREBASE_AUTH_EMULATOR_HOST` and `FIREBASE_STORAGE_EMULATOR_HOST` and leave out the key.

## What happens to sign-ins

- Every person keeps their id: the Firebase Auth uid **is** the old `users.id`, so documents,
  Library items and accounts line up without rewriting references.
- **Bcrypt passwords** (accounts imported from the earlier Laravel app) are imported into
  Firebase Auth as they are. Those people sign in with the same password.
- **Argon2 passwords** (accounts created on the self-hosted version) cannot be imported into
  Firebase. They go to `legacy_passwords/{email}`; the first time the person signs in, the API
  checks the old hash, sets the same password in Firebase and deletes the entry. Nobody needs
  to reset anything.
- **Google, Microsoft and Apple** links from `user_identities` are imported as provider data.
  Make sure each provider is enabled in Firebase console › Authentication with the **same
  client id** as before, or Firebase will see a different subject and refuse the sign-in. If
  that happens, people can still sign in with "Forgot password?" and connect the provider again.
- **Passkeys** do not move (Firebase has no passkeys). People who only used a passkey sign in
  with "Forgot password?" once.
- Admins: `is_admin` is copied. `SETTINGS_KEY` must be the **same** as the old install's, or
  the keys saved in Admin (AI, Stripe, …) cannot be decrypted.

## What does not move

- Sessions: everyone signs in again once.
- Rate-limit counters and one-time sign-in flows (`auth_flows`).
- Library search embeddings: the old install had none (word search). With
  `EMBEDDINGS_PROVIDER` set, new and re-processed PDFs get embeddings; re-upload or re-process
  older items from the Library to add them.
