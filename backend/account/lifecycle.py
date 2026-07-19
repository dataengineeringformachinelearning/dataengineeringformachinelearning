"""Firebase-backed user provisioning and FORJD-aware account deletion."""

from __future__ import annotations

import logging
import uuid
from datetime import timedelta
from typing import Any, Final

from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from django.db import connection, transaction
from django.db.models import F, Q
from django.utils import timezone
from monitor.models import (
  APIKey,
  AuditLog,
  AuthHandoffToken,
  BrowserSession,
  BugReport,
  ForjdShadowReceipt,
  ForjdTenantAssociation,
  ForjdTenantMapping,
  UserLifecycleJob,
  UserProfile,
)

logger = logging.getLogger(__name__)

FORJD_TENANT_ERASE_BLOCKER: Final[str] = (
  "Account deletion is blocked: FORJD durable tenant erasure failed or is unavailable. "
  "Firebase and Django identities remain intact."
)
DELETION_JOB_LEASE: Final[timedelta] = timedelta(minutes=10)
DELETION_IN_PROGRESS: Final[str] = "Account deletion is already in progress"
LIFECYCLE_RETRY_MAX_DELAY: Final[timedelta] = timedelta(hours=6)


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


def _target_manifest(account_id: uuid.UUID) -> list[dict[str, str]]:
  """Return every retained tenant target, newest credential ref per tenant."""
  targets: dict[str, str] = {}
  for association in ForjdTenantAssociation.objects.filter(deml_account_id=account_id).order_by(
    "mapped_at"
  ):
    targets[str(association.forjd_tenant_id)] = association.service_token_secret_ref
  mapping = (
    ForjdTenantMapping.objects.select_for_update().filter(deml_account_id=account_id).first()
  )
  if mapping is not None:
    ForjdTenantAssociation.objects.get_or_create(
      deml_account_id=account_id,
      forjd_tenant_id=mapping.forjd_tenant_id,
      service_token_secret_ref=mapping.service_token_secret_ref,
    )
    targets[str(mapping.forjd_tenant_id)] = mapping.service_token_secret_ref
  return [
    {"tenant_id": tenant_id, "service_token_secret_ref": secret_ref}
    for tenant_id, secret_ref in sorted(targets.items())
  ]


def request_account_deletion(user: User, firebase_uid: str | None = None) -> UserLifecycleJob:
  # The request is a durable tombstone barrier: no new auth, API-key, billing,
  # or FORJD traffic may race work created after the erasure manifest.
  with transaction.atomic():
    locked_user = User.objects.select_for_update().get(pk=user.pk)
    profile = UserProfile.objects.select_for_update().get(user=locked_user)
    targets = _target_manifest(profile.account_id)
    job = (
      UserLifecycleJob.objects.select_for_update()
      .filter(
        account_id=profile.account_id,
        job_type=UserLifecycleJob.JobType.DELETION,
      )
      .exclude(state=UserLifecycleJob.State.COMPLETED)
      .order_by("created_at")
      .first()
    )
    if job is None:
      job = UserLifecycleJob.objects.create(
        user=locked_user,
        job_type=UserLifecycleJob.JobType.DELETION,
        account_id=profile.account_id,
        firebase_uid=firebase_uid or locked_user.username,
        user_email=locked_user.email or "",
        forjd_erase_targets=targets,
      )
    else:
      retained = {
        str(target.get("tenant_id")): str(target.get("service_token_secret_ref"))
        for target in job.forjd_erase_targets
        if isinstance(target, dict) and target.get("tenant_id")
      }
      retained.update(
        {target["tenant_id"]: target["service_token_secret_ref"] for target in targets}
      )
      job.forjd_erase_targets = [
        {"tenant_id": tenant_id, "service_token_secret_ref": secret_ref}
        for tenant_id, secret_ref in sorted(retained.items())
      ]
      job.save(update_fields=["forjd_erase_targets", "updated_at"])

    barrier_was_new = "deletion_barrier_applied" not in (job.steps_completed or [])
    if barrier_was_new:
      job.steps_completed = [*(job.steps_completed or []), "deletion_barrier_applied"]
      job.save(update_fields=["steps_completed", "updated_at"])
      AuditLog.objects.create(
        user=locked_user,
        action="ACCOUNT_DELETION_REQUESTED",
        resource_id=str(profile.account_id),
        details={"job_id": str(job.id), "forjd_tenant_count": len(targets)},
      )
    APIKey.objects.filter(user=locked_user, is_active=True).update(is_active=False)
    ForjdTenantMapping.objects.filter(deml_account_id=profile.account_id).update(
      is_active=False,
      updated_at=timezone.now(),
    )
    if locked_user.is_active:
      locked_user.is_active = False
      locked_user.save(update_fields=["is_active"])

  execute_deletion_job(job)
  job.refresh_from_db()
  return job


def _erase_forjd_tenant(target: dict[str, str]) -> tuple[bool, str]:
  """Erase one manifest target without consulting the mutable current mapping."""
  from forjd.client import ForjdClient, ForjdError, close_forjd_connector
  from forjd.tenancy import ForjdTenantConfigurationError, resolve_forjd_snapshot_credential

  try:
    tenant_id = uuid.UUID(str(target.get("tenant_id") or ""))
    credential = resolve_forjd_snapshot_credential(
      tenant_id,
      str(target.get("service_token_secret_ref") or ""),
    )
  except ForjdTenantConfigurationError as exc:
    return False, str(exc)
  except ValueError:
    return False, "InvalidForjdTenantEraseTarget"

  client = ForjdClient(
    tenant_id=credential.tenant_id,
    service_token=credential.service_token,
  )

  async def erase_and_close() -> None:
    try:
      await client.erase_tenant(str(credential.tenant_id))
    finally:
      await close_forjd_connector()

  try:
    async_to_sync(erase_and_close)()
  except ForjdError as exc:
    from forjd.client import redact_forjd_secrets

    return False, redact_forjd_secrets(str(exc))
  except Exception as exc:
    from forjd.client import redact_forjd_secrets

    return False, redact_forjd_secrets(f"FORJD erase failed: {exc}")
  return True, ""


def _stripe_object_value(value: object, key: str) -> object | None:
  if isinstance(value, dict):
    return value.get(key)
  return getattr(value, key, None)


def _active_stripe_subscription_ids(stripe_module: Any, profile: UserProfile) -> set[str]:
  subscription_ids: set[str] = set()
  if profile.stripe_subscription_id:
    subscription_ids.add(str(profile.stripe_subscription_id))
  if not profile.stripe_customer_id:
    return subscription_ids
  page = stripe_module.Subscription.list(
    customer=profile.stripe_customer_id,
    status="all",
    limit=100,
  )
  auto_paging_iter = getattr(page, "auto_paging_iter", None)
  subscriptions = (
    auto_paging_iter() if callable(auto_paging_iter) else _stripe_object_value(page, "data")
  )
  for subscription in subscriptions or []:
    subscription_status = str(_stripe_object_value(subscription, "status") or "")
    if subscription_status in {"canceled", "incomplete_expired"}:
      continue
    subscription_id = _stripe_object_value(subscription, "id")
    if subscription_id:
      subscription_ids.add(str(subscription_id))
  return subscription_ids


def _stripe_resource_is_missing(exc: Exception) -> bool:
  error_code = str(getattr(exc, "code", "") or "")
  error_body = getattr(exc, "json_body", None)
  if isinstance(error_body, dict):
    nested = error_body.get("error")
    if isinstance(nested, dict):
      error_code = error_code or str(nested.get("code") or "")
  return getattr(exc, "http_status", None) == 404 or error_code == "resource_missing"


def _persist_stripe_cancellation(
  job_id: uuid.UUID,
  lease_token: uuid.UUID,
  user_id: int,
) -> list[str]:
  with transaction.atomic():
    locked_job = (
      UserLifecycleJob.objects.select_for_update()
      .filter(
        pk=job_id,
        state=UserLifecycleJob.State.RUNNING,
        lease_token=lease_token,
      )
      .first()
    )
    if locked_job is None:
      raise RuntimeError("LifecycleLeaseLost")
    locked_profile = UserProfile.objects.select_for_update().get(user_id=user_id)
    locked_profile.stripe_subscription_id = ""
    locked_profile.stripe_customer_id = ""
    locked_profile.subscription_active = False
    locked_profile.save(
      update_fields=[
        "stripe_subscription_id",
        "stripe_customer_id",
        "subscription_active",
      ]
    )
    steps = list(locked_job.steps_completed or [])
    if "stripe_canceled" not in steps:
      steps.append("stripe_canceled")
    locked_job.steps_completed = steps
    locked_job.lease_expires_at = timezone.now() + DELETION_JOB_LEASE
    locked_job.save(update_fields=["steps_completed", "lease_expires_at", "updated_at"])
    return steps


def _teardown_local_identity(job: UserLifecycleJob, lease_token: uuid.UUID) -> None:
  """Cancel billing hooks, revoke local keys, delete Firebase + Django user."""
  if not UserLifecycleJob.objects.filter(
    pk=job.pk,
    state=UserLifecycleJob.State.RUNNING,
    lease_token=lease_token,
  ).exists():
    raise RuntimeError("LifecycleLeaseLost")
  user = job.user
  if user is None:
    raise RuntimeError("LocalIdentityUnavailable")
  profile = user.profile
  steps = list(job.steps_completed or [])

  # Billing cancellation is a deletion precondition: losing the subscription
  # identifier can otherwise leave a deleted customer being charged forever.
  if profile.stripe_subscription_id or profile.stripe_customer_id:
    try:
      import stripe
      from django.conf import settings

      if not getattr(settings, "STRIPE_SECRET_KEY", ""):
        raise RuntimeError("StripeCancellationUnavailable")
      stripe.api_key = settings.STRIPE_SECRET_KEY
      for subscription_id in sorted(_active_stripe_subscription_ids(stripe, profile)):
        try:
          stripe.Subscription.cancel(subscription_id)
        except Exception as exc:
          if not _stripe_resource_is_missing(exc):
            raise
    except Exception as exc:
      logger.warning(
        "Stripe cancellation failed account=%s error_type=%s",
        job.account_id,
        type(exc).__name__,
      )
      raise RuntimeError("StripeSubscriptionCancellationFailed") from exc
    steps = _persist_stripe_cancellation(job.id, lease_token, user.pk)

  firebase_uid = job.firebase_uid or user.username
  if firebase_uid:
    try:
      from firebase_admin import auth as firebase_auth

      firebase_auth.delete_user(firebase_uid)
      if "firebase_deleted" not in steps:
        steps.append("firebase_deleted")
    except firebase_auth.UserNotFoundError:
      # An exact retry after an ambiguous response is already complete.
      if "firebase_deleted" not in steps:
        steps.append("firebase_deleted")
    except Exception as exc:
      logger.warning(
        "Firebase delete failed uid=%s error_type=%s",
        firebase_uid,
        type(exc).__name__,
      )
      raise RuntimeError("FirebaseIdentityDeletionFailed") from exc

  # Local revocation, audit, user deletion, and terminal job state commit as a
  # unit. If the database fails after the external Firebase call, an exact
  # retry treats UserNotFound as success and finishes this transaction.
  with transaction.atomic():
    locked_job = UserLifecycleJob.objects.select_for_update().get(pk=job.pk)
    if locked_job.state != UserLifecycleJob.State.RUNNING or locked_job.lease_token != lease_token:
      raise RuntimeError("LifecycleLeaseLost")
    if locked_job.user_id is None:
      raise RuntimeError("LocalIdentityUnavailable")
    locked_user = User.objects.select_for_update().get(pk=locked_job.user_id)
    APIKey.objects.filter(user=locked_user, is_active=True).update(is_active=False)
    if "api_keys_revoked" not in steps:
      steps.append("api_keys_revoked")

    AuditLog.objects.create(
      user=locked_user,
      action="ACCOUNT_DELETED",
      resource_id=str(profile.account_id),
      details={"job_id": str(job.id)},
    )
    if "audit_logged" not in steps:
      steps.append("audit_logged")

    # Retired data-plane tables remain physically present for rollback. Scrub
    # their account identifier defensively without assuming every deployment
    # still has the table.
    if "telemetry_ingest_receipts" in set(connection.introspection.table_names()):
      prepared_account_id = UserProfile._meta.get_field("account_id").get_db_prep_value(
        job.account_id,
        connection,
      )
      with connection.cursor() as cursor:
        cursor.execute(
          "UPDATE telemetry_ingest_receipts SET account_id = NULL WHERE account_id = %s",
          [prepared_account_id],
        )

    ForjdShadowReceipt.objects.filter(deml_account_id=job.account_id).update(deml_account_id=None)
    BrowserSession.objects.filter(
      Q(user_id=locked_user.pk) | Q(firebase_uid=job.firebase_uid)
    ).delete()
    AuthHandoffToken.objects.filter(user_id=locked_user.pk).delete()
    # Reports target the tenant that was just erased; retaining them would both
    # preserve user content and create a permanently undeliverable outbox row.
    BugReport.objects.filter(account_id=job.account_id).delete()
    # The lifecycle receipt owns the final erase manifest and evidence, so the
    # account-addressable mapping records are no longer needed after success.
    ForjdTenantMapping.objects.filter(deml_account_id=job.account_id).delete()
    ForjdTenantAssociation.objects.filter(deml_account_id=job.account_id).delete()

    locked_user.delete()
    steps.append("django_user_deleted")
    completed = UserLifecycleJob.objects.filter(
      pk=job.pk,
      state=UserLifecycleJob.State.RUNNING,
      lease_token=lease_token,
    ).update(
      state=UserLifecycleJob.State.COMPLETED,
      last_error="",
      failure_code="",
      completed_at=timezone.now(),
      steps_completed=steps,
      user=None,
      firebase_uid="",
      user_email="",
      next_attempt_at=None,
      lease_token=None,
      lease_expires_at=None,
      updated_at=timezone.now(),
    )
    if completed != 1:
      raise RuntimeError("LifecycleLeaseLost")


def _fail_job(
  job_id: uuid.UUID,
  lease_token: uuid.UUID,
  *,
  failure_code: str,
  detail: str,
) -> bool:
  """Fence failure writes and apply bounded exponential retry scheduling."""
  current = (
    UserLifecycleJob.objects.filter(
      pk=job_id,
      state=UserLifecycleJob.State.RUNNING,
      lease_token=lease_token,
    )
    .values("attempts", "max_attempts")
    .first()
  )
  if current is None:
    return False
  attempts = int(current["attempts"])
  terminal = attempts >= int(current["max_attempts"])
  delay_seconds = min(
    int(LIFECYCLE_RETRY_MAX_DELAY.total_seconds()),
    2 ** min(attempts + 4, 15),
  )
  return (
    UserLifecycleJob.objects.filter(
      pk=job_id,
      state=UserLifecycleJob.State.RUNNING,
      lease_token=lease_token,
    ).update(
      state=(UserLifecycleJob.State.DEAD_LETTER if terminal else UserLifecycleJob.State.FAILED),
      last_error=detail[:512],
      failure_code=failure_code[:128],
      completed_at=None,
      next_attempt_at=(None if terminal else timezone.now() + timedelta(seconds=delay_seconds)),
      lease_token=None,
      lease_expires_at=None,
      updated_at=timezone.now(),
    )
    == 1
  )


def _record_erased_tenant(
  job_id: uuid.UUID,
  lease_token: uuid.UUID,
  tenant_id: str,
) -> bool:
  with transaction.atomic():
    job = (
      UserLifecycleJob.objects.select_for_update()
      .filter(
        pk=job_id,
        state=UserLifecycleJob.State.RUNNING,
        lease_token=lease_token,
      )
      .first()
    )
    if job is None:
      return False
    erased = list(job.forjd_erased_tenant_ids or [])
    if tenant_id not in erased:
      erased.append(tenant_id)
    job.forjd_erased_tenant_ids = sorted(erased)
    job.lease_expires_at = timezone.now() + DELETION_JOB_LEASE
    job.save(update_fields=["forjd_erased_tenant_ids", "lease_expires_at", "updated_at"])
    return True


def _record_forjd_complete(job_id: uuid.UUID, lease_token: uuid.UUID) -> bool:
  with transaction.atomic():
    job = (
      UserLifecycleJob.objects.select_for_update()
      .filter(
        pk=job_id,
        state=UserLifecycleJob.State.RUNNING,
        lease_token=lease_token,
      )
      .first()
    )
    if job is None:
      return False
    steps = list(job.steps_completed or [])
    if "forjd_erased" not in steps:
      steps.append("forjd_erased")
    if "forjd_calls_stopped" not in steps:
      steps.append("forjd_calls_stopped")
    job.steps_completed = steps
    job.lease_expires_at = timezone.now() + DELETION_JOB_LEASE
    job.save(update_fields=["steps_completed", "lease_expires_at", "updated_at"])
    return True


def execute_deletion_job(job: UserLifecycleJob) -> bool:
  if job.state == UserLifecycleJob.State.COMPLETED:
    return True

  # Claim with a recoverable lease before any external side effect. QuerySet
  # update makes this single-winner across web and reconciliation workers;
  # stale RUNNING jobs are recoverable after a process crash.
  now = timezone.now()
  lease_token = uuid.uuid4()
  claimed = (
    UserLifecycleJob.objects.filter(pk=job.pk)
    .filter(
      Q(
        state__in=[UserLifecycleJob.State.PENDING, UserLifecycleJob.State.FAILED],
        next_attempt_at__isnull=True,
      )
      | Q(
        state__in=[UserLifecycleJob.State.PENDING, UserLifecycleJob.State.FAILED],
        next_attempt_at__lte=now,
      )
      | Q(
        state=UserLifecycleJob.State.RUNNING,
        lease_expires_at__lte=now,
      )
      | Q(
        state=UserLifecycleJob.State.RUNNING,
        lease_expires_at__isnull=True,
        updated_at__lte=now - DELETION_JOB_LEASE,
      )
    )
    .update(
      state=UserLifecycleJob.State.RUNNING,
      last_error=DELETION_IN_PROGRESS,
      failure_code="",
      completed_at=None,
      attempts=F("attempts") + 1,
      next_attempt_at=None,
      lease_token=lease_token,
      lease_expires_at=now + DELETION_JOB_LEASE,
      updated_at=now,
    )
  )
  job.refresh_from_db()
  if claimed != 1:
    return job.state == UserLifecycleJob.State.COMPLETED

  erased_tenant_ids = set(str(value) for value in (job.forjd_erased_tenant_ids or []))
  for target in job.forjd_erase_targets or []:
    if not isinstance(target, dict):
      _fail_job(
        job.id,
        lease_token,
        failure_code="InvalidForjdTenantEraseTarget",
        detail=FORJD_TENANT_ERASE_BLOCKER,
      )
      return False
    tenant_id = str(target.get("tenant_id") or "")
    if tenant_id in erased_tenant_ids:
      continue
    erased, erase_error = _erase_forjd_tenant(target)
    if not erased:
      _fail_job(
        job.id,
        lease_token,
        failure_code=(erase_error or "ForjdTenantEraseFailed").split(":", 1)[0],
        detail=FORJD_TENANT_ERASE_BLOCKER,
      )
      logger.warning(
        "Account deletion blocked on FORJD erase for %s (%s)",
        job.account_id,
        type(erase_error).__name__,
      )
      return False
    if not _record_erased_tenant(job.id, lease_token, tenant_id):
      return False
    erased_tenant_ids.add(tenant_id)

  if not _record_forjd_complete(job.id, lease_token):
    return False
  job.refresh_from_db()
  # 2) Local identity teardown (only after FORJD confirms erase). The helper
  # marks COMPLETED only in the same transaction that deletes the Django user.
  try:
    _teardown_local_identity(job, lease_token)
  except Exception as exc:
    job.refresh_from_db()
    if job.state == UserLifecycleJob.State.COMPLETED:
      return True
    _fail_job(
      job.id,
      lease_token,
      failure_code=type(exc).__name__,
      detail="Local identity teardown failed after FORJD erase",
    )
    logger.exception("Local teardown failed for %s", job.account_id)
    return False

  job.refresh_from_db()
  logger.info("Account deletion completed for %s", job.account_id)
  return job.state == UserLifecycleJob.State.COMPLETED


def process_pending_lifecycle_jobs(limit: int = 20) -> int:
  now = timezone.now()
  stale_before = now - DELETION_JOB_LEASE
  jobs = UserLifecycleJob.objects.filter(
    Q(
      state__in=[UserLifecycleJob.State.PENDING, UserLifecycleJob.State.FAILED],
      next_attempt_at__isnull=True,
    )
    | Q(
      state__in=[UserLifecycleJob.State.PENDING, UserLifecycleJob.State.FAILED],
      next_attempt_at__lte=now,
    )
    | Q(state=UserLifecycleJob.State.RUNNING, lease_expires_at__lte=now)
    | Q(
      state=UserLifecycleJob.State.RUNNING,
      lease_expires_at__isnull=True,
      updated_at__lte=stale_before,
    )
  ).order_by("next_attempt_at", "created_at")[:limit]
  return sum(1 for job in jobs if execute_deletion_job(job))
