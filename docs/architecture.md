# Architecture

WriteOrbit runs on one Firebase project. Each part, what it does and where it runs:

```
                    ┌──────────────────────────── Firebase project ────────────────────────────┐
  Browser           │                                                                          │
  ───────           │  Authentication ◄─── sign-in, ID tokens (App Check optional)             │
  Next.js pages     │                                                                          │
  editor ───────────┼─ https ─► App Hosting (the Next.js app)                                  │
                    │             ├─ pages (Next.js 15)                                        │
                    │             └─ app/api, app/v1 → lib/server (Hono) ─────┐                │
                    │                                                         │ Admin SDK     │
                    │   Firestore ◄───────────────────────────────────────────┤               │
                    │   Cloud Storage ◄───────────────────────────────────────┤               │
                    │   Cloud Run: convert (internal) ◄───────────────────────┘               │
                    │                                                                          │
  editor ───────────┼─ wss ───► Cloud Run: collab ──► Firestore, Storage (Yjs state)           │
                    │                                                                          │
                    │   Cloud Functions ◄── Storage / Firestore / Auth / schedule triggers     │
                    │      (PDF text, Library imports, newsletter, account cleanup)            │
                    └──────────────────────────────────────────────────────────────────────────┘
```

## The pieces

**The Next.js app (repository root): App Hosting.** It serves the pages and the HTTP API. The API is
`lib/server`, a Hono app mounted by two catch-all route handlers:
`app/api/[[...route]]` and `app/v1/[[...route]]`. The URLs are the same ones the self-hosted
server used, so the editor needed no change for HTTP. Server components that need API
data (pricing, developer prices) call the app in-process (`getApp().request(...)`).

**Authentication.** Firebase Authentication handles every sign-in method (email and password,
Google, Microsoft, Apple) and sends the reset and confirmation emails. The browser keeps the
latest ID token (`lib/session.ts`) and sends it as `Authorization: Bearer`. The API
verifies it with the Admin SDK (`lib/server/auth.ts`). On a person's first request it
creates their `users/{uid}` and `accounts/{id}` documents (`lib/users.ts`). There are no admin
accounts: the app has no admin page.

**Firestore and Storage.** All data lives here; see [data-model.md](data-model.md). Browsers
never write either one. Every change goes through the API, which checks access, plan limits and
credits. `firestore.rules` allows a few read-only listeners and denies everything else.
`storage.rules` denies everything. A document's block JSON and its Yjs state are kept in Storage,
because a long thesis passes Firestore's 1 MiB document limit.

**services/collab: Cloud Run.** Holds the editor's two WebSockets: Yjs document sync
(Hocuspocus, `/collab`) and presence (`/api/ai-editor/documents/:id/ws`). It authenticates each
socket with the same ID token and access rules as the API. Changes made over HTTP (title,
comments, sharing) reach open sockets because collab listens to the open documents with
Firestore `onSnapshot`. Rooms live in memory, so it runs as **one instance** for now.

**services/convert: Cloud Run.** The stateless converter for Word, PDF and LaTeX, plus PDF text
extraction, unchanged from the self-hosted version. Internal ingress only.

**functions: Cloud Functions.** Work that must not depend on a request staying open:

| Function | Trigger | Does |
| --- | --- | --- |
| `onLibraryPdfUploaded` | Storage finalize on `library/{uid}/{id}.pdf` | Extracts the text (convert), stores chunks, optional embeddings |
| `onImportJobWritten` | Firestore write on `library_import_jobs/{id}` | Runs Zotero/Mendeley/.bib/.ris/ID imports in turns of a few minutes |
| `newsletterSync` | Every 15 minutes | Keeps the MailCheap list in step |
| `closeStuckImports` | Hourly | Marks imports that stopped |
| `onUserDeleted` | Auth user deleted | Removes the person's data |

The functions import the same `lib/server` code. `functions/build.mjs` bundles it into
`functions/dist`, which `firebase deploy` uploads.

## Settings

Environment variables (`apphosting.yaml`, the Cloud Run services' variables, and
`functions/.env`) are the only settings (`lib/server/env.ts`); change one and redeploy. Plans
and prices are code: `lib/server/lib/plans.ts` and `lib/server/lib/prices.ts`.

## Search

Firestore has no full-text index:

- **Documents** keep `search_terms`, up to 400 words of the title and text, queried with `array-contains`.
- **Library passages** keep `terms`, queried with `array-contains-any` and ranked in memory.
  With `EMBEDDINGS_PROVIDER` set, they also get a 384-dimension embedding and are searched with
  Firestore vector search (`findNearest`). `local` gets the vectors from the converter's
  `POST /embed` (BAAI/bge-small-en-v1.5 on its CPU); `openai` from OpenAI's API.

For ranked full-text search across everything, add Typesense or Algolia; both have Firebase
extensions.

## Scaling notes

- App Hosting and Functions scale out; rate limits are counted in Firestore, so they hold across instances.
- collab is the one stateful service. To run more than one instance, add the Hocuspocus Redis
  extension and move presence to Redis (Memorystore), or route each document to one instance.
- The API caches settings, plans and verified tokens per instance for a minute or less.
