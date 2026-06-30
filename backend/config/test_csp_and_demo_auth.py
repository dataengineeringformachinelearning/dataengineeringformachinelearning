import asyncio
from types import SimpleNamespace
from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.test import Client
from integrations.constants import SWAGGER_DEMO_API_KEY

User = get_user_model()


@pytest.mark.django_db
def test_demo_api_key_authentication(client: Client) -> None:
  # Verify that the demo API key authenticates the demo user successfully
  # and grants them Operator role permissions.
  response = client.post(
    "/api/v1/ingest",
    data={"batch_id": "test-batch", "records": []},
    content_type="application/json",
    HTTP_AUTHORIZATION=f"Bearer {SWAGGER_DEMO_API_KEY}",
  )
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert data["processed_records"] == 0

  # Check that the demo_user is persisted
  demo_user = User.objects.filter(username="demo_user").first()
  assert demo_user is not None
  assert demo_user.email == "demo@deml.app"
  assert demo_user.profile.role == "Operator"


@pytest.mark.django_db
def test_csp_and_security_headers_middleware(client: Client) -> None:
  # Check if text/html responses include the security headers injected by ContentSecurityPolicyMiddleware
  response = client.get("/api/v1/docs")
  assert response.status_code == 200

  # Verify CSP and security headers
  assert "Content-Security-Policy" in response
  assert "X-Frame-Options" in response
  assert "X-Content-Type-Options" in response
  assert "X-XSS-Protection" in response
  assert "Referrer-Policy" in response
  assert "Permissions-Policy" in response

  assert response["X-Frame-Options"] == "SAMEORIGIN"
  assert response["X-Content-Type-Options"] == "nosniff"
  assert "default-src 'self'" in response["Content-Security-Policy"]


class FakeRedisPipeline:
  def __init__(self) -> None:
    self.count = 0

  def zremrangebyscore(self, key: str, minimum: int | float, maximum: int | float) -> None:
    return None

  def zcard(self, key: str) -> None:
    return None

  def zadd(self, key: str, values: dict[str, int | float]) -> None:
    self.count += 1

  def expire(self, key: str, seconds: int) -> None:
    return None

  def execute(self) -> list[int]:
    return [0, self.count - 1, 1, 1]


class FakeRedis:
  def __init__(self) -> None:
    self.pipeline_instance = FakeRedisPipeline()

  def pipeline(self) -> FakeRedisPipeline:
    return self.pipeline_instance


@pytest.mark.django_db
def test_swagger_demo_key_has_strict_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
  from utils import rate_limit as rate_limit_module

  monkeypatch.setattr(rate_limit_module, "redis_client", FakeRedis())

  @rate_limit_module.rate_limit()
  async def protected_endpoint(request: Any) -> JsonResponse:
    return JsonResponse({"ok": True})

  request = SimpleNamespace(
    META={"REMOTE_ADDR": "203.0.113.10"},
    auth=User(username="demo_user"),
    deml_is_swagger_demo_key=True,
  )

  async def call_endpoint() -> list[int]:
    endpoint = protected_endpoint
    responses = [
      await endpoint(request),
      await endpoint(request),
      await endpoint(request),
      await endpoint(request),
      await endpoint(request),
      await endpoint(request),
    ]
    return [response.status_code for response in responses]

  assert asyncio.run(call_endpoint()) == [200, 200, 200, 200, 200, 429]
