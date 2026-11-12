"""Optional local OCR for image-only PDF pages. No network calls or language downloads."""
from __future__ import annotations

import math
import os
import re
import shutil
import subprocess
import tempfile
from functools import lru_cache

from . import config


def language_codes(value: str | None) -> list[str]:
    codes = [part.strip() for part in re.split(r"[+,]", value or "") if part.strip()]
    if len(codes) > 8 or any(not re.fullmatch(r"[A-Za-z0-9_]+(?:/[A-Za-z0-9_]+)?", code) for code in codes):
        raise ValueError("Choose up to eight available OCR languages.")
    return list(dict.fromkeys(codes))


@lru_cache(maxsize=1)
def capabilities() -> dict:
    executable = shutil.which(config.OCR_EXECUTABLE) if config.OCR_ENABLED else None
    try:
        defaults = language_codes(config.OCR_LANGUAGES)
    except ValueError:
        defaults = []
    if not executable:
        return {"available": False, "languages": [], "default_languages": defaults,
                "warning": "Scanned-page recognition is not enabled on this server."}
    try:
        result = subprocess.run([executable, "--list-langs"], capture_output=True, timeout=10,
                                check=False, encoding="utf-8", errors="replace")
        languages = [line.strip() for line in result.stdout.splitlines()
                     if re.fullmatch(r"[A-Za-z0-9_]+(?:/[A-Za-z0-9_]+)?", line.strip()) and line.strip() != "osd"]
        if result.returncode != 0 or not languages:
            raise ValueError("No OCR language data available")
        return {"available": True, "languages": sorted(set(languages)), "default_languages": defaults}
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return {"available": False, "languages": [], "default_languages": defaults,
                "warning": "Scanned-page recognition could not load its language data."}


def selected_languages(requested: str | None = None) -> tuple[list[str], str | None]:
    info = capabilities()
    if not info["available"]:
        return [], info.get("warning")
    codes = language_codes(requested) if requested else info["default_languages"]
    if not codes:
        return [], "Choose an available OCR language before reading scanned pages."
    missing = [code for code in codes if code not in info["languages"]]
    if missing:
        return [], "OCR language data is unavailable for: " + ", ".join(missing) + "."
    return codes, None


def page_text(page, languages: list[str], timeout: float) -> str:
    """Render a bounded image and run Tesseract inside the parent PDF worker's process group."""
    executable = shutil.which(config.OCR_EXECUTABLE)
    if not executable:
        raise RuntimeError("Scanned-page recognition is unavailable.")
    width, height = page.get_size()
    if width <= 0 or height <= 0 or not math.isfinite(width * height):
        raise ValueError("Invalid PDF page size")
    scale = min(config.OCR_DPI / 72, math.sqrt(config.OCR_MAX_PIXELS / (width * height)))
    with tempfile.TemporaryDirectory(prefix="research-ocr-") as directory:
        image_path = os.path.join(directory, "page.png")
        bitmap = page.render(scale=scale)
        try:
            image = bitmap.to_pil()
            try:
                image.save(image_path, format="PNG")
            finally:
                image.close()
        finally:
            bitmap.close()
        result = subprocess.run([executable, image_path, "stdout", "-l", "+".join(languages), "--psm", "3"],
                                capture_output=True, timeout=timeout, check=False, encoding="utf-8", errors="replace",
                                env={**os.environ, "OMP_THREAD_LIMIT": "1"})
        if result.returncode:
            raise RuntimeError("Scanned-page recognition failed.")
        return result.stdout
