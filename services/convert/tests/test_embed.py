"""POST /embed: Library search vectors from the baked-in model."""

import math

import pytest

from writeorbit_convert import config, embeddings

needs_embeddings = pytest.mark.skipif(not embeddings.available(), reason="fastembed is not installed here")


def test_embed_validates_the_request(client):
    assert client.post("/embed", json={"texts": []}).status_code == 422
    assert client.post("/embed", json={"texts": ["a"], "kind": "other"}).status_code == 422
    too_many = ["a"] * (config.MAX_EMBED_TEXTS + 1)
    assert client.post("/embed", json={"texts": too_many}).status_code == 422


def test_embed_without_fastembed_answers_501(client, monkeypatch):
    monkeypatch.setattr(embeddings, "available", lambda: False)
    response = client.post("/embed", json={"texts": ["a"]})
    assert response.status_code == 501


@needs_embeddings
def test_a_search_query_does_not_wait_for_a_whole_upload():
    import threading
    import time

    embeddings.embed(["warm up"], "query")
    passages = ["Sleep deprivation impairs memory consolidation in the hippocampus. " * 25] * 96
    finished = {}

    def upload():
        embeddings.embed(passages, "passage")
        finished["upload"] = time.monotonic()

    thread = threading.Thread(target=upload)
    thread.start()
    time.sleep(0.3)  # the upload is under way
    embeddings.embed(["How does lack of sleep affect remembering?"], "query")
    finished["query"] = time.monotonic()
    thread.join()
    assert finished["query"] < finished["upload"]


@needs_embeddings
def test_embed_returns_normalised_384_dimension_vectors_by_meaning(client):
    passages = [
        "Sleep deprivation impairs memory consolidation in the hippocampus.",
        "The central bank raised interest rates to curb inflation.",
    ]
    response = client.post("/embed", json={"texts": passages + [""], "kind": "passage"})
    assert response.status_code == 200
    body = response.json()
    assert body["model"] == config.EMBED_MODEL and body["dimensions"] == 384
    assert len(body["vectors"]) == 3
    for vector in body["vectors"]:
        assert len(vector) == 384
        assert math.isclose(math.sqrt(sum(value * value for value in vector)), 1.0, rel_tol=1e-3)

    query = client.post("/embed", json={"texts": ["How does lack of sleep affect remembering?"], "kind": "query"}).json()["vectors"][0]
    sleep, money = (sum(a * b for a, b in zip(query, vector)) for vector in body["vectors"][:2])
    assert sleep > money
