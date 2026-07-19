"""
Attach a correlation ID to every HTTP request for traceability.

Clients may send X-Request-ID (preferred) or X-Correlation-ID; otherwise a UUID
is generated. The safe ID is returned in both headers and propagated to FORJD.
"""

from __future__ import annotations

import re
import uuid

from utils.structured_log import set_correlation_id

CORRELATION_HEADER = "X-Correlation-ID"
REQUEST_ID_HEADER = "X-Request-ID"
_SAFE_REQUEST_ID = re.compile(r"\A[A-Za-z0-9][A-Za-z0-9._-]{7,127}\Z")


class CorrelationIdMiddleware:
  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    incoming = (
      request.headers.get(REQUEST_ID_HEADER, "").strip()
      or request.headers.get(CORRELATION_HEADER, "").strip()
    )
    correlation_id = incoming if _SAFE_REQUEST_ID.fullmatch(incoming) else str(uuid.uuid4())
    request.correlation_id = correlation_id
    set_correlation_id(correlation_id)

    response = self.get_response(request)
    response[CORRELATION_HEADER] = correlation_id
    response[REQUEST_ID_HEADER] = correlation_id
    return response
