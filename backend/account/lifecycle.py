"""Firebase-backed user provisioning and FORJD-aware account deletion."""

from __future__ import annotations

import logging
import uuid
from typing import Any, Final

from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from django.utils import timezone
from monitor.models import APIKey, AuditLog, ForjdTenantMapping, UserLifecycleJob, UserProfile

logger = logging.getLogger(__name__)

FORJD_TENANT_ERASE_BLOCKER: Final[str] = (
  "Account deletion is blocked: FORJD durable tenant erasure failed or is unavailable. "
  "Firebase and Django identities remain intact."
)


def ensure_user_from_firebase(decoded_token: dict[str, Any]) -> tuple[User, UserProfile, bool]:
  uid = str(decoded_token.get("uid") or "")
  email = str(decoded_token.get("email") or "").strip()
  name = str(decoded_token.get("name") or decoded_token.get("display_name") or "")

  user = User.objects.filter(username=uid).first() if uid else None
  if user is None and email:
    user = User.objects.filter(email__iexact=email).first()

  created = user is None
  if user is None:
    user = User.objects.create(username=uid or email or f"user-{uuid.uuid4().hex[:12]}")
    user.set_unusable_password()

  user.email = email
  user.first_name = name
  if uid:
    user.username = uid
  user.save()

  profile, profile_created = UserProfile.objects.get_or_create(user=user)
  identities = decoded_token.get("firebase", {}).get("identities", {})
  linked_emails = list(identities.get("email", []))
  if email and email not in linked_emails:
    linked_emails.append(email)
  profile.linked_emails = linked_emails
  profile.save(update_fields=["linked_emails"])
  return user, profile, created or profile_created


def request_account_deletion(user: User, firebase_uid: str | None = None) -> UserLifecycleJob:
  profile = user.profile
  job, _ = UserLifecycleJob.objects.get_or_create(
    user=user,
    job_type=UserLifecycleJob.JobType.DELETION,
    state__in=[UserLifecycleJob.State.PENDING, UserLifecycleJob.State.FAILED],
    defaults={
      "account_id": profile.account_id,
      "firebase_uid": firebase_uid or user.username,
      "user_email": user.email or "",
    },
  )
  execute_deletion_job(job)
  job.refresh_from_db()
  return job


def _erase_forjd_tenant(account_id: uuid.UUID) -> tuple[bool, str]:
  """Call FORJD erase for the mapped tenant. Returns (ok, error_detail)."""
  mapping = ForjdTenantMapping.objects.filter(
    deml_account_id=account_id,
    is_active=True,
  ).first()
  if mapping is None:
    # Already inactive / never mapped — treat as erased.
    return True, ""

  from forjd.client import ForjdClient, ForjdError
  from forjd.tenancy import ForjdTenantConfigurationError, resolve_forjd_tenant_credential

  try:
    credential = resolve_forjd_tenant_credential(account_id)
  except ForjdTenantConfigurationError as exc:
    return False, str(exc)

  client = ForjdClient(
    tenant_id=credential.tenant_id,
    service_token=credential.service_token,
  )
  try:
    async_to_sync(client.erase_tenant)(str(credential.tenant_id))
  except ForjdError as exc:
    return False, str(exc)
  except Exception as exc:
    return False, f"FORJD erase failed: {exc}"
  return True, ""


def _teardown_local_identity(job: UserLifecycleJob) -> None:
  """Cancel billing hooks, revoke local keys, delete Firebase + Django user."""
  user = job.user
  profile = user.profile
  steps = list(job.steps_completed or [])

  APIKey.objects.filter(user=user, is_active=True).update(is_active=False)
  if "api_keys_revoked" not in steps:
    steps.append("api_keys_revoked")

  # Best-effort Stripe cancel — do not block deletion if billing is already gone.
  if profile.stripe_subscription_id:
    try:
      import stripe
      from django.conf import settings

      if getattr(settings, "STRIPE_SECRET_KEY", ""):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        stripe.Subscription.cancel(profile.stripe_subscription_id)
      profile.stripe_subscription_id = ""
      profile.save(update_fields=["stripe_subscription_id"])
      if "stripe_canceled" not in steps:
        steps.append("stripe_canceled")
    except Exception as exc:
      logger.warning("Stripe cancel skipped for %s: %s", job.account_id, exc)

  firebase_uid = job.firebase_uid or user.username
  if firebase_uid:
    try:
      from firebase_admin import auth as firebase_auth

      firebase_auth.delete_user(firebase_uid)
      if "firebase_deleted" not in steps:
        steps.append("firebase_deleted")
    except Exception as exc:
      logger.warning("Firebase delete skipped for %s: %s", firebase_uid, exc)

  AuditLog.objects.create(
    user=user,
    action="ACCOUNT_DELETED",
    resource_id=str(profile.account_id),
    details={"job_id": str(job.id)},
  )
  if "audit_logged" not in steps:
    steps.append("audit_logged")

  job.steps_completed = steps
  job.save(update_fields=["steps_completed", "updated_at"])
  user.delete()


def execute_deletion_job(job: UserLifecycleJob) -> bool:
  if job.state == UserLifecycleJob.State.COMPLETED:
    return True

  steps_completed = list(job.steps_completed or [])

  # 1) Durable FORJD erase (revokes fjsvc_ + deletes tenant rows).
  erased, erase_error = _erase_forjd_tenant(job.account_id)
  if not erased:
    ForjdTenantMapping.objects.filter(deml_account_id=job.account_id).update(
      is_active=False,
      updated_at=timezone.now(),
    )
    if "forjd_calls_stopped" not in steps_completed:
      steps_completed.append("forjd_calls_stopped")
    job.state = UserLifecycleJob.State.FAILED
    job.last_error = erase_error or FORJD_TENANT_ERASE_BLOCKER
    job.completed_at = None
    job.steps_completed = steps_completed
    job.save(update_fields=["state", "last_error", "completed_at", "steps_completed", "updated_at"])
    logger.warning(
      "Account deletion blocked on FORJD erase for %s: %s",
      job.account_id,
      job.last_error,
    )
    return False

  if "forjd_erased" not in steps_completed:
    steps_completed.append("forjd_erased")
  ForjdTenantMapping.objects.filter(deml_account_id=job.account_id).update(
    is_active=False,
    updated_at=timezone.now(),
  )
  if "forjd_calls_stopped" not in steps_completed:
    steps_completed.append("forjd_calls_stopped")
  job.steps_completed = steps_completed
  job.save(update_fields=["steps_completed", "updated_at"])

  # 2) Mark complete before deleting the user (FK SET_NULL on user delete).
  job.state = UserLifecycleJob.State.COMPLETED
  job.last_error = ""
  job.completed_at = timezone.now()
  job.steps_completed = steps_completed
  job.save(update_fields=["state", "last_error", "completed_at", "steps_completed", "updated_at"])

  # 3) Local identity teardown (only after FORJD confirms erase).
  try:
    _teardown_local_identity(job)
  except Exception as exc:
    # FORJD erase already succeeded — record teardown issue but keep COMPLETED.
    job.last_error = f"Local teardown warning after FORJD erase: {exc}"
    job.user = None
    job.save(update_fields=["last_error", "user", "updated_at"])
    logger.exception("Local teardown failed for %s", job.account_id)
    return True

  logger.info("Account deletion completed for %s", job.account_id)
  return True


def process_pending_lifecycle_jobs(limit: int = 20) -> int:
  jobs = UserLifecycleJob.objects.filter(state=UserLifecycleJob.State.FAILED).order_by(
    "created_at"
  )[:limit]
  return sum(1 for job in jobs if execute_deletion_job(job))
