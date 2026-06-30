import hashlib

from asgiref.sync import sync_to_async
from django.core.exceptions import ObjectDoesNotExist
from monitor.models import APIKey
from ninja.security import APIKeyHeader, HttpBearer

from .constants import SWAGGER_DEMO_API_KEY


class IntegrationAPIKeyAuth(HttpBearer):
  async def authenticate(self, request, token: str | None):
    # We handle Bearer <token> here
    if not token:
      return None

    if token == SWAGGER_DEMO_API_KEY:
      from django.contrib.auth.models import User
      from monitor.models import UserProfile

      @sync_to_async
      def get_or_create_demo_user() -> User:
        user, _ = User.objects.get_or_create(
          username="demo_user", defaults={"email": "demo@deml.app", "first_name": "Demo User"}
        )
        UserProfile.objects.get_or_create(user=user, defaults={"role": "Operator"})
        return user

      request.deml_is_swagger_demo_key = True
      return await get_or_create_demo_user()

    try:
      # We look for a key matching the hash of the token
      token_hash = hashlib.sha256(token.encode()).hexdigest()

      @sync_to_async
      def get_api_key_user():
        try:
          api_key = APIKey.objects.select_related("user").get(key_hash=token_hash, is_active=True)
          return api_key.user
        except ObjectDoesNotExist:
          return None

      return await get_api_key_user()
    except Exception:
      return None


class APIKeyHeaderAuth(APIKeyHeader):
  param_name = "X-API-Key"

  def authenticate(self, request, key):
    if not key:
      return None

    try:
      key_hash = hashlib.sha256(key.encode()).hexdigest()
      api_key = APIKey.objects.get(key_hash=key_hash, is_active=True)
      return api_key.user
    except ObjectDoesNotExist:
      return None
