# Reference imports and source extraction

Zotero and Mendeley are one-way imports with repeatable reference updates. Nothing is written back
to either provider, and deleted provider items do not delete Library documents.

An exact provider/account/item identity is required to update an existing reference. A DOI match by
itself is only a duplicate check. Each new reference stores the values originally imported. Later
imports replace a field only when it still matches that baseline. Locally edited fields are retained;
the Library's expanded source view compares saved and incoming values. Legacy imports without a
baseline keep nonempty existing values and only fill empty fields. DOI identity changes require a
separate reference. Folder choices, user metadata and PDF page chunks remain intact. Abstract-only
reference text is updated atomically with its metadata; old abstract embeddings are not reused.

## Zotero group libraries

In Library → Zotero, **Choose a group library** lists groups explicitly readable by the connected
key. The key's live privileges are checked before reading a selected group, including when the
background import job runs. Select a group and optionally one of its collections before importing.
Group source IDs include the provider, connected account, group ID and item key; they cannot update
a personal-library item with the same key. DOI duplicates across libraries continue to be skipped.

The existing OAuth request still asks for personal-library read access and `all_groups=none` with
write access disabled. It does not silently expand permission. To import a group, the user explicitly
creates a key with the needed group read grant and reconnects. A group-only key is accepted, but does
not grant personal-library access. Group file downloads still depend on Zotero's actual permissions.
See Zotero's official [read API](https://www.zotero.org/support/dev/web_api/v3/basics) and
[live key permissions](https://www.zotero.org/support/dev/web_api/v3/syncing).

Provider item versions/modification times are retained for provenance. Re-import currently enumerates
the selected source and safely merges changed entries; it is not a continuous sync service, webhook
subscription or a provider-side incremental cursor. The existing job checkpoint/retry behavior remains.

## Scanned PDFs

Native PDF text remains the default in the existing converter. Optional local Tesseract can read sparse
pages when the engine and requested packs are already installed. The attachment picker lists available
language packs; no location controls the choices. The converter enforces page, pixel and time budgets,
preserves original page numbers and returns explicit partial/empty/OCR quality notes. Missing language
packs are not replaced silently with English. Library PDF processing also saves these notes in source
metadata, and the Library displays them.

The converter image always installs Tesseract (English pack) and OCR settings are fixed in
`services/convert/writeorbit_convert/config.py`; the deployed image picks this up on its next build.
Without Tesseract (local development) native text is still read and scanned pages are reported as unread. See [converter configuration and tests](../services/convert/README.md). Native/empty page fixture
tests use a mocked OCR engine; real OCR, fonts, chosen packs and difficult layouts still need an image
smoke test. OCR quality is not guaranteed for handwriting, tables or numeric extraction.

## Verification coverage

Claim checks retain source passages and label their basis. Missing source text, unsupported response
shapes, omitted model results and provider failures remain **unverified**. Coverage distinguishes
attempted/completed/total cited narrative checks and sentences outside the depth budget. Revisions
remain drafts for review, not revalidated claims. A separate conservative list labels uncited prose as
**uncited sentences to review**; it is not a factual-claim classifier or an exhaustive claim count.
Tables, captions, code and reference sections are excluded from that heuristic.

DOI checks distinguish a record mismatch/not found from an incomplete check, excluded registry or
depth limit. Notice lookup failures remain visible even when the DOI record matches. Neither a found
DOI nor an absent notice establishes claim support, study quality or the absence of every retraction.
