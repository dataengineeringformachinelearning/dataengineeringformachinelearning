import logging

from django.contrib.auth.models import AnonymousUser
from django.utils.deprecation import MiddlewareMixin

INTERNAL_API_PREFIX = "/api/v1/internal/"


class InternalMeshMiddleware(MiddlewareMixin):
  """Allow plain-HTTP internal mesh calls without SECURE_SSL_REDIRECT."""

  def process_request(self, request):
    if request.path.startswith(INTERNAL_API_PREFIX):
      request.META["HTTP_X_FORWARDED_PROTO"] = "https"
    return None


from firebase_admin import auth
from integrations.constants import SWAGGER_DEMO_API_KEY

logger = logging.getLogger(__name__)


class FirebaseAuthenticationMiddleware(MiddlewareMixin):
  def process_request(self, request):
    request.user = AnonymousUser()
    auth_header = request.META.get("HTTP_AUTHORIZATION")
    if not auth_header:
      return None

    if not auth_header.startswith("Bearer "):
      return None

    token = auth_header.split(" ")[1]
    # Skip Firebase validation for public integration endpoints or the demo key
    if (
      request.path.startswith(("/api/v1/ingest", "/api/v1/predict"))
      or token == SWAGGER_DEMO_API_KEY
    ):
      return None

    try:
      # Verify the Firebase ID token
      from django.conf import settings

      if settings.DEBUG and (token.startswith("mock-token-") or token == "mock-system-token"):
        # Format: mock-token-uid-email
        parts = token.split("-")
        uid = parts[2] if len(parts) > 2 else "mock_user"
        email = parts[3] if len(parts) > 3 else f"{uid}@example.com"
        name = uid.capitalize()
        decoded_token = {
          "uid": uid,
          "email": email,
          "name": name,
        }
      else:
        decoded_token = auth.verify_id_token(token)
      from account.lifecycle import ensure_user_from_firebase

      user, _profile, _created = ensure_user_from_firebase(decoded_token)

      # Authenticate the request with this user
      request.user = user
      request.firebase_token = decoded_token

      session_id = request.META.get("HTTP_X_DEML_SESSION_ID")
      firebase_uid = decoded_token.get("uid")
      if session_id and firebase_uid:
        from utils.session_registry import is_session_valid, touch_session

        if not is_session_valid(session_id, firebase_uid):
          from django.http import JsonResponse

          return JsonResponse({"detail": "Session revoked or expired"}, status=401)
        touch_session(session_id)

    except Exception as e:
      logger.exception("Firebase auth verification failed (type=%s)", type(e).__name__)
      # If token verification fails, request.user remains AnonymousUser

    return None
