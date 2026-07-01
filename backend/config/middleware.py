import logging

from django.contrib.auth.models import AnonymousUser, User
from django.utils.deprecation import MiddlewareMixin
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
      uid = decoded_token.get("uid")
      email = decoded_token.get("email")
      name = decoded_token.get("name") or decoded_token.get("display_name", "")

      # Find or create local Django User corresponding to Firebase UID or email
      user = None
      if email:
        user = User.objects.filter(email=email).first()

      if not user:
        user = User.objects.filter(username=uid).first()

      if not user:
        user = User.objects.create(username=uid)
        user.email = email or ""
        user.first_name = name or ""
        # Set an unusable password since authentication is offloaded to Firebase
        user.set_unusable_password()
        user.save()
        logger.info(f"Created Django user for Firebase UID: {uid}")

      # Ensure user profile and role exists
      from monitor.models import UserProfile

      profile, p_created = UserProfile.objects.get_or_create(user=user)
      if p_created:
        if uid == "system" or (email and email == "admin@dataengineeringformachinelearning.com"):
          profile.role = "Security Admin"
        else:
          profile.role = "Operator"
        logger.info(f"Created user profile with role: {profile.role} for user: {user.username}")

      # Sync linked_emails
      identities = decoded_token.get("firebase", {}).get("identities", {})
      linked_emails = list(identities.get("email", []))
      if email and email not in linked_emails:
        linked_emails.append(email)

      profile_updated = False
      if set(profile.linked_emails) != set(linked_emails):
        profile.linked_emails = linked_emails
        profile_updated = True

      if p_created or profile_updated:
        profile.save()

      if not p_created:
        # Keep email and display name in sync if they changed
        updated = False
        if email and user.email != email:
          user.email = email
          updated = True
        if name and user.first_name != name:
          user.first_name = name
          updated = True
        if updated:
          user.save()

      # Authenticate the request with this user
      request.user = user
      request.firebase_token = decoded_token

    except Exception as e:
      logger.exception(f"Firebase token verification failed: {e}")
      # If token verification fails, request.user remains AnonymousUser
      pass

    return None
