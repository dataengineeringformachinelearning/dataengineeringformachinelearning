"""
Attach a correlation ID to every HTTP request for traceability.

Clients may send X-Correlation-ID; otherwise a UUID is generated. The ID is
returned on the response and stored in structured_log.correlation_id_var.
"""

from __future__ import annotations

import uuid

from utils.structured_log import set_correlation_id

CORRELATION_HEADER = "X-Correlation-ID"


class CorrelationIdMiddleware:
  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    incoming = request.headers.get(CORRELATION_HEADER, "").strip()
    correlation_id = incoming or str(uuid.uuid4())
    request.correlation_id = correlation_id
    set_correlation_id(correlation_id)

    response = self.get_response(request)
    response[CORRELATION_HEADER] = correlation_id
    return response
