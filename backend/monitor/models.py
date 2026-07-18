"""User-owned persistence for the DEML learning control plane.

All data-plane, analytics, telemetry, scanning, and ML persistence belongs to
FORJD.  Models in this module are deliberately limited to authenticated-user
state and user-originated interactions.
"""

from __future__ import annotations

import hashlib
import uuid

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class CookieConsent(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="cookie_consents", null=True, blank=True
  )
  necessary = models.BooleanField(default=True)
  analytical = models.BooleanField(default=False)
  marketing = models.BooleanField(default=False)
  ip_address = models.GenericIPAddressField(null=True, blank=True)
  user_agent = models.TextField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "cookie_consents"
    ordering = ["-created_at"]


class BugReport(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="bug_reports", null=True, blank=True
  )
  user_description = models.TextField()
  telemetry_context = models.JSONField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "bug_reports"
    ordering = ["-created_at"]


class NewsletterSubscription(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  email = models.EmailField(unique=True)
  subscribed_at = models.DateTimeField(auto_now_add=True)
  consent_accepted = models.BooleanField(default=False)

  class Meta:
    db_table = "newsletter_subscriptions"
    ordering = ["-subscribed_at"]


class ValidatedSite(models.Model):
  """User-owned domain registration used for dynamic CORS authorization."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User,
    on_delete=models.CASCADE,
    related_name="validated_sites",
    null=True,
    blank=True,
  )
  domain = models.CharField(max_length=255)
  is_verified = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "validated_sites"
    unique_together = ("user", "domain")
    indexes = [models.Index(fields=["domain"], name="validated_site_domain_idx")]

  def __str__(self) -> str:
    return self.domain


class AuditLog(models.Model):
  """Immutable record of user and account-control-plane actions."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
  )
  action = models.CharField(max_length=255)
  resource_id = models.CharField(max_length=255, blank=True, null=True)
  details = models.JSONField(default=dict, blank=True)
  ip_address = models.GenericIPAddressField(null=True, blank=True)
  user_agent = models.TextField(null=True, blank=True)
  timestamp = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "audit_logs"
    ordering = ["-timestamp"]


class UserProfile(models.Model):
  ROLE_CHOICES = [
    ("Viewer", "Viewer"),
    ("Operator", "Operator"),
    ("Security Admin", "Security Admin"),
  ]
  TIER_CHOICES = [("Standard", "Standard"), ("Pro", "Pro")]

  user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
  account_id = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
  role = models.CharField(max_length=50, choices=ROLE_CHOICES, default="Viewer")
  linked_emails = models.JSONField(default=list, blank=True, null=True)
  tier = models.CharField(max_length=50, choices=TIER_CHOICES, default="Standard")
  stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
  stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
  subscription_active = models.BooleanField(default=True)
  subscription_current_period_end = models.DateTimeField(null=True, blank=True)

  class Meta:
    db_table = "user_profiles"


class ForjdTenantMapping(models.Model):
  """Bind one DEML account to one tenant-scoped FORJD service credential."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  deml_account_id = models.UUIDField(unique=True)
  forjd_tenant_id = models.UUIDField(unique=True)
  service_token_secret_ref = models.CharField(
    max_length=255,
    default="env:FORJD_SERVICE_TOKEN",
  )
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "forjd_tenant_mappings"

  def __str__(self) -> str:
    return f"{self.deml_account_id} -> {self.forjd_tenant_id}"


class APIKey(models.Model):
  """User-managed DEML credential; never grants direct data-plane access."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_keys")
  name = models.CharField(max_length=255)
  prefix = models.CharField(max_length=8, unique=True)
  key_hash = models.CharField(max_length=128)
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)

  def set_key(self, raw_key: str) -> None:
    self.key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

  def verify_key(self, raw_key: str) -> bool:
    return self.key_hash == hashlib.sha256(raw_key.encode()).hexdigest()


class UserLifecycleJob(models.Model):
  class JobType(models.TextChoices):
    DELETION = "deletion", "Deletion"
    RECONCILE = "reconcile", "Reconcile"

  class State(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  job_type = models.CharField(max_length=32, choices=JobType.choices, default=JobType.DELETION)
  state = models.CharField(max_length=32, choices=State.choices, default=State.PENDING)
  user = models.ForeignKey(
    User, on_delete=models.SET_NULL, null=True, blank=True, related_name="lifecycle_jobs"
  )
  account_id = models.UUIDField()
  firebase_uid = models.CharField(max_length=128, blank=True, default="")
  user_email = models.CharField(max_length=255, blank=True, default="")
  steps_completed = models.JSONField(default=list, blank=True)
  last_error = models.TextField(blank=True, default="")
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  completed_at = models.DateTimeField(null=True, blank=True)

  class Meta:
    db_table = "user_lifecycle_jobs"

  def __str__(self) -> str:
    return f"{self.job_type}:{self.state} ({self.account_id})"


UserOwnedModel = (
  CookieConsent
  | BugReport
  | NewsletterSubscription
  | ValidatedSite
  | AuditLog
  | UserProfile
  | ForjdTenantMapping
)


def user_model_names() -> tuple[str, ...]:
  """Expose the intentionally small persistence boundary for architecture tests."""

  return tuple(
    model.__name__
    for model in (
      CookieConsent,
      BugReport,
      NewsletterSubscription,
      ValidatedSite,
      AuditLog,
      UserProfile,
      ForjdTenantMapping,
      APIKey,
      UserLifecycleJob,
    )
  )
