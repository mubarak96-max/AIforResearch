# Collab service

WebSockets that the Next.js app on Firebase App Hosting cannot serve:

| Path | What |
| --- | --- |
| `/collab` | Live document text (Yjs over Hocuspocus). State is saved to Storage `documents/<id>/ydoc.bin`. |
| `/api/ai-editor/documents/:id/ws` | Presence, cursors and document metadata (title, comments, sharing, members). |
| `/health` | Liveness, with open rooms and sockets. |

Sign-in is the browser's Firebase ID token (`?token=`), checked with the same access rules as the
HTTP API (`resolveAccess` from `@researchcove/server`).

The HTTP API runs in another process, so it cannot push changes to open sockets. While a document
has viewers, this service listens to `documents/{id}` and its `members` in Firestore and sends
`sync:document` when they change. A write made through the API carries the tab's `x-session-id`
(`updated_by_session`), and that tab is not sent its own change back. Text saves from Hocuspocus
(`updated_by_session: 'collab'`) only move `updated_at` and are not re-broadcast.

## Run it on one instance

Rooms, presence and Hocuspocus documents live in this process's memory. Two instances would split
the people editing one document between them, so they would not see each other. Deploy with
**`--max-instances=1`** (and `--min-instances=1` so a cold start doesn't drop live editors). To
scale out later, add Hocuspocus's Redis extension and move presence to Redis, or route each
document to one instance.

```bash
gcloud run deploy collab \
  --source . --region us-central1 \
  --max-instances=1 --min-instances=1 --no-cpu-throttling \
  --timeout=3600 --session-affinity \
  --service-account=<the App Hosting service account, or one with Firestore + Storage access> \
  --set-env-vars=FIREBASE_PROJECT_ID=<project>,FIREBASE_STORAGE_BUCKET=<bucket>,ADMIN_EMAILS=...
```

- `--no-cpu-throttling`: Hocuspocus saves in the background (debounced), between messages.
- `--timeout=3600`: Cloud Run closes WebSockets at the request timeout. The editor reconnects
  automatically, so this is the longest a socket stays open before that happens.
- Point the web app at it with `NEXT_PUBLIC_REALTIME_URL=wss://collab-….run.app/collab`. The
  editor derives the presence socket from the same origin.

## Local

```bash
firebase emulators:start          # Firestore, Auth, Storage
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 FIREBASE_PROJECT_ID=demo-researchcove \
  pnpm --filter @researchcove/collab dev   # listens on :4200
```
