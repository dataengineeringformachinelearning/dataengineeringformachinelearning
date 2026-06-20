import hashlib

from django.core.exceptions import ObjectDoesNotExist
from monitor.models import APIKey
from ninja.security import APIKeyHeader, HttpBearer


class IntegrationAPIKeyAuth(HttpBearer):
  def authenticate(self, request, token):
    # We handle Bearer <token> here
    if not token:
      return None

    try:
      # We look for a key matching the hash of the token
      token_hash = hashlib.sha256(token.encode()).hexdigest()
      api_key = APIKey.objects.get(key_hash=token_hash, is_active=True)
      return api_key.user
    except ObjectDoesNotExist:
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
