# writeorbit-convert

A small, stateless HTTP service that converts between the AI for Research editor's documents (BlockNote
blocks) and Word, PDF and LaTeX, and extracts text from PDFs. It listens on **port 4100** and is
**internal only**: publish no host port. The AI for Research API (`lib/server`, running in the web app on Firebase
App Hosting, and Cloud Functions; `CONVERT_URL`) owns authentication, storage and the database, and
calls this service.

- **Stateless.** No auth, no database, no cloud storage. Imported images and the Word file that
  later serves as the export template are **returned** to the caller. On export the caller
  **sends** the template and tells the converter where to fetch images.
- **Response shapes match the editor's original API.** `blocks`, `comments`, `settings`,
  `warnings`, `stats` and `title` have the same shape the browser client
  (`components/editor/lib/aiEditor/wordApi.ts`) already expects, so the API server can pass
  them through unchanged.
- **Engines.** The Word reader and writers are in `writeorbit_convert/word/` (python-docx, lxml,
  Pillow, latex2mathml). LibreOffice handles .doc/.odt/.rtf and PDF output, and pypdfium2
  handles PDF text. No AGPL code is used (PyMuPDF is not); licences are listed in `NOTICE`.

## Deploy to Cloud Run

The API and the Library PDF function call this service; nothing else should. Deploy it
**private** (`--no-allow-unauthenticated`): Cloud Run then accepts only requests carrying a Google
ID token for an account with `roles/run.invoker`. On Google Cloud the API attaches one
automatically (`lib/server/lib/serviceAuth.ts`), so no VPC connector is needed and an idle
converter costs nothing:

```sh
gcloud run deploy convert --source services/convert --region us-central1 \
  --port 4100 --memory 2Gi --cpu 2 --concurrency 4 --timeout 300 \
  --min-instances=0 --max-instances=2 --no-allow-unauthenticated

# Let the web app (App Hosting) and Cloud Functions call it:
for sa in firebase-app-hosting-compute@<project>.iam.gserviceaccount.com \
          <project-number>-compute@developer.gserviceaccount.com; do
  gcloud run services add-iam-policy-binding convert --region us-central1 \
    --member="serviceAccount:$sa" --role=roles/run.invoker
done
```

(If your Functions run as another service account, grant that one instead.) For network-level
isolation as well, add `--ingress internal` and reach it over Direct VPC egress or Serverless VPC
Access (`runConfig.vpcAccess` in `apphosting.yaml`, `vpcConnector` for Functions); a Serverless
VPC Access connector bills for its VMs even when idle.

Deploy the same image a second time as **`embed`**, which only answers Library search's
`POST /embed`. Embedding keeps every core busy for seconds per paper. On its own service it never
slows down Word and PDF conversions, and it scales (and idles at zero) on its own:

```sh
gcloud run deploy embed --source services/convert --region us-central1 \
  --port 4100 --memory 1Gi --cpu 2 --concurrency 16 --timeout 300 --cpu-boost \
  --set-env-vars CONVERT_EMBED_WARM=1 \
  --min-instances=0 --no-allow-unauthenticated
```

Grant it `roles/run.invoker` for the same accounts. While traffic is low, skip `embed` and leave
`EMBED_URL` empty.

Then set `CONVERT_URL` (the converter's URL) and `EMBED_URL` (the embed service's URL) for App
Hosting and Functions. Without `EMBED_URL` the converter answers `/embed` itself; it loads the
model only on the first such request. Cloud Run scales it to
zero when idle; the first conversion after a quiet spell takes a few extra seconds while
LibreOffice starts. (`--source` builds the default image, tests included, which is harmless; build with
`--build-arg WITH_TESTS=0` yourself and deploy with `--image` for a leaner one.)

## Run locally

```sh
docker build -t writeorbit-convert:dev services/convert            # WITH_TESTS=1 (default) includes pytest
docker build --build-arg WITH_TESTS=0 -t writeorbit-convert:prod services/convert   # lean image

docker run -d --name writeorbit-convert --network writeorbit-net --restart unless-stopped \
  --memory 2g --cpus 2 writeorbit-convert:dev          # no -p: reachable only as http://writeorbit-convert:4100
```

The image is based on `python:3.12-slim-bookworm`. It adds LibreOffice 7.4 (`libreoffice-writer-nogui`,
plus `libreoffice-draw-nogui` for EMF/WMF images) and fonts metric-compatible with Word's
defaults: Liberation (Times New Roman/Arial/Courier New), Carlito (Calibri), Caladea (Cambria)
and DejaVu. The service runs as the non-root user `convert` (uid 10001).

### Tests

```sh
docker run --rm --network writeorbit-net writeorbit-convert:dev python -m pytest -q
```

On 2026-10-28 the result was 41 passed and 1 skipped. The skipped test compiles the LaTeX export
with pdflatex, which the image doesn't include.

### Configuration (environment)

| Variable | Default | Meaning |
|---|---|---|
| `CONVERT_WORKERS` | `2` | Worker processes for conversions (`0` = threads in the server process). |
| `CONVERT_MAX_QUEUE` | `16` | Requests that may wait for a worker; beyond that → `503` + `Retry-After: 5`. |
| `CONVERT_MAX_TASKS_PER_WORKER` | `50` | A worker process is replaced after this many jobs. |
| `CONVERT_JOB_TIMEOUT` | `600` | Longest wait for one job, queueing included (s) → `504`. |
| `CONVERT_IMPORT_TIMEOUT` | `120` | LibreOffice .doc/.odt/.rtf → .docx (s). |
| `CONVERT_PDF_TIMEOUT` | `120` | LibreOffice .docx → PDF for `/word/export` (s). |
| `CONVERT_DOCX_TO_PDF_TIMEOUT` | `60` | LibreOffice for `/convert/docx-to-pdf` (s). |
| `CONVERT_PDF_TEXT_TIMEOUT` | `120` | pypdfium2 text extraction (s). |
| `CONVERT_ALLOW_PUBLIC_IMAGES` | `1` | `0` = never fetch public https images named in an export. |
| `CONVERT_ASSET_FETCH_BASES` | *(empty)* | Comma-separated URL prefixes. If set, an export's `asset_fetch_base` must start with one of them. |
| `CONVERT_EMBED_MODEL` | `BAAI/bge-small-en-v1.5` | The `/embed` model (any fastembed text model with **384** dimensions, to match the Firestore index). Set it with the `EMBED_MODEL` build arg so the image bakes that model in. |
| `CONVERT_EMBED_THREADS` | `0` | ONNX Runtime threads per batch (`0` = all cores). |
| `CONVERT_EMBED_BATCH` | `8` | Texts per model run. Between runs a waiting search query goes first, so a query waits at most one run (about a second) behind an upload. |
| `CONVERT_EMBED_WARM` | `0` | `1` = load the model at start-up (the `embed` service); `0` = on the first `/embed`. |

Build args: `WITH_EMBEDDINGS=1` (default) installs fastembed (`requirements-embed.txt`) and downloads
the model into the image at build time; `0` leaves `/embed` out (it answers `501`). For writers who
work in other languages, build with
`--build-arg EMBED_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (50+ languages,
220 MB). Changing the model makes earlier vectors unsearchable until their PDFs are re-processed:
each chunk records the model that embedded it, and search only compares vectors from the same model.

OCR for scanned PDF pages is always on. The image installs Tesseract with the English pack, and the
settings (default language `eng`, 216 DPI, 15 s per page, 80 s and 40 pages per PDF, pages with fewer
than 20 native characters and at least half image) are fixed in `writeorbit_convert/config.py`, not
read from the environment. To offer more languages, add their packs (for example `tesseract-ocr-ara
tesseract-ocr-jpn`) to the Tesseract line in the Dockerfile; a request can then choose any installed
pack. This is a document language setting, with no account-location restriction, and a missing pack is
never silently replaced by English. Without Tesseract (local development) scanned pages are reported
as unread.
The API's attachment picker lists available packs through `GET /api/files/ocr`.

Run the focused OCR tests in the existing test image with
`python -m pytest -q tests/test_pdf_ocr.py`. These use native-text and empty-page PDF fixtures
and a mocked OCR engine; an actual engine/language smoke test is still needed for the chosen image.

### Process discipline

- Every LibreOffice run and every PDF-text run is a child process. It runs under `nice -n 10`
  in its own process group, gets a fresh temporary directory (input, output and a throwaway
  LibreOffice profile), and has a timeout. On timeout the whole process group gets SIGTERM, then
  SIGKILL. The temporary directory is always deleted.
- Parsing and writing run in a pool of `spawn`ed worker processes at nice 5. A huge document
  can't stall the HTTP loop. If a worker crashes, the request gets a `500` and the pool is
  recreated.
- Request bodies over a route's limit are refused with `413`. If the request has a
  `Content-Length`, it's refused up front; otherwise it's refused while streaming.

## HTTP contract

Error responses are JSON `{"detail": "<message for the user>"}`, except `422`, where `detail` is
FastAPI's list of validation errors. The browser shows `detail` when it is a string, so the API
server can pass errors through unchanged.

### `GET /health`

`200` `application/json`:

```json
{"status": "ok", "service": "writeorbit-convert", "version": "0.1.0", "libreoffice": true, "workers": 2, "busy": 0}
```

`busy` is the number of jobs running or waiting. The check is cheap and runs no conversion.

### `POST /word/import`

Opens a Word file. `multipart/form-data`:

| Field | Required | Meaning |
|---|---|---|
| `file` | yes | `.docx`, `.docm`, `.dotx` (read directly), or `.doc`, `.dot`, `.odt`, `.rtf` (converted to .docx by LibreOffice first). Up to **50 MB**. The extension is taken from the part's filename. |
| `asset_url_prefix` | no | Image URLs in the returned blocks are `<asset_url_prefix><name>`. Default `/api/ai-editor/assets/`. Must be a path (`/…`) or an `http(s)://` URL, up to 500 characters. |
| `include_source` | no | `true` to always return the template bytes in `sourceDocx.data` (by default they are only returned when the file was converted). Default `false`. |

Other fields, such as the browser's `document_id`, are ignored, so the browser's form can be
forwarded as it is.

`200` `application/json`:

```jsonc
{
  "blocks":   [ /* BlockNote blocks, as the editor's original API returned them */ ],
  "comments": [ /* comment threads: {id, actorSessionId:"word-import", actorDisplayName, text, selectedText, blockId, createdAt, status, replies[]} */ ],
  "settings": {            // WordSettings (components/editor/lib/aiEditor/wordSchema.tsx)
    "version": 1, "styles": {...}, "page": {...}, "header": {...}, "footer": {...},
    "differentFirstPage": false, "pageNumberStart": 1, "sections": [...],
    "source": {"fileName": "thesis.docx", "importedAt": "2026-10-28T16:35:52.123456+00:00"}
  },
  "warnings": ["Text boxes were turned into normal paragraphs."],
  "stats": {"paragraphs": 10, "headings": 6, "tables": 2, "images": 1, "citations": 0, "footnotes": 0,
            "comments": 0, "equations": 0, "trackedChanges": 0, "listItems": 6, "pageBreaks": 1},
  "title": "thesis",                 // file name without extension, ≤ 300 chars, or "Untitled document"
  "assets": [                        // each distinct image once; the blocks point at "url"
    {"name": "613295a0f4c78915e0bb38109fbd3e0e.png",   // sha256[:32] + "." + extension
     "url": "/api/ai-editor/assets/613295a0f4c78915e0bb38109fbd3e0e.png",
     "contentType": "image/png", "size": 1274, "sha256": "<64 hex>", "data": "<base64>"}
  ],
  "sourceDocx": {                    // the Word package to send back as the export template
    "fileName": "thesis.docx", "format": "docx", "converted": false,
    "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "size": 40096, "sha256": "<64 hex>",
    "data": "<base64>"               // only when converted (from .doc/.odt/.rtf/.dot) or include_source=true
  }
}
```

Image notes: an asset's `contentType` is one of `image/png`, `image/jpeg`, `image/gif`, `image/bmp`,
`image/svg+xml`, `image/webp` or `image/tiff`. EMF/WMF images are converted to PNG; there are at
most 20 of them per file and 90 s of conversion in total. An image over **15 MB** is left out:
its block gets `url: ""` and a warning is added.

| Status | When (`detail`) |
|---|---|
| 400 | Another file type (`Open a Word file (.docx, .doc), .odt or .rtf`), an empty file, a password-protected .docx (`This file is password-protected. Remove the password in Word, then open it here.`), an unreadable file (`This file could not be read as a Word document.`), or a bad `asset_url_prefix`. |
| 413 | Over 50 MB (`Files up to 50 MB can be opened`), more than 512 MB when unpacked or more than 20,000 zip entries (`This file is too large once unpacked.`), or the request body too large (`The request is too large.`). |
| 503 | The converter is busy. Retry after `Retry-After` seconds. |
| 504 | LibreOffice took more than 120 s to convert the file. |

### `POST /word/export`

Turns editor content into `.docx`, PDF, or a LaTeX project (`.zip`). There are two request forms:

- `application/json`: the export object below, with the template given as `source_base64` if wanted.
- `multipart/form-data` (better for large templates): a `payload` part holding the export object
  as JSON text, plus an optional `source` **file** part with the template `.docx`.

Export object (`snake_case`, the same field names the browser sends):

| Field | Default | Meaning |
|---|---|---|
| `title` | `"Document"` | Up to 500 characters. Used in the file name and in the document properties (LaTeX: `\title`). |
| `blocks` | `[]` | The editor's BlockNote blocks. |
| `comments` | `null` | Comment threads (as in the import response). Threads with a `blockId` become Word comments. |
| `settings` | `null` | The **merged** WordSettings (stored settings overlaid with the browser's, minus `source`). |
| `format` | `"docx"` | `docx` \| `pdf` \| `latex`. Any other value → `422`. |
| `author` | `null` | Author for new tracked changes and comments (docx/pdf, default `"AI for Research"`) and `\author{}` (LaTeX). Up to 200 characters. |
| `asset_url_prefix` | `/api/ai-editor/assets/` | Image URLs whose path ends in `<prefix path><name>` are editor assets... |
| `asset_fetch_base` | `null` | ...fetched as `GET <asset_fetch_base><name>` (http/https; private addresses allowed, since the caller controls this value; must match `CONVERT_ASSET_FETCH_BASES` when that is set). |
| `source_base64` | `null` | The template `.docx` as base64 (JSON form only; the `source` part wins in multipart). |
| `document_id` | `null` | Accepted and ignored. |

Template: when a valid Word package is given (docx/pdf only), its styles, theme, numbering,
headers, footers and settings are kept, and only the body, footnotes and comments are rewritten.
Without one, a template with the editor's look (Times New Roman 12 pt) is used. An invalid
template is ignored, not treated as an error. LaTeX never uses the template.

Images in blocks are loaded in this order:

1. `data:` URIs.
2. Editor assets from `asset_fetch_base`. If that fetch fails and the URL is absolute, the public
   https rule (3) is tried.
3. Public `https://` URLs, if `CONVERT_ALLOW_PUBLIC_IMAGES`. Every resolved address must be
   global, redirects aren't followed, the response must be `image/*`, and the timeout is 10 s.

Any image is at most **15 MB**, with at most 300 fetches per export. An image that can't be loaded
becomes the text `[name or caption]` (docx) or `\textit{[...]}` (LaTeX). WebP and SVG are
converted to PNG with Pillow. Pillow can't draw SVG, so SVG images are left out of docx exports.

`200` with the file bytes:

| `format` | `Content-Type` | `Content-Disposition` |
|---|---|---|
| `docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `attachment; filename="<title>.docx"; filename*=UTF-8''<title>.docx` |
| `pdf` | `application/pdf` | `… "<title>.pdf" …` |
| `latex` | `application/zip` (`main.tex`, `references.bib` if anything is cited, `figures/fig-N.png\|jpg`) | `… "<title>-latex.zip" …` |

The title is cleaned for file names (`\/:*?"<>|` and newlines become spaces, up to 150
characters). There is also an extra header: `X-Word-Template: source | default`.

| Status | When |
|---|---|
| 400 | Invalid JSON / not an object, a multipart request without `payload`, `source` not a file part, bad `source_base64`, or a bad or disallowed `asset_fetch_base` / `asset_url_prefix`. |
| 413 | Export JSON over 50 MB (`Editor exports must be 50 MB or smaller`), template over 50 MB (`The source Word file must be 50 MB or smaller`), or the request body too large. |
| 422 | Validation (for example `format: "tex"`). |
| 500 | `The document could not be exported. Please try again.` |
| 503 / 504 | Busy / the PDF took more than 120 s. |

### `POST /convert/docx-to-pdf`

`multipart/form-data` with field `file`: a `.docx` or `.doc` up to **50 MB**. A `.docx` must be a
real Word package. The response is `200` `application/pdf` with
`Content-Disposition: attachment; filename="<name>.pdf"; filename*=UTF-8''<name>.pdf`.

| Status | When (`detail`) |
|---|---|
| 400 | `Only .docx/.doc files are accepted`, `The editor document is empty`, or `This file could not be read as a Word document.` |
| 413 | `Editor exports must be 50 MB or smaller` |
| 500 | `PDF conversion failed` |
| 504 | `PDF conversion timed out` (60 s) |

### `POST /pdf/text`

`multipart/form-data` with field `file`: a PDF up to **50 MB** (`%PDF-` within its first 1 KB).
Text is extracted with pypdfium2. When a local Tesseract engine is available, sparse or scanned pages
can use OCR. Optional multipart `ocr_languages` selects installed codes joined with `+` (up to eight).
An unavailable language is reported explicitly and is never silently replaced with another language.
Native text remains the default; OCR only replaces sparse text when it adds readable content.

The existing response adds `pages[].method` (`native`, `ocr`, `empty`), `needs_review`, `warning`,
top-level `warnings`, and `extraction` with `status`, `ocr_pages`, `pages_without_text`,
`ocr_languages`, and `requires_review`. Original page numbers are retained, including empty pages.
`complete` describes text availability, not transcription accuracy. Missing engines, missing language
data, timeouts and page limits produce explicit quality warnings. Check OCR quotations, numbers,
tables and reading order against the original; handwriting and table structure are not guaranteed.

`GET /pdf/ocr` returns `{available, languages, default_languages, warning?}` for installed packs.
There are no runtime downloads or external OCR providers. The caller must preserve warnings when
using partial text; the Library stores them beside extraction metadata and the attachment API returns them.
Line breaks are `\n`.

`200` `application/json`:

```json
{
  "pages": [{"page": 1, "text": "Running head: TREATMENT ADHERENCE\nTreatment Adherence Among ..."}, {"page": 2, "text": "..."}],
  "page_count": 2,
  "title": "A Tiny Paper",
  "metadata": {"Title": "A Tiny Paper", "Author": "Ada Writer", "Creator": "...", "Producer": "...", "CreationDate": "D:20261028..."}
}
```

`title` is the document-info Title, or `null`. `metadata` holds the non-empty document-info
strings (`Title`, `Author`, `Subject`, `Keywords`, `Creator`, `Producer`, `CreationDate`, `ModDate`).

| Status | When (`detail`) |
|---|---|
| 400 | `The file is empty.`, `Upload a PDF file.`, `This file could not be read as a PDF.`, or `This PDF is password-protected. Remove the password, then try again.` |
| 413 | `PDFs up to 50 MB can be read` |
| 504 | `Reading this PDF took too long.` (120 s) |

### `POST /embed`

JSON `{"texts": ["...", ...], "kind": "passage" | "query"}`: 1 to 128 texts, each cut to 8,000
characters (the model reads about the first 512 tokens). Use `passage` for stored Library chunks
and `query` for a search. The model runs on this service's CPU (fastembed, ONNX Runtime), one run
of `CONVERT_EMBED_BATCH` texts at a time, with waiting queries ahead of waiting passages. Measured on
a laptop CPU: 64 chunks of 1,800 characters in about 9 s.

`200` `application/json`:

```json
{"model": "BAAI/bge-small-en-v1.5", "dimensions": 384, "vectors": [[0.0123, -0.0456, ...], ...]}
```

Vectors are L2-normalised, in the order of `texts`.

| Status | When (`detail`) |
|---|---|
| 422 | No texts, more than 128, or an unknown `kind` |
| 501 | `Embeddings are not installed in this converter image.` (built with `WITH_EMBEDDINGS=0`) |
| 503 | The model could not be loaded |
| 504 | `Embedding took too long. Please try again.` |

## How the API server uses it

These are the routes the browser calls, as they appear in `wordApi.ts` and `GoogleDocsHeader.tsx`.

- **`POST /api/ai-editor/word/import`** (multipart `file`, optional `document_id`)
  1. Check the user and their access to the document.
  2. Forward the `file` part to `POST {CONVERT_URL}/word/import`.
  3. Store each `assets[i]` (base64-decode `data`) under its `name` with its `contentType`.
  4. Store the template: `sourceDocx.data` if it is present, otherwise the uploaded bytes. Keep
     its storage key in the document's word settings, server side only (as `source.objectKey`).
  5. Create or update the document.
  6. Reply to the browser with `{document, blocks, comments, settings, warnings, stats, title}`.
     `settings.source` stays `{fileName, importedAt}`. Don't forward `assets` or `sourceDocx`.
- **`POST /api/ai-editor/word/export`** (JSON
  `{document_id?, title, blocks, comments?, settings?, format}`)
  1. Check access.
  2. Merge settings as `{...stored, ...request.settings without "source"}`.
  3. For docx/pdf, load the stored template.
  4. Call the converter with multipart `payload` (the merged object plus `author` = the user's
     display name, and `asset_fetch_base` = an internal URL that serves assets by name, for
     example a short-lived signed prefix) and `source` (the template).
  5. Stream the bytes back with the converter's `Content-Type` and `Content-Disposition`.
- **`POST /api/ai-editor/documents/convert/docx-to-pdf`** (multipart `file`, browser fallback):
  forward to `/convert/docx-to-pdf` and return the PDF.
- **`POST /api/ai-editor/assets`** and **`GET /api/ai-editor/assets/{name}`** belong to the API
  server alone. Keep the original rules:
  - Uploads: PNG, JPEG, GIF, WebP or SVG, up to 15 MB → `{"url": "/api/ai-editor/assets/<name>"}`.
  - On GET: validate the name, and send `Cache-Control: private, max-age=31536000, immutable`
    and `X-Content-Type-Options: nosniff`. For SVG, also send
    `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'`.
- **Library / PDF chat**: send PDFs to `/pdf/text` and chunk `pages[].text`. With
  `EMBEDDINGS_PROVIDER=local`, chunks go to `/embed` on `EMBED_URL` (`passage`, 64 per request)
  before the old chunks are replaced, until the PDF job's deadline; chunks past it keep word search
  only. Each Library search sends its query (`query`, 4 s timeout). Any failure falls back to word
  search.
- **Timeouts:**
  - Allow at least the converter's `CONVERT_JOB_TIMEOUT` (600 s) for import, export and
    conversion calls, and 5 s for `/health`.
  - On `503`, retry after `Retry-After`.

Asset names are content-addressed (`sha256[:32]`). The original server used random names. Two
users who import the same picture get the same name. If that matters, keep assets per owner
(for example, prefix the storage key with the owner's id) or rename them before storing. In
that case, rewrite the URLs in the blocks to match.

## Provenance

`writeorbit_convert/word/` started as an earlier Word converter. Imports are package-relative
and it has no dependencies on that application: the default author is `AI for Research`, OOXML part
and relationship ids use `rc`, and LaTeX uses `rcHighlight`. The block prop `ceRole` is unchanged
because the editor uses it. The tests in `tests/test_word_compat.py` and
`tests/test_word_latex.py` come from the same source. Their HTTP parts were rewritten for this
stateless contract.
