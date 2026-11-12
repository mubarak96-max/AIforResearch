"""PDF -> text per page with pypdfium2 and optional local OCR for sparse/scanned pages.

Run as a subprocess (`python -m writeorbit_convert.pdftext <file.pdf>`) so that a PDF which hangs
or crashes PDFium can be timed out and killed like a LibreOffice conversion. Prints JSON on
stdout; exit code 3 = password-protected, 2 = not a readable PDF.
"""

from __future__ import annotations

import json
import sys
import time
from typing import Optional
from . import config, ocr

EXIT_UNREADABLE = 2
EXIT_PASSWORD = 3
# pypdfium2's error code for a document that needs a password (FPDF_ERR_PASSWORD).
PDFIUM_ERR_PASSWORD = 4


def _clean(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "").replace("￾", "").replace("￿", "")


def image_coverage(page) -> float:
    """Share of the page covered by image objects (0-1). Unknown structure counts as fully covered."""
    try:
        import pypdfium2.raw as pdfium_c

        width, height = page.get_size()
        if width <= 0 or height <= 0:
            return 0.0
        covered = 0.0
        for item in page.get_objects(filter=[pdfium_c.FPDF_PAGEOBJ_IMAGE], max_depth=4):
            left, bottom, right, top = item.get_pos()
            covered += max(0.0, min(right, width) - max(left, 0.0)) * max(0.0, min(top, height) - max(bottom, 0.0))
        return min(1.0, covered / (width * height))
    except Exception:
        return 1.0


def extract(path: str, ocr_languages: str | None = None) -> dict:
    import pypdfium2 as pdfium

    document = pdfium.PdfDocument(path)
    started = time.monotonic()
    languages, language_warning = ocr.selected_languages(ocr_languages)
    ocr_attempted = 0
    warnings = []
    try:
        metadata = {key: value for key, value in (document.get_metadata_dict(skip_empty=True) or {}).items()
                    if isinstance(value, str)}
        pages = []
        for index in range(len(document)):
            page = document[index]
            try:
                textpage = page.get_textpage()
                try:
                    text = textpage.get_text_bounded()
                finally:
                    textpage.close()
                text = _clean(text or "")
                method = "native" if text.strip() else "empty"
                warning = None
                sparse = len(text.strip()) < config.OCR_TEXT_THRESHOLD
                if sparse and image_coverage(page) < config.OCR_MIN_IMAGE_COVERAGE:
                    # Blank, divider or vector-figure pages: there is no scanned image to read.
                    if not text.strip():
                        method = "blank"
                elif sparse:
                    remaining = config.OCR_BUDGET_SECONDS - (time.monotonic() - started)
                    if not languages:
                        warning = language_warning
                    elif ocr_attempted >= config.OCR_MAX_PAGES or remaining < 1:
                        warning = "Scanned-page recognition reached its processing limit."
                    else:
                        ocr_attempted += 1
                        try:
                            recognised = _clean(ocr.page_text(page, languages, min(config.OCR_PAGE_TIMEOUT, remaining)))
                            if len(recognised.strip()) > len(text.strip()):
                                text, method = recognised, "ocr"
                            else:
                                warning = "Scanned-page recognition found no additional readable text."
                        except Exception:
                            warning = "Scanned-page recognition did not complete for this page."
                if warning:
                    warnings.append(f"Page {index + 1}: {warning}")
                pages.append({"page": index + 1, "text": text, "method": method,
                              "needs_review": method == "ocr" or bool(warning), "warning": warning})
            finally:
                page.close()
    finally:
        document.close()
    title: Optional[str] = (metadata.get("Title") or "").strip() or None
    blank = [page["page"] for page in pages if page["method"] == "blank"]
    missing = [page["page"] for page in pages if not page["text"].strip() and page["method"] != "blank"]
    recognised = [page["page"] for page in pages if page["method"] == "ocr"]
    if recognised:
        warnings.insert(0, "Some pages were read with OCR. Check quotations, numbers, tables and reading order against the PDF.")
    return {"pages": pages, "page_count": len(pages), "title": title, "metadata": metadata,
            "warnings": warnings, "extraction": {
            "status": "empty" if len(missing) + len(blank) == len(pages) else "partial" if missing else "complete",
            "ocr_pages": recognised, "pages_without_text": missing, "blank_pages": blank, "ocr_languages": languages,
            "requires_review": bool(warnings) or bool(recognised) or bool(missing)}}


def main(argv: list) -> int:
    import pypdfium2 as pdfium

    try:
        result = extract(argv[1], argv[2] if len(argv) > 2 else None)
    except pdfium.PdfiumError as exc:
        return EXIT_PASSWORD if getattr(exc, "err_code", None) == PDFIUM_ERR_PASSWORD else EXIT_UNREADABLE
    sys.stdout.write(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
