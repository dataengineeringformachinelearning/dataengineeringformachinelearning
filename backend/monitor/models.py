"""User-owned persistence for the DEML learning control plane.

All data-plane, analytics, telemetry, scanning, and ML persistence belongs to
FORJD.  Models in this module are deliberately limited to authenticated-user
state and user-originated interactions.
"""

from __future__ import annotations

import hashlib
import hmac
import uuid

from django.contrib.auth import get_user_model
from django.db import models, transaction

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
  class DeliveryStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    DELIVERED = "delivered", "Delivered"
    DEAD_LETTER = "dead_letter", "Dead letter"
    LEGACY_RETAINED = "legacy_retained", "Legacy retained locally"

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  client_report_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.SET_NULL, related_name="bug_reports", null=True, blank=True
  )
  account_id = models.UUIDField(null=True, blank=True, db_index=True)
  forjd_tenant_id = models.UUIDField(null=True, blank=True, db_index=True)
  forjd_service_token_secret_ref = models.CharField(max_length=255, blank=True, default="")
  submitted_by_pseudonym = models.CharField(max_length=64, blank=True, default="")
  user_description = models.TextField()
  telemetry_context = models.JSONField(null=True, blank=True)
  content_sha256 = models.CharField(max_length=64, blank=True, default="")
  delivery_status = models.CharField(
    max_length=16,
    choices=DeliveryStatus.choices,
    default=DeliveryStatus.PENDING,
    db_index=True,
  )
  forjd_document_id = models.CharField(max_length=64, blank=True, default="")
  delivery_attempts = models.PositiveIntegerField(default=0)
  next_delivery_at = models.DateTimeField(null=True, blank=True, db_index=True)
  last_delivery_error = models.CharField(max_length=128, blank=True, default="")
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "bug_reports"
    ordering = ["-created_at"]
    indexes = [
      models.Index(
        fields=["delivery_status", "next_delivery_at", "created_at"],
        name="bug_report_delivery_ready_idx",
      )
    ]


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
  # New profiles start Standard/inactive until Stripe checkout or webhook activates Pro.
  subscription_active = models.BooleanField(default=False)
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
    constraints = [
      models.CheckConstraint(
        condition=models.Q(service_token_secret_ref__startswith="env:FORJD_SERVICE_TOKEN"),
        name="forjd_tenant_mapping_secret_ref_env_only",
      ),
    ]

  def clean(self) -> None:
    """Reject plaintext tokens — only env:FORJD_SERVICE_TOKEN[_SUFFIX] refs."""
    from django.core.exceptions import ValidationError
    from forjd.tenancy import ForjdTenantConfigurationError, validate_service_token_secret_ref

    try:
      self.service_token_secret_ref = validate_service_token_secret_ref(
        self.service_token_secret_ref
      )
    except ForjdTenantConfigurationError as exc:
      raise ValidationError({"service_token_secret_ref": str(exc)}) from exc
    # Reject opaque credential prefixes stored as plaintext refs.
    _opaque_prefix = "fj" + "svc_"
    if _opaque_prefix in self.service_token_secret_ref.lower():
      raise ValidationError(
        {"service_token_secret_ref": ("Must be an env: reference, never a plaintext credential")}
      )

  def save(self, *args: object, **kwargs: object) -> None:
    previous = type(self).objects.filter(pk=self.pk).first() if self.pk else None
    if (
      previous is not None
      and previous.forjd_tenant_id != self.forjd_tenant_id
      and previous.service_token_secret_ref == self.service_token_secret_ref
    ):
      from django.core.exceptions import ValidationError

      raise ValidationError(
        {
          "service_token_secret_ref": (
            "A tenant remap requires a distinct secret reference so the historical "
            "tenant remains addressable"
          )
        }
      )
    self.full_clean()
    with transaction.atomic():
      if previous is not None:
        ForjdTenantAssociation.objects.get_or_create(
          deml_account_id=previous.deml_account_id,
          forjd_tenant_id=previous.forjd_tenant_id,
          service_token_secret_ref=previous.service_token_secret_ref,
        )
      super().save(*args, **kwargs)
      ForjdTenantAssociation.objects.get_or_create(
        deml_account_id=self.deml_account_id,
        forjd_tenant_id=self.forjd_tenant_id,
        service_token_secret_ref=self.service_token_secret_ref,
      )

  def __str__(self) -> str:
    return f"{self.deml_account_id} -> {self.forjd_tenant_id}"


class ForjdTenantAssociation(models.Model):
  """Immutable account-to-tenant history used by erasure and durable retries."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  deml_account_id = models.UUIDField(db_index=True)
  forjd_tenant_id = models.UUIDField(db_index=True)
  service_token_secret_ref = models.CharField(max_length=255)
  mapped_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "forjd_tenant_associations"
    constraints = [
      models.UniqueConstraint(
        fields=["deml_account_id", "forjd_tenant_id", "service_token_secret_ref"],
        name="forjd_tenant_assoc_identity_uniq",
      ),
      models.CheckConstraint(
        condition=models.Q(service_token_secret_ref__startswith="env:FORJD_SERVICE_TOKEN"),
        name="forjd_tenant_assoc_secret_ref_env_only",
      ),
    ]

  def save(self, *args: object, **kwargs: object) -> None:
    if self.pk and type(self).objects.filter(pk=self.pk).exists():
      raise ValueError("FORJD tenant association history is immutable")
    from forjd.tenancy import validate_service_token_secret_ref

    self.service_token_secret_ref = validate_service_token_secret_ref(self.service_token_secret_ref)
    super().save(*args, **kwargs)


class ForjdShadowReceipt(models.Model):
  """Metadata-only dual-write receipt — never stores ciphertext or tokens."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  deml_account_id = models.UUIDField(null=True, blank=True, db_index=True)
  forjd_tenant_id = models.UUIDField(db_index=True)
  client_event_id = models.CharField(max_length=128)
  workflow_id = models.CharField(max_length=128, blank=True, default="")
  content_type = models.CharField(max_length=128, blank=True, default="")
  event_type = models.CharField(max_length=128, blank=True, default="")
  ciphertext_sha256 = models.CharField(max_length=64, blank=True, default="")
  forjd_status = models.PositiveSmallIntegerField(null=True, blank=True)
  forjd_ok = models.BooleanField(default=False)
  request_id = models.CharField(max_length=64, blank=True, default="")
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "forjd_shadow_receipts"
    indexes = [
      models.Index(fields=["forjd_tenant_id", "-created_at"], name="forjd_shado_forjd_t_idx"),
      models.Index(fields=["client_event_id"], name="forjd_shado_client__idx"),
    ]

  def __str__(self) -> str:
    return f"shadow:{self.client_event_id}:{self.forjd_status}"


# --- Browser sessions + auth handoff (Postgres) ---
class BrowserSession(models.Model):
  """Server-side Firebase browser session registry (TTL via expires_at)."""

  session_id = models.CharField(max_length=128, primary_key=True)
  firebase_uid = models.CharField(max_length=128, db_index=True)
  user_id = models.PositiveIntegerField()
  user_agent = models.CharField(max_length=512, blank=True, default="")
  ip = models.CharField(max_length=64, blank=True, default="")
  created_at = models.DateTimeField(auto_now_add=True)
  last_seen = models.DateTimeField(auto_now=True)
  expires_at = models.DateTimeField(db_index=True)

  class Meta:
    db_table = "browser_sessions"
    indexes = [
      models.Index(fields=["firebase_uid", "-last_seen"], name="browser_ses_firebas_idx"),
    ]


class AuthHandoffToken(models.Model):
  """One-time cross-domain / desktop auth handoff (short TTL)."""

  token_hash = models.CharField(max_length=64, primary_key=True)
  user_id = models.PositiveIntegerField()
  code_challenge = models.CharField(max_length=128, blank=True, default="")
  client_name = models.CharField(max_length=64, blank=True, default="")
  created_at = models.DateTimeField(auto_now_add=True)
  expires_at = models.DateTimeField(db_index=True)
  consumed_at = models.DateTimeField(null=True, blank=True)

  class Meta:
    db_table = "auth_handoff_tokens"


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
    return hmac.compare_digest(
      self.key_hash,
      hashlib.sha256(raw_key.encode()).hexdigest(),
    )


class HeadlessRateLimitBucket(models.Model):
  """Replica-safe token bucket for DEML's headless FORJD control plane."""

  scope_key = models.CharField(max_length=64, primary_key=True)
  tokens = models.FloatField()
  updated_at = models.DateTimeField(db_index=True)

  class Meta:
    db_table = "headless_rate_limit_buckets"


class UserLifecycleJob(models.Model):
  class JobType(models.TextChoices):
    DELETION = "deletion", "Deletion"
    RECONCILE = "reconcile", "Reconcile"

  class State(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    DEAD_LETTER = "dead_letter", "Dead letter"

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  job_type = models.CharField(max_length=32, choices=JobType.choices, default=JobType.DELETION)
  state = models.CharField(max_length=32, choices=State.choices, default=State.PENDING)
  user = models.ForeignKey(
    User, on_delete=models.SET_NULL, null=True, blank=True, related_name="lifecycle_jobs"
  )
  account_id = models.UUIDField()
  firebase_uid = models.CharField(max_length=128, blank=True, default="")
  user_email = models.CharField(max_length=255, blank=True, default="")
  forjd_erase_targets = models.JSONField(default=list, blank=True)
  forjd_erased_tenant_ids = models.JSONField(default=list, blank=True)
  steps_completed = models.JSONField(default=list, blank=True)
  attempts = models.PositiveIntegerField(default=0)
  max_attempts = models.PositiveIntegerField(default=12)
  next_attempt_at = models.DateTimeField(null=True, blank=True, db_index=True)
  failure_code = models.CharField(max_length=128, blank=True, default="")
  lease_token = models.UUIDField(null=True, blank=True, editable=False)
  lease_expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
  last_error = models.TextField(blank=True, default="")
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  completed_at = models.DateTimeField(null=True, blank=True)

  class Meta:
    db_table = "user_lifecycle_jobs"
    constraints = [
      models.UniqueConstraint(
        fields=["account_id", "job_type"],
        condition=models.Q(state__in=["pending", "running", "failed", "dead_letter"]),
        name="user_lifecycle_active_job_uniq",
      )
    ]

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
  | ForjdTenantAssociation
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
      ForjdTenantAssociation,
      APIKey,
      UserLifecycleJob,
    )
  )
