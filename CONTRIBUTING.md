# Contributing

Thanks for helping. Bug reports, fixes and features are welcome.

## Before you start

- **Bugs:** open an issue with what you did, what you expected and what happened. Screenshots help, especially for layout problems on phones.
- **Features:** open an issue first so we can agree on the approach before you write a lot of code.
- **Security problems:** don't open an issue. See [SECURITY.md](SECURITY.md).

## Working on the code

```bash
pnpm install:all
cp .env.example .env.local   # NEXT_PUBLIC_USE_EMULATORS=1 for local work
pnpm dev:all                          # Firebase emulators + web app (and API) on :3000 + collab on :4200
```

The emulators need Java 21 and the Firebase CLI (installed with the dev dependencies). See the README.

Before you send a pull request:

```bash
pnpm typecheck
pnpm test
pnpm test:rules                       # firestore.rules against the emulator
cd services/convert && pytest
```

Changes to how a page looks should come with a screenshot at desktop and phone width.

## Style

- Match the code around you: names, comment density, how errors are handled.
- Text people see is short and plain. One icon set: `react-icons/lu`.
- New settings go in `lib/server/env.ts` and, if an admin should change them in the browser, `lib/server/lib/settings.ts`. Document them in `.env.example` and `apphosting.yaml`.
- Data changes follow [docs/data-model.md](docs/data-model.md) (update it with the change). A new query that filters on two or more fields, or a collection group, needs an entry in `firestore.indexes.json`. Firestore has no migrations: code must read documents written before the change (missing fields get defaults).
- Browsers never write Firestore or Storage; add an API route instead. `firestore.rules` stays closed for writes.

