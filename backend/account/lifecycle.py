"""Firebase-backed user provisioning and fail-closed account deletion."""

from __future__ import annotations

import logging
import uuid
from typing import Any, Final

from django.contrib.auth.models import User
from django.utils import timezone
from monitor.models import ForjdTenantMapping, UserLifecycleJob, UserProfile

logger = logging.getLogger(__name__)

FORJD_TENANT_ERASE_BLOCKER: Final[str] = (
  "Account deletion is blocked on FORJD: durable tenant erasure is not shipped, and FORJD "
  "exposes no supported service-token revocation API. Firebase and Django identities remain "
  "intact."
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


def execute_deletion_job(job: UserLifecycleJob) -> bool:
  if job.state == UserLifecycleJob.State.COMPLETED:
    return True

  # FORJD does not yet expose a durable tenant-erase API or a supported
  # credential revocation path. Disable DEML's mapping so future calls cannot
  # resolve the credential, but do not claim that this revokes the FORJD token.
  mapping_found = ForjdTenantMapping.objects.filter(
    deml_account_id=job.account_id,
  ).update(is_active=False, updated_at=timezone.now())
  steps_completed = list(job.steps_completed or [])
  if mapping_found and "forjd_calls_stopped" not in steps_completed:
    steps_completed.append("forjd_calls_stopped")

  # Do not make a speculative DELETE request and do not begin any local
  # teardown before FORJD can confirm durable tenant erasure.
  job.state = UserLifecycleJob.State.FAILED
  job.last_error = FORJD_TENANT_ERASE_BLOCKER
  job.completed_at = None
  job.steps_completed = steps_completed
  job.save(update_fields=["state", "last_error", "completed_at", "steps_completed", "updated_at"])
  logger.warning("Account deletion blocked on FORJD tenant erase for %s", job.account_id)
  return False


def process_pending_lifecycle_jobs(limit: int = 20) -> int:
  jobs = UserLifecycleJob.objects.filter(state=UserLifecycleJob.State.FAILED).order_by(
    "created_at"
  )[:limit]
  return sum(1 for job in jobs if execute_deletion_job(job))
