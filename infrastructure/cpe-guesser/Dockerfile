FROM python:3.11-slim-bookworm AS builder

ARG CPE_GUESSER_REF=b5fa6aac1c6d632141c9406989cc0ecf85d092e5

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN git clone https://github.com/vulnerability-lookup/cpe-guesser.git . \
    && git checkout "$CPE_GUESSER_REF"
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r REQUIREMENTS

FROM python:3.11-slim-bookworm
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/opt/venv/lib/python3.11/site-packages" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /src /app
COPY infrastructure/cpe-guesser/import-index.sh /usr/local/bin/import-cpe-index
RUN groupadd --gid 10001 cpe \
    && useradd --uid 10001 --gid cpe --no-create-home --shell /usr/sbin/nologin cpe \
    && mkdir -p /app/data \
    && chown -R cpe:cpe /app /usr/local/bin/import-cpe-index \
    && chmod 0555 /usr/local/bin/import-cpe-index
USER cpe
ENTRYPOINT ["/usr/local/bin/import-cpe-index"]
