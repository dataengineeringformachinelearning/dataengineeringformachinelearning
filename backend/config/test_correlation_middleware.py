"""Tests for correlation ID middleware."""

from django.http import HttpResponse
from django.test import RequestFactory

from config.correlation_middleware import (
  CORRELATION_HEADER,
  REQUEST_ID_HEADER,
  CorrelationIdMiddleware,
)


def test_generates_correlation_id_when_missing():
  def get_response(request):
    return HttpResponse("ok")

  middleware = CorrelationIdMiddleware(get_response)
  request = RequestFactory().get("/api/v1/health")
  response = middleware(request)

  assert hasattr(request, "correlation_id")
  assert len(request.correlation_id) > 0
  assert response[CORRELATION_HEADER] == request.correlation_id
  assert response[REQUEST_ID_HEADER] == request.correlation_id


def test_preserves_incoming_correlation_id():
  def get_response(request):
    return HttpResponse("ok")

  middleware = CorrelationIdMiddleware(get_response)
  request = RequestFactory().get("/api/v1/health", HTTP_X_CORRELATION_ID="client-trace-99")
  response = middleware(request)

  assert request.correlation_id == "client-trace-99"
  assert response[CORRELATION_HEADER] == "client-trace-99"


def test_request_id_is_preferred_for_end_to_end_forjd_trace():
  request = RequestFactory().get(
    "/api/v1/health",
    HTTP_X_REQUEST_ID="deml-request-1234",
    HTTP_X_CORRELATION_ID="legacy-correlation-1234",
  )
  middleware = CorrelationIdMiddleware(lambda _request: HttpResponse("ok"))

  response = middleware(request)

  assert request.correlation_id == "deml-request-1234"
  assert response[REQUEST_ID_HEADER] == "deml-request-1234"


def test_replaces_unsafe_request_id_instead_of_echoing_it():
  request = RequestFactory().get(
    "/api/v1/health",
    HTTP_X_REQUEST_ID="unsafe\r\nx-injected: yes",
  )
  middleware = CorrelationIdMiddleware(lambda _request: HttpResponse("ok"))

  response = middleware(request)

  assert request.correlation_id != "unsafe\r\nx-injected: yes"
  assert response[REQUEST_ID_HEADER] == request.correlation_id
