"""Tests for correlation ID middleware."""

from config.correlation_middleware import CORRELATION_HEADER, CorrelationIdMiddleware


def test_generates_correlation_id_when_missing():
  def get_response(request):
    from django.http import HttpResponse

    return HttpResponse("ok")

  middleware = CorrelationIdMiddleware(get_response)
  from django.test import RequestFactory

  request = RequestFactory().get("/api/v1/health")
  response = middleware(request)

  assert hasattr(request, "correlation_id")
  assert len(request.correlation_id) > 0
  assert response[CORRELATION_HEADER] == request.correlation_id


def test_preserves_incoming_correlation_id():
  def get_response(request):
    from django.http import HttpResponse

    return HttpResponse("ok")

  middleware = CorrelationIdMiddleware(get_response)
  from django.test import RequestFactory

  request = RequestFactory().get("/api/v1/health", HTTP_X_CORRELATION_ID="client-trace-99")
  response = middleware(request)

  assert request.correlation_id == "client-trace-99"
  assert response[CORRELATION_HEADER] == "client-trace-99"
