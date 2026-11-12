"""OCR uses a mocked engine; PDF parsing/page anchors use real text and empty-page fixtures."""
import subprocess

import pytest

from test_service import tiny_pdf
from writeorbit_convert import config, ocr, pdftext


@pytest.fixture
def engine(monkeypatch):
    monkeypatch.setattr(ocr, "capabilities", lambda: {"available": True, "languages": ["eng", "ara", "jpn"], "default_languages": ["eng"]})
    monkeypatch.setattr(config, "OCR_MAX_PAGES", 40)
    monkeypatch.setattr(config, "OCR_TEXT_THRESHOLD", 20)
    monkeypatch.setattr(config, "OCR_BUDGET_SECONDS", 80)
    # The fixture pages are text-only; treat empty ones as full-page scans.
    monkeypatch.setattr(pdftext, "image_coverage", lambda _page: 1.0)


def document(tmp_path, pages):
    path = tmp_path / "source.pdf"
    path.write_bytes(tiny_pdf(pages, title="Source document"))
    return str(path)


def test_native_text_does_not_need_ocr(tmp_path, monkeypatch, engine):
    def fail(*_args):
        raise AssertionError("Native text must not be replaced by OCR")
    monkeypatch.setattr(ocr, "page_text", fail)
    result = pdftext.extract(document(tmp_path, ["Original native text with enough words to read."]))
    assert result["pages"][0]["method"] == "native"
    assert "Original native text" in result["pages"][0]["text"]
    assert result["extraction"]["status"] == "complete"
    assert not result["warnings"]


def test_mixed_pdf_retains_original_page_anchors_and_ocr_language(tmp_path, monkeypatch, engine):
    requested = []
    def recognise(page, languages, timeout):
        requested.append(languages)
        assert timeout > 0
        return "نص من الصفحة الممسوحة ضوئيا"
    monkeypatch.setattr(ocr, "page_text", recognise)
    result = pdftext.extract(document(tmp_path, ["Native text remains available on this page.", ""]), "ara")
    assert [page["page"] for page in result["pages"]] == [1, 2]
    assert [page["method"] for page in result["pages"]] == ["native", "ocr"]
    assert result["extraction"]["ocr_pages"] == [2]
    assert result["extraction"]["requires_review"] is True
    assert result["pages"][1]["text"].startswith("نص")
    assert requested == [["ara"]]


def test_unavailable_engine_retains_native_text_and_reports_unread_pages(tmp_path, monkeypatch):
    monkeypatch.setattr(ocr, "capabilities", lambda: {"available": False, "languages": [], "default_languages": [], "warning": "OCR unavailable"})
    monkeypatch.setattr(pdftext, "image_coverage", lambda _page: 1.0)
    result = pdftext.extract(document(tmp_path, ["Native text is preserved without an OCR engine.", ""]))
    assert result["pages"][0]["method"] == "native"
    assert result["pages"][1]["text"] == ""
    assert result["extraction"]["pages_without_text"] == [2]
    assert result["extraction"]["status"] == "partial"
    assert "Page 2: OCR unavailable" in result["warnings"]


def test_missing_language_is_not_silently_replaced_with_english(tmp_path, monkeypatch, engine):
    def fail(*_args):
        raise AssertionError("Do not recognise in the wrong language")
    monkeypatch.setattr(ocr, "page_text", fail)
    result = pdftext.extract(document(tmp_path, [""]), "hin")
    assert result["extraction"]["status"] == "empty"
    assert "hin" in result["warnings"][0]


def test_page_limit_leaves_explicit_partial_result(tmp_path, monkeypatch, engine):
    monkeypatch.setattr(config, "OCR_MAX_PAGES", 1)
    monkeypatch.setattr(ocr, "page_text", lambda *_args: "Recognised source text.")
    result = pdftext.extract(document(tmp_path, ["", ""]))
    assert result["extraction"]["ocr_pages"] == [1]
    assert result["extraction"]["pages_without_text"] == [2]
    assert "processing limit" in result["pages"][1]["warning"]


def test_timeout_does_not_drop_a_page(tmp_path, monkeypatch, engine):
    def timeout(*_args):
        raise subprocess.TimeoutExpired("tesseract", 1)
    monkeypatch.setattr(ocr, "page_text", timeout)
    result = pdftext.extract(document(tmp_path, ["", "Native text on the next page is still preserved."]))
    assert len(result["pages"]) == 2
    assert result["pages"][0]["warning"]
    assert result["pages"][1]["method"] == "native"


@pytest.mark.parametrize("value", ["../eng", "eng;curl", "--help", "eng/../../x", "+".join(["eng"] * 9)])
def test_language_options_cannot_be_paths_or_commands(value):
    with pytest.raises(ValueError):
        ocr.language_codes(value)


def test_script_language_packs_and_multiple_languages_are_supported():
    assert ocr.language_codes("jpn+eng,jpn") == ["jpn", "eng"]
    assert ocr.language_codes("script/Devanagari") == ["script/Devanagari"]


def test_blank_pages_without_images_are_not_sent_to_ocr(tmp_path, monkeypatch, engine):
    monkeypatch.setattr(pdftext, "image_coverage", lambda _page: 0.0)
    def fail(*_args):
        raise AssertionError("A blank page has nothing to recognise")
    monkeypatch.setattr(ocr, "page_text", fail)
    result = pdftext.extract(document(tmp_path, ["Native text with enough words to read here.", ""]))
    assert [page["method"] for page in result["pages"]] == ["native", "blank"]
    assert result["extraction"]["blank_pages"] == [2]
    assert result["extraction"]["pages_without_text"] == []
    assert result["extraction"]["status"] == "complete"
    assert not result["warnings"]


def test_text_pages_have_no_image_coverage(tmp_path):
    import pypdfium2 as pdfium
    document_ = pdfium.PdfDocument(document(tmp_path, ["Plain text page."]))
    try:
        assert pdftext.image_coverage(document_[0]) == 0.0
    finally:
        document_.close()
