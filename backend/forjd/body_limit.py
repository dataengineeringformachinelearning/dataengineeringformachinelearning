"""Endpoint-scoped request cap for DEML's FORJD ingest adapters."""

from __future__ import annotations

from collections.abc import Callable
from io import BytesIO

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils.deprecation import MiddlewareMixin

from forjd.limits import INGEST_WRITE_PATHS, MAX_INGEST_BODY_BYTES


class IngestBodyError(RuntimeError):
  def __init__(self, status: int, detail: str) -> None:
    super().__init__(detail)
    self.status = status
    self.detail = detail


def read_limited_ingest_body(request: HttpRequest) -> bytes:
  """Buffer at most the FORJD contract limit and replay it downstream."""
  raw_content_length = request.META.get("CONTENT_LENGTH")
  if raw_content_length not in (None, ""):
    try:
      content_length = int(str(raw_content_length))
    except (TypeError, ValueError) as exc:
      raise IngestBodyError(400, "Invalid Content-Length") from exc
    if content_length < 0:
      raise IngestBodyError(400, "Invalid Content-Length")
    if content_length > MAX_INGEST_BODY_BYTES:
      raise IngestBodyError(413, "Ingest request body exceeds the hard byte limit")

  if hasattr(request, "_body"):
    body = request._body
  else:
    chunks: list[bytes] = []
    remaining = MAX_INGEST_BODY_BYTES + 1
    try:
      while remaining > 0:
        chunk = request.read(min(64 * 1024, remaining))
        if not chunk:
          break
        chunks.append(chunk)
        remaining -= len(chunk)
    except OSError as exc:
      raise IngestBodyError(400, "Unable to read ingest request body") from exc
    body = b"".join(chunks)
    request._body = body
    request._stream = BytesIO(body)

  if len(body) > MAX_INGEST_BODY_BYTES:
    raise IngestBodyError(413, "Ingest request body exceeds the hard byte limit")
  return body


def ingest_body_error_response(exc: IngestBodyError) -> JsonResponse:
  if exc.status == 413:
    response = JsonResponse(
      {
        "detail": exc.detail,
        "code": "ingest_body_too_large",
        "limit_bytes": MAX_INGEST_BODY_BYTES,
      },
      status=413,
    )
    response["X-Max-Body-Bytes"] = str(MAX_INGEST_BODY_BYTES)
    return response
  return JsonResponse({"detail": exc.detail}, status=exc.status)


class ForjdIngestBodyLimitMiddleware(MiddlewareMixin):
  """Apply the 8 MiB contract only to exact FORJD ingest write paths."""

  def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
    super().__init__(get_response)

  def process_request(self, request: HttpRequest) -> JsonResponse | None:
    normalized_path = request.path.rstrip("/") or "/"
    if request.method != "POST" or normalized_path not in INGEST_WRITE_PATHS:
      return None
    try:
      read_limited_ingest_body(request)
    except IngestBodyError as exc:
      return ingest_body_error_response(exc)
    return None
