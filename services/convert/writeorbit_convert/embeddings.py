"""Text embeddings for Library search (POST /embed): a small open model run on this service's CPU
with fastembed (ONNX Runtime), so search by meaning costs no per-token fees.

The model loads once per process on first use (the image bakes its files in, so nothing is
downloaded at run time) and is shared by all requests; ONNX Runtime releases the GIL while it runs.

The model runs one small slice at a time, and a waiting search query goes before the next slice of
stored passages: a query never waits behind a whole upload, only behind the slice in progress.
"""

from __future__ import annotations

import threading
from typing import Any, List

from . import config

_model: Any = None
_load_lock = threading.Lock()

# The model's turn: one slice at a time, queries first.
_turn = threading.Condition()
_busy = False
_queries_waiting = 0


class EmbeddingsUnavailable(Exception):
    """fastembed is not installed (an image built with WITH_EMBEDDINGS=0) or the model failed to load."""


def available() -> bool:
    try:
        import fastembed  # noqa: F401
    except ImportError:
        return False
    return True


def _get_model() -> Any:
    global _model
    if _model is not None:
        return _model
    with _load_lock:
        if _model is None:
            try:
                from fastembed import TextEmbedding
            except ImportError as exc:
                raise EmbeddingsUnavailable("Embeddings are not installed in this converter image.") from exc
            try:
                _model = TextEmbedding(
                    model_name=config.EMBED_MODEL,
                    cache_dir=config.EMBED_CACHE_DIR or None,
                    threads=config.EMBED_THREADS or None,
                )
            except Exception as exc:  # unknown model name, missing files and no network…
                raise EmbeddingsUnavailable(f"The embedding model could not be loaded: {exc}") from exc
    return _model


def _take_turn(query: bool) -> None:
    global _busy, _queries_waiting
    with _turn:
        if query:
            _queries_waiting += 1
        try:
            while _busy or (not query and _queries_waiting):
                _turn.wait()
        finally:
            if query:
                _queries_waiting -= 1
        _busy = True


def _end_turn() -> None:
    global _busy
    with _turn:
        _busy = False
        _turn.notify_all()


def embed(texts: List[str], kind: str) -> List[List[float]]:
    """Normalised vectors for `texts`, in order. `kind` is "query" (a search) or "passage" (stored text)."""
    model = _get_model()
    query = kind == "query"
    run = model.query_embed if query else model.passage_embed
    size = max(1, config.EMBED_BATCH)
    vectors: List[List[float]] = []
    for start in range(0, len(texts), size):
        _take_turn(query)
        try:
            vectors.extend(vector.tolist() for vector in run(texts[start:start + size], batch_size=size))
        finally:
            _end_turn()
    return vectors


def warm() -> None:
    """Loads the model ahead of the first request; failures surface on that request instead."""
    try:
        _get_model()
    except EmbeddingsUnavailable:
        pass
