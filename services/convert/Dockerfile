# writeorbit-convert: Word/PDF/LaTeX converter for the WriteOrbit editor (internal service, port 4100).
FROM python:3.12-slim-bookworm

# 1 (default) also installs pytest so the test suite can run in the image; 0 for a lean image.
ARG WITH_TESTS=1
# 1 (default) adds POST /embed for Library search: fastembed + a small model (~67 MB) baked in.
ARG WITH_EMBEDDINGS=1
ARG EMBED_MODEL=BAAI/bge-small-en-v1.5

ENV CONVERT_EMBED_MODEL=${EMBED_MODEL} \
    CONVERT_EMBED_CACHE_DIR=/opt/models

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# LibreOffice (Writer for .doc/.odt/.rtf and PDF, Draw for EMF/WMF images, Math so equations
# appear in PDFs: without it LibreOffice drops Word's OMML equations) without a GUI, and
# fonts metric-compatible with Word's defaults: Liberation = Times New Roman/Arial/Courier New,
# Carlito = Calibri, Caladea = Cambria.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-writer-nogui libreoffice-draw-nogui libreoffice-math-nogui \
      fonts-liberation fonts-liberation2 fonts-dejavu-core fonts-crosextra-carlito fonts-crosextra-caladea \
 && rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home --uid 10001 --home-dir /home/convert --shell /usr/sbin/nologin convert

WORKDIR /app
COPY requirements.txt requirements-dev.txt requirements-embed.txt ./
RUN pip install -r requirements.txt \
 && if [ "$WITH_TESTS" = "1" ]; then pip install -r requirements-dev.txt; fi
# Download the model at build time, so containers start without fetching it.
RUN if [ "$WITH_EMBEDDINGS" = "1" ]; then \
      pip install -r requirements-embed.txt \
      && python -c "from fastembed import TextEmbedding; m = TextEmbedding('${EMBED_MODEL}', cache_dir='/opt/models'); print('embedding dims', len(next(iter(m.embed(['ok'])))))" \
      && chmod -R a+rX /opt/models; \
    fi
# Run time never reaches the Hugging Face Hub (internal ingress; the model is already here).
ENV HF_HUB_OFFLINE=1

COPY pytest.ini ./
COPY writeorbit_convert ./writeorbit_convert
COPY tests ./tests

USER convert
EXPOSE 4100
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4100/health', timeout=4)"
CMD ["uvicorn", "writeorbit_convert.app:app", "--host", "0.0.0.0", "--port", "4100", "--timeout-graceful-shutdown", "30"]
