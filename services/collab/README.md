# Collab service

WebSockets that the Next.js app on Firebase App Hosting cannot serve:

| Path | What |
| --- | --- |
| `/collab` | Live document text (Yjs over Hocuspocus). State is saved to Storage `documents/<id>/ydoc.bin`. |
| `/api/ai-editor/documents/:id/ws` | Presence, cursors and document metadata (title, comments, sharing, members). |
| `/health` | Liveness, with open rooms and sockets. |

Sign-in is the browser's Firebase ID token (`?token=`), checked with the same access rules as the
HTTP API (`resolveAccess` from `lib/server`).

The HTTP API runs in another process, so it cannot push changes to open sockets. While a document
has viewers, this service listens to `documents/{id}` and its `members` in Firestore and sends
`sync:document` when they change. A write made through the API carries the tab's `x-session-id`
(`updated_by_session`), and that tab is not sent its own change back. Text saves from Hocuspocus
(`updated_by_session: 'collab'`) only move `updated_at` and are not re-broadcast.

## Run it on one instance

Rooms, presence and Hocuspocus documents live in this process's memory. Two instances would split
the people editing one document between them, so they would not see each other. Deploy with
**`--max-instances=1`**. To scale out later, add Hocuspocus's Redis extension and move presence to
Redis, or route each document to one instance.

The Dockerfile bundles `lib/server`, so build the image from the repository root
([cloudbuild.yaml](cloudbuild.yaml)), then deploy it:

```bash
gcloud artifacts repositories create writeorbit --repository-format=docker --location=us-central1  # once
gcloud builds submit --config services/collab/cloudbuild.yaml .

gcloud run deploy collab \
  --image us-central1-docker.pkg.dev/<project>/writeorbit/collab:latest --region us-central1 \
  --min-instances=0 --max-instances=1 \
  --timeout=3600 --session-affinity --allow-unauthenticated \
  --service-account=<the App Hosting service account, or one with Firestore + Storage access> \
  --set-env-vars=FIREBASE_PROJECT_ID=<project>,FIREBASE_STORAGE_BUCKET=<bucket>
```

That scales to zero: it bills only while someone has a document open (each open socket is a
request), and the first editor after a quiet spell waits a few seconds for a cold start. Once there
are real users, switch to an always-on instance (about $45/month):

```bash
gcloud run services update collab --region us-central1 --min-instances=1 --no-cpu-throttling
```

- `--allow-unauthenticated`: browsers connect directly; the service checks their Firebase ID token.
- `--no-cpu-throttling`: Hocuspocus saves in the background (debounced, 1.5–8 s), between
  messages. Without it, the last seconds of typing before everyone leaves can be saved late, or
  lost if Cloud Run stops the instance first. Acceptable while testing; turn it on for users.
- `--timeout=3600`: Cloud Run closes WebSockets at the request timeout. The editor reconnects
  automatically, so this is the longest a socket stays open before that happens.
- Point the web app at it with `NEXT_PUBLIC_REALTIME_URL=wss://collab-….run.app/collab`. The
  editor derives the presence socket from the same origin.

## Local

```bash
firebase emulators:start          # Firestore, Auth, Storage
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 FIREBASE_PROJECT_ID=demo-writeorbit \
  pnpm dev:collab   # listens on :4200 (run from the repository root)
```
