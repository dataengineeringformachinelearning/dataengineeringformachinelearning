"""Signals limited to user-profile provisioning."""

from corsheaders.signals import check_request_enabled
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from monitor.models import UserProfile

User = get_user_model()


@receiver(check_request_enabled)
def allow_registered_domain(
  sender: object,
  request: object,
  **kwargs: object,
) -> bool:
  """Authorize verified customer origins through the database registry."""
  del sender, kwargs
  origin = getattr(request, "META", {}).get("HTTP_ORIGIN", "")
  from monitor.cors_utils import is_domain_registered

  return is_domain_registered(str(origin))


@receiver(post_save, sender=User)
def ensure_user_profile(
  sender: type[User], instance: User, created: bool, **kwargs: object
) -> None:
  if created:
    UserProfile.objects.get_or_create(user=instance)
