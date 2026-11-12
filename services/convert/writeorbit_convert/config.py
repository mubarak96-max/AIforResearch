"""Limits and settings. Code reads them as `config.NAME` at call time, so tests can change them."""

from __future__ import annotations

import os

MB = 1024 * 1024


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


# Size limits (the same as the editor's original server).
MAX_IMPORT_BYTES = 50 * MB  # a Word file to open
MAX_EXPORT_BYTES = 50 * MB  # an export request's JSON, its source .docx, a .docx sent for PDF conversion
MAX_ASSET_BYTES = 15 * MB  # one image, imported or fetched for an export
# A Word file is a zip: refuse ones that unpack to more than this (zip bombs).
MAX_UNPACKED_BYTES = 512 * MB
MAX_PACKAGE_ENTRIES = 20_000
# Images fetched over the network for one export.
MAX_FETCHED_IMAGES = 300

# LibreOffice timeouts (seconds).
IMPORT_CONVERT_TIMEOUT = _int("CONVERT_IMPORT_TIMEOUT", 120)  # .doc/.odt/.rtf -> .docx
PDF_EXPORT_TIMEOUT = _int("CONVERT_PDF_TIMEOUT", 120)  # generated .docx -> PDF
DOCX_TO_PDF_TIMEOUT = _int("CONVERT_DOCX_TO_PDF_TIMEOUT", 60)  # uploaded .docx/.doc -> PDF
PDF_TEXT_TIMEOUT = _int("CONVERT_PDF_TEXT_TIMEOUT", 120)  # PDF -> text (pypdfium2 subprocess)
# OCR for scanned PDF pages, using the Tesseract engine installed in the image (see Dockerfile).
# Fixed in code, not read from the environment. It never downloads engines or language data; where
# Tesseract is not installed (local development), scanned pages are reported as unread instead.
OCR_ENABLED = True
OCR_EXECUTABLE = "tesseract"
OCR_LANGUAGES = "eng"  # default when a request names no language; must match packs installed in the Dockerfile
OCR_DPI = 216  # render resolution, further capped by OCR_MAX_PIXELS
OCR_MAX_PIXELS = 12_000_000  # pixels rendered per page
OCR_PAGE_TIMEOUT = 15  # seconds per page
OCR_BUDGET_SECONDS = max(0, min(PDF_TEXT_TIMEOUT - 15, 80))  # seconds per PDF, kept below the worker timeout
OCR_MAX_PAGES = 40  # sparse pages attempted per PDF
OCR_TEXT_THRESHOLD = 20  # a page with fewer native text characters than this is sparse
# A sparse page is only sent to OCR when images cover at least this share of it (a scan, not a figure or blank).
OCR_MIN_IMAGE_COVERAGE = 0.5
METAFILE_TIMEOUT = 60  # one EMF/WMF image -> PNG
METAFILE_BUDGET_SECONDS = 90  # all EMF/WMF images of one import
MAX_METAFILES = 20

# Conversions run in a pool of worker processes (0 = threads in the server process).
WORKERS = _int("CONVERT_WORKERS", 2)
# Requests waiting for a worker beyond the busy ones; more get 503 + Retry-After.
MAX_QUEUE = _int("CONVERT_MAX_QUEUE", 16)
# A worker process is replaced after this many jobs (keeps memory in check).
MAX_TASKS_PER_WORKER = _int("CONVERT_MAX_TASKS_PER_WORKER", 50)
# The longest one request may wait for its job, queueing included.
JOB_TIMEOUT = _int("CONVERT_JOB_TIMEOUT", 600)

# Library search embeddings (POST /embed). The model must output 384 dimensions to match the
# Firestore vector index; BAAI/bge-small-en-v1.5 (English, 67 MB) and
# sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (50+ languages, 220 MB) both do.
EMBED_MODEL = os.environ.get("CONVERT_EMBED_MODEL", "BAAI/bge-small-en-v1.5")
# Where the model files live; the image bakes them in here so nothing downloads at run time.
EMBED_CACHE_DIR = os.environ.get("CONVERT_EMBED_CACHE_DIR", "")
EMBED_THREADS = _int("CONVERT_EMBED_THREADS", 0)  # 0 = ONNX Runtime's default (all cores)
# Texts per model run. Small, so a search query waits at most one slice (~1 s) behind an upload.
EMBED_BATCH = _int("CONVERT_EMBED_BATCH", 8)
# 1 = load the model when the service starts (the dedicated embed service); 0 = on first /embed.
EMBED_WARM = os.environ.get("CONVERT_EMBED_WARM", "0") == "1"
MAX_EMBED_TEXTS = 128  # texts in one request
MAX_EMBED_CHARS = 8000  # characters per text (the model reads ~512 tokens anyway)

# Image URLs in imported blocks are <asset_url_prefix><name>; the default matches the editor.
DEFAULT_ASSET_URL_PREFIX = "/api/ai-editor/assets/"
# Fetch public https images named in an export (with private/loopback addresses refused).
ALLOW_PUBLIC_IMAGES = os.environ.get("CONVERT_ALLOW_PUBLIC_IMAGES", "1") != "0"
# When set (comma-separated URL prefixes), an export's asset_fetch_base must start with one of them.
ASSET_FETCH_BASES = [item.strip() for item in os.environ.get("CONVERT_ASSET_FETCH_BASES", "").split(",") if item.strip()]
