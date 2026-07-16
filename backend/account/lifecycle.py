"""Continuous user lifecycle: auth provisioning, Stripe/sites reconciliation, deletion."""

from __future__ import annotations

import logging
import uuid
from typing import Any
from urllib.parse import urlparse

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

LIFECYCLE_TOPIC = "user-lifecycle"
DELETION_STEPS = (
  "stripe_cancel",
  "revoke_api_keys",
  "firebase_delete",
  "export_artifacts_delete",
  "postgres_delete",
  "audit",
)


def ensure_user_from_firebase(decoded_token: dict[str, Any]) -> tuple[User, Any, bool]:
  """Provision or load Django user + profile from a verified Firebase token."""
  from monitor.models import UserProfile

  uid = decoded_token.get("uid") or ""
  email = (decoded_token.get("email") or "").strip()
  name = decoded_token.get("name") or decoded_token.get("display_name") or ""

  user: User | None = None
  if uid:
    user = User.objects.filter(username=uid).first()
  if not user and email:
    user = User.objects.filter(email__iexact=email).first()
    if user and uid and user.username != uid:
      user.username = uid
      user.save(update_fields=["username"])

  created = False
  if not user:
    user = User.objects.create(username=uid or email or f"user-{uuid.uuid4().hex[:12]}")
    user.email = email
    user.first_name = name
    user.set_unusable_password()
    user.save()
    created = True
    logger.info("lifecycle: provisioned Django user for Firebase UID %s", uid)

  profile, profile_created = UserProfile.objects.get_or_create(user=user)
  if profile_created:
    if uid == "system" or email == "admin@dataengineeringformachinelearning.com":
      profile.role = "Security Admin"
    else:
      profile.role = "Operator"
    profile.save(update_fields=["role"])
    created = True

  if not profile.account_id:
    profile.account_id = uuid.uuid4()
    profile.save(update_fields=["account_id"])

  identity_changed = sync_identity_from_token(user, profile, decoded_token)
  if identity_changed:
    created = True

  return user, profile, created


def sync_identity_from_token(user: User, profile: Any, decoded_token: dict[str, Any]) -> bool:
  """Keep email, display name, and linked_emails aligned with Firebase."""
  email = (decoded_token.get("email") or "").strip()
  name = decoded_token.get("name") or decoded_token.get("display_name") or ""
  identities = decoded_token.get("firebase", {}).get("identities", {})
  linked_emails = list(identities.get("email", []))
  if email and email not in linked_emails:
    linked_emails.append(email)

  changed = False
  if set(profile.linked_emails or []) != set(linked_emails):
    profile.linked_emails = linked_emails
    profile.save(update_fields=["linked_emails"])
    changed = True

  user_updates: list[str] = []
  if email and user.email != email:
    user.email = email
    user_updates.append("email")
  if name and user.first_name != name:
    user.first_name = name
    user_updates.append("first_name")
  uid = decoded_token.get("uid")
  if uid and user.username != uid:
    user.username = uid
    user_updates.append("username")
  if user_updates:
    user.save(update_fields=user_updates)
    changed = True

  return changed


def domain_from_url(url: str) -> str | None:
  host = urlparse(url.strip()).netloc
  return host.lower() if host else None


def ensure_validated_site_for_url(user: User, url: str) -> Any | None:
  """Register a monitored URL's host as a validated domain for telemetry/CORS."""
  from monitor.models import ValidatedSite

  domain = domain_from_url(url)
  if not domain:
    return None
  site, created = ValidatedSite.objects.get_or_create(
    user=user,
    domain=domain,
    defaults={"is_verified": True},
  )
  if created:
    logger.info("lifecycle: validated domain %s for user %s", domain, user.id)
  return site


def sync_validated_sites_from_monitored_services() -> int:
  """Backfill ValidatedSite rows from every user-owned MonitoredService URL."""
  from monitor.models import MonitoredService, ValidatedSite

  created = 0
  services = MonitoredService.objects.select_related("status_page__user").filter(
    status_page__user__isnull=False,
    status_page__is_platform=False,
  )
  for service in services:
    page = service.status_page
    domain = domain_from_url(service.url)
    if not page.user_id or not domain:
      continue
    _, was_created = ValidatedSite.objects.get_or_create(
      user=page.user,
      domain=domain,
      defaults={"is_verified": True},
    )
    if was_created:
      created += 1
  return created


def reconcile_orphan_status_pages() -> int:
  """Reassign user-owned status pages that lost user_id after migration."""
  from monitor.models import StatusPage, UserProfile

  fixed = 0
  orphans = StatusPage.objects.filter(user__isnull=True, is_platform=False)
  for page in orphans:
    candidate = (
      UserProfile.objects.select_related("user")
      .filter(user__email__icontains=page.slug.replace("-", ""))
      .first()
    )
    if candidate:
      page.user = candidate.user
      page.save(update_fields=["user"])
      fixed += 1
      logger.info("lifecycle: reassigned status page %s to user %s", page.slug, candidate.user_id)
  return fixed


def emit_lifecycle_event(event: str, account_id: uuid.UUID, payload: dict[str, Any]) -> None:
  from monitor.models import OutboxEvent

  OutboxEvent.objects.create(
    topic=LIFECYCLE_TOPIC,
    key=str(account_id),
    payload={"event": event, "account_id": str(account_id), **payload},
  )


@transaction.atomic
def request_account_deletion(user: User, firebase_uid: str | None = None) -> Any:
  """Queue and immediately attempt a full account teardown."""
  from monitor.models import UserLifecycleJob

  profile = getattr(user, "profile", None)
  account_id = profile.account_id if profile else uuid.uuid4()
  uid = firebase_uid or user.username

  job = (
    UserLifecycleJob.objects.filter(
      job_type=UserLifecycleJob.JobType.DELETION,
      user=user,
      state__in=[
        UserLifecycleJob.State.PENDING,
        UserLifecycleJob.State.RUNNING,
        UserLifecycleJob.State.FAILED,
      ],
    )
    .order_by("-created_at")
    .first()
  )
  if not job:
    job = UserLifecycleJob.objects.create(
      job_type=UserLifecycleJob.JobType.DELETION,
      user=user,
      account_id=account_id,
      firebase_uid=uid,
      user_email=user.email or "",
      state=UserLifecycleJob.State.PENDING,
    )
  emit_lifecycle_event(
    "user.deletion_requested",
    account_id,
    {"firebase_uid": uid, "user_id": user.id},
  )
  execute_deletion_job(job)
  job.refresh_from_db()
  return job


def _mark_step(job: Any, step: str) -> None:
  steps = list(job.steps_completed or [])
  if step not in steps:
    steps.append(step)
    job.steps_completed = steps
    job.save(update_fields=["steps_completed", "updated_at"])


def cancel_stripe_for_profile(profile: Any) -> None:
  try:
    import stripe
  except ImportError:
    return

  from django.conf import settings

  stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
  if not stripe.api_key or not profile.stripe_subscription_id:
    return

  try:
    stripe.Subscription.cancel(profile.stripe_subscription_id)
    profile.subscription_active = False
    profile.tier = "Standard"
    profile.stripe_subscription_id = None
    profile.save(
      update_fields=["subscription_active", "tier", "stripe_subscription_id"],
    )
  except Exception as exc:
    logger.warning("lifecycle: Stripe cancel failed for %s: %s", profile.account_id, exc)
    raise


def delete_firebase_user(firebase_uid: str) -> None:
  if not firebase_uid or firebase_uid.startswith("demo_"):
    return
  try:
    from firebase_admin import auth
    from firebase_admin.auth import UserNotFoundError

    auth.delete_user(firebase_uid)
  except UserNotFoundError:
    return
  except Exception as exc:
    logger.warning("lifecycle: Firebase delete failed for %s: %s", firebase_uid, exc)
    raise


@transaction.atomic
def delete_export_artifacts_for_user(user: User) -> int:
  """Delete every private export object before its metadata can cascade.

  RustFS ``DeleteObject`` is idempotent, so a process crash or transaction
  rollback after remote acknowledgement is safe to retry. Metadata changes and
  the final user cascade commit together; a retry may repeat an acknowledged
  delete, but it cannot lose the durable reference before the account is gone.
  """
  from monitor.models import ExportJob
  from utils.object_storage import delete_object

  deleted = 0
  # Lock every job in one statement. A generator could leave later rows
  # claimable while earlier objects are being removed.
  exports = list(
    ExportJob.objects.select_for_update()
    .filter(user=user)
    .only("id", "account_id", "object_key", "storage_uri", "status")
    .order_by("created_at", "id")
  )
  if any(export.status == ExportJob.Status.RUNNING for export in exports):
    raise RuntimeError("An export is still running; account deletion will retry after it finishes")

  cancelable_ids = [
    export.id
    for export in exports
    if export.status
    in {
      ExportJob.Status.QUEUED,
      ExportJob.Status.FAILED,
    }
  ]
  if cancelable_ids:
    ExportJob.objects.filter(id__in=cancelable_ids).update(
      status=ExportJob.Status.EXPIRED,
      next_attempt_at=None,
    )

  for export in exports:
    key = export.object_key.strip()
    storage_uri = export.storage_uri.strip()
    if not key:
      if storage_uri:
        raise RuntimeError(f"Export {export.id} has a storage URI but no durable object key")
      continue

    expected_prefix = f"accounts/{export.account_id}/exports/{export.id}/"
    if not key.startswith(expected_prefix):
      raise RuntimeError(f"Export {export.id} has an invalid account-scoped object key")

    bucket: str | None = None
    if storage_uri:
      parsed = urlparse(storage_uri)
      uri_key = parsed.path.lstrip("/")
      if parsed.scheme != "s3" or not parsed.netloc or uri_key != key:
        raise RuntimeError(f"Export {export.id} has inconsistent object storage metadata")
      bucket = parsed.netloc

    delete_object(key=key, bucket=bucket)
    cleared = ExportJob.objects.filter(
      id=export.id,
      user=user,
      object_key=key,
      storage_uri=storage_uri,
    ).update(object_key="", storage_uri="")
    if cleared == 0:
      remaining = (
        ExportJob.objects.filter(id=export.id, user=user)
        .values_list("object_key", "storage_uri")
        .first()
      )
      if remaining and any(remaining):
        raise RuntimeError(f"Export {export.id} changed during artifact deletion")
    else:
      deleted += 1

  if ExportJob.objects.filter(user=user).exclude(object_key="", storage_uri="").exists():
    raise RuntimeError("Export artifacts were created or changed during account deletion")

  return deleted


def execute_deletion_job(job: Any) -> bool:
  """Run the deletion saga for a queued job. Returns True when Postgres user is gone."""
  from monitor.models import APIKey, AuditLog, UserLifecycleJob

  if job.state == UserLifecycleJob.State.COMPLETED:
    return True

  job.state = UserLifecycleJob.State.RUNNING
  job.last_error = ""
  job.save(update_fields=["state", "last_error", "updated_at"])

  user = job.user
  if not user:
    job.state = UserLifecycleJob.State.COMPLETED
    job.completed_at = timezone.now()
    job.save(update_fields=["state", "completed_at", "updated_at"])
    return True

  try:
    profile = getattr(user, "profile", None)

    if "stripe_cancel" not in (job.steps_completed or []):
      if profile:
        try:
          cancel_stripe_for_profile(profile)
        except Exception:
          pass
      _mark_step(job, "stripe_cancel")

    if "revoke_api_keys" not in (job.steps_completed or []):
      APIKey.objects.filter(user=user, is_active=True).update(is_active=False)
      _mark_step(job, "revoke_api_keys")

    if "firebase_delete" not in (job.steps_completed or []):
      try:
        delete_firebase_user(job.firebase_uid)
      except Exception:
        pass
      _mark_step(job, "firebase_delete")

    if "postgres_delete" not in (job.steps_completed or []):
      # Export creation takes this same user-row lock. Holding it through the
      # final object sweep and user cascade closes the only race that could
      # otherwise create an object after cleanup and orphan it in RustFS.
      with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        deleted_exports = delete_export_artifacts_for_user(locked_user)
        logger.info(
          "lifecycle: deleted %s export artifact(s) for account %s",
          deleted_exports,
          job.account_id,
        )
        _mark_step(job, "export_artifacts_delete")

        locked_user.delete()
        job.user_id = None
        steps = list(job.steps_completed or [])
        if "postgres_delete" not in steps:
          steps.append("postgres_delete")
        job.steps_completed = steps
        job.save(update_fields=["user", "steps_completed", "updated_at"])

    if "audit" not in (job.steps_completed or []):
      AuditLog.objects.create(
        user=None,
        action="ACCOUNT_DELETED",
        resource_id=str(job.account_id),
        details={
          "email": job.user_email,
          "job_id": str(job.id),
          "firebase_uid": job.firebase_uid,
        },
      )
      _mark_step(job, "audit")

    emit_lifecycle_event(
      "user.deleted",
      job.account_id,
      {"job_id": str(job.id), "email": job.user_email},
    )
    job.state = UserLifecycleJob.State.COMPLETED
    job.completed_at = timezone.now()
    job.save(update_fields=["state", "completed_at", "updated_at"])
    return True

  except Exception as exc:
    logger.exception("lifecycle: deletion job %s failed", job.id)
    job.state = UserLifecycleJob.State.FAILED
    job.last_error = str(exc)[:2000]
    job.save(update_fields=["state", "last_error", "updated_at"])
    return False

  return job.state == UserLifecycleJob.State.COMPLETED


def process_pending_lifecycle_jobs(limit: int = 20) -> int:
  from monitor.models import UserLifecycleJob

  processed = 0
  pending = UserLifecycleJob.objects.filter(
    job_type=UserLifecycleJob.JobType.DELETION,
    state__in=[UserLifecycleJob.State.PENDING, UserLifecycleJob.State.FAILED],
  ).order_by("created_at")[:limit]

  for job in pending:
    if execute_deletion_job(job):
      processed += 1
  return processed


def reconcile_all_accounts() -> dict[str, int]:
  """Scheduled sweep: sites, validated domains, Stripe, and pending deletions."""
  from django.core.management import call_command as django_call_command

  stats = {
    "orphan_pages_fixed": reconcile_orphan_status_pages(),
    "validated_sites_synced": sync_validated_sites_from_monitored_services(),
    "deletions_processed": process_pending_lifecycle_jobs(),
  }
  django_call_command("sync_subscriptions")
  stats["stripe_synced"] = 1
  logger.info("lifecycle: reconcile complete — %s", stats)
  return stats
