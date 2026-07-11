import hashlib
import uuid

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class StatusPage(models.Model):
  """Public status surface; platform-status has user=null (no login, showcase only)."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="status_pages", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False)
  title = models.CharField(max_length=255)
  slug = models.SlugField(unique=True, max_length=255)
  description = models.TextField(blank=True)
  is_published = models.BooleanField(default=False)
  google_analytics_id = models.CharField(max_length=100, blank=True, null=True)
  microsoft_clarity_id = models.CharField(max_length=100, blank=True, null=True)
  cloudflare_analytics_id = models.CharField(max_length=100, blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "status_pages"
    indexes = [
      models.Index(
        fields=["is_platform", "is_published"], name="status_page_is_plat_ff9f2d_idx"
      ),  # common public/private + platform filter
      models.Index(
        fields=["user", "is_platform"], name="status_page_user_id_12c0fc_idx"
      ),  # tenant scoping queries
    ]

  def __str__(self):
    return self.title


class MonitoredService(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  status_page = models.ForeignKey(StatusPage, on_delete=models.CASCADE, related_name="services")
  name = models.CharField(max_length=255)
  url = models.URLField()
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "monitored_services"

  def __str__(self):
    return self.name


class Asset(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="assets", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False)
  hostname = models.CharField(max_length=255)
  internal_ip = models.GenericIPAddressField(null=True, blank=True)
  os_version = models.CharField(max_length=255, null=True, blank=True)
  mac_address = models.CharField(max_length=50, null=True, blank=True)
  environment = models.CharField(
    max_length=50,
    choices=[("Production", "Production"), ("Staging", "Staging"), ("Development", "Development")],
    default="Production",
  )
  monitored_service = models.ForeignKey(
    MonitoredService, on_delete=models.SET_NULL, null=True, blank=True, related_name="assets"
  )
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "assets"

  def __str__(self):
    return f"{self.hostname} ({self.environment})"


class Endpoints(models.Model):
  """
  Real-time telemetry and health logs (CIA Triad: Availability).
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="endpoints", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False, db_index=True)
  url = models.URLField()
  last_tested = models.DateTimeField(auto_now=True)
  status_code = models.IntegerField()
  response_time = models.DurationField()
  ip_address = models.GenericIPAddressField(null=True, blank=True)
  location = models.CharField(max_length=255, null=True, blank=True)
  asn = models.CharField(max_length=255, null=True, blank=True)
  isp = models.CharField(max_length=255, null=True, blank=True)
  device_type = models.CharField(max_length=50, null=True, blank=True)
  os_name = models.CharField(max_length=50, null=True, blank=True)
  browser_name = models.CharField(max_length=50, null=True, blank=True)
  is_bot = models.BooleanField(default=False, null=True, blank=True)
  is_active = models.BooleanField(default=True)
  telemetry_context = models.JSONField(null=True, blank=True)

  class Meta:
    db_table = "endpoints"
    indexes = [
      models.Index(fields=["url", "last_tested"]),
      models.Index(fields=["last_tested"]),
      models.Index(fields=["user", "is_platform", "last_tested"]),
    ]

  def __str__(self):
    return self.url


class Incident(models.Model):
  STATUS_CHOICES = [
    ("Investigating", "Investigating"),
    ("Identified", "Identified"),
    ("Monitoring", "Monitoring"),
    ("Resolved", "Resolved"),
  ]
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="incidents", null=True, blank=True
  )
  status_page = models.ForeignKey(StatusPage, on_delete=models.CASCADE, related_name="incidents")
  title = models.CharField(max_length=255)
  message = models.TextField()
  status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="Investigating")
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "incidents"
    ordering = ["-created_at"]
    indexes = [
      models.Index(fields=["created_at"]),
    ]

  def __str__(self):
    return f"{self.title} - {self.status}"


class CookieConsent(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="cookie_consents", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False)
  necessary = models.BooleanField(default=True)
  analytical = models.BooleanField(default=False)
  marketing = models.BooleanField(default=False)
  ip_address = models.GenericIPAddressField(null=True, blank=True)
  user_agent = models.TextField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "cookie_consents"
    ordering = ["-created_at"]
    indexes = [
      models.Index(fields=["created_at"]),
    ]

  def __str__(self):
    return f"CookieConsent {self.id} (analytical={self.analytical}, marketing={self.marketing})"


class BugReport(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="bug_reports", null=True, blank=True
  )
  user_description = models.TextField()
  telemetry_context = models.JSONField(null=True, blank=True)
  processed_report = models.TextField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "bug_reports"
    ordering = ["-created_at"]
    indexes = [
      models.Index(fields=["created_at"]),
    ]

  def __str__(self):
    return f"BugReport {self.id} (created: {self.created_at})"


class AnalyticsIntegration(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="analytics_integrations")
  provider = models.CharField(max_length=50)  # 'google' or 'microsoft'
  credentials = models.JSONField(default=dict, blank=True)  # encrypted/safe storage of tokens/keys
  active = models.BooleanField(default=True)
  last_sync = models.DateTimeField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "analytics_integrations"
    unique_together = ("user", "provider")

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self._decrypt_credentials()

  def _decrypt_credentials(self):
    if isinstance(self.credentials, dict) and "ciphertext" in self.credentials:
      try:
        from utils.encryption import decrypt_data

        self.credentials = decrypt_data(self.credentials["ciphertext"])
      except Exception:
        pass

  def save(self, *args, **kwargs):
    # Encrypt credentials dictionary before saving
    if isinstance(self.credentials, dict) and "ciphertext" not in self.credentials:
      from utils.encryption import encrypt_data

      ciphertext = encrypt_data(self.credentials)
      self.credentials = {"ciphertext": ciphertext}
    super().save(*args, **kwargs)
    self._decrypt_credentials()

  def __str__(self):
    return f"{self.user.username} - {self.provider} ({'Active' if self.active else 'Inactive'})"


class NewsletterSubscription(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  email = models.EmailField(unique=True)
  subscribed_at = models.DateTimeField(auto_now_add=True)
  consent_accepted = models.BooleanField(default=False)

  class Meta:
    db_table = "newsletter_subscriptions"
    ordering = ["-subscribed_at"]

  def __str__(self):
    return self.email


class DataEncryptionKey(models.Model):
  """
  Manages tenant-specific encryption keys for DEK/KEK architecture.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  encrypted_dek = models.TextField()  # The DEK encrypted with KEK
  created_at = models.DateTimeField(auto_now_add=True)
  is_active = models.BooleanField(default=True)

  class Meta:
    db_table = "data_encryption_keys"
    ordering = ["-created_at"]

  def __str__(self):
    return f"DEK {self.id} (created: {self.created_at}, active: {self.is_active})"


class Vulnerability(models.Model):
  STATUS_CHOICES = [
    ("Triage", "Triage"),
    ("Open", "Open"),
    ("In Progress", "In Progress"),
    ("Resolved", "Resolved"),
    ("False Positive", "False Positive"),
  ]
  SEVERITY_CHOICES = [
    ("Low", "Low"),
    ("Medium", "Medium"),
    ("High", "High"),
    ("Critical", "Critical"),
  ]
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="vulnerabilities", null=True, blank=True
  )
  asset = models.ForeignKey(
    Asset, on_delete=models.CASCADE, related_name="vulnerabilities", null=True, blank=True
  )
  title = models.CharField(max_length=255)
  description = models.TextField()
  status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="Triage")
  severity = models.CharField(max_length=50, choices=SEVERITY_CHOICES, default="Medium")
  impact = models.IntegerField(default=3)  # 1 to 5 scale
  likelihood = models.IntegerField(default=3)  # 1 to 5 scale
  cve_id = models.CharField(max_length=100, blank=True, null=True)
  customer_id = models.CharField(max_length=100, default="Internal")
  telemetry_context = models.JSONField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "vulnerabilities"
    ordering = ["-created_at"]
    indexes = [
      models.Index(fields=["status"], name="vuln_status_idx"),
      models.Index(fields=["severity"], name="vuln_severity_idx"),
      models.Index(fields=["created_at"]),
    ]

  def __str__(self):
    return f"{self.title} - {self.severity} ({self.status})"


class AuditLog(models.Model):
  """
  Immutable ledger of user actions (CIA Triad: Integrity).
  """

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
    indexes = [
      models.Index(fields=["action"], name="audit_action_idx"),
      models.Index(fields=["timestamp"]),
    ]

  def __str__(self):
    user_str = self.user.username if self.user else "Anonymous"
    return f"{self.timestamp} - {user_str} - {self.action}"


class UserProfile(models.Model):
  """Billing + external account_id; one profile per login user."""

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

  def __str__(self):
    return f"{self.user.username} - {self.role}"


class ThreatIntelligence(models.Model):
  """
  Security monitoring signals (CIA Triad: Integrity & Confidentiality).
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="threat_intelligence", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False)
  source = models.CharField(max_length=255)
  ip_address = models.GenericIPAddressField(null=True, blank=True)
  location = models.CharField(max_length=255, null=True, blank=True)
  abuse_confidence_score = models.IntegerField(default=0)
  otx_pulses = models.IntegerField(default=0)
  is_malicious = models.BooleanField(default=False)
  active_users = models.IntegerField(null=True, blank=True)
  suspicious_requests = models.IntegerField(null=True, blank=True)
  raw_payload = models.JSONField(null=True, blank=True)
  timestamp = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "threat_intelligence"
    ordering = ["-timestamp"]
    indexes = [
      models.Index(fields=["ip_address"]),
      models.Index(fields=["source"]),
      models.Index(fields=["timestamp"]),
      models.Index(fields=["user", "is_platform", "timestamp"]),
    ]
    constraints = [
      models.UniqueConstraint(
        fields=["user", "source", "ip_address", "location"],
        name="unique_threat_intel_per_user_source_ip_location",
      )
    ]

  def __str__(self):
    return f"{self.source} - {self.ip_address or self.location} ({self.timestamp})"


class AggregatedAnalytics(models.Model):
  """
  Rollups of telemetry for scalable dashboard reads.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="aggregated_analytics", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False, db_index=True)
  timestamp = models.DateTimeField(
    db_index=True, help_text="The start time of the aggregation bucket"
  )
  bucket_size = models.CharField(max_length=50, default="1h", help_text="e.g., '1h', '1d'")

  # Traffic & Telemetry (Clickhouse & Endpoints)
  total_requests = models.BigIntegerField(default=0)
  avg_latency_ms = models.FloatField(default=0.0)
  p99_latency_ms = models.FloatField(default=0.0)
  error_rate_percent = models.FloatField(default=0.0)

  # Security & Threats
  threats_detected = models.IntegerField(default=0)
  active_incidents = models.IntegerField(default=0)

  # 3rd Party Analytics & Cookies
  unique_visitors = models.IntegerField(default=0)
  cookie_consents_analytical = models.IntegerField(default=0)
  cookie_consents_marketing = models.IntegerField(default=0)

  # Widget Signals
  widget_interactions = models.IntegerField(default=0)

  # Enrichments & Extensible payload
  metadata = models.JSONField(default=dict, blank=True)

  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "aggregated_analytics"
    ordering = ["-timestamp"]
    constraints = [
      models.UniqueConstraint(
        fields=["user", "timestamp", "bucket_size"],
        condition=models.Q(is_platform=False),
        name="unique_user_analytics_bucket",
      ),
      models.UniqueConstraint(
        fields=["timestamp", "bucket_size"],
        condition=models.Q(is_platform=True),
        name="unique_platform_analytics_bucket",
      ),
    ]

  def __str__(self):
    scope = "platform" if self.is_platform else (self.user_id or "unknown")
    return f"Analytics {self.bucket_size} @ {self.timestamp} ({scope})"


class ReportArchive(models.Model):
  """Materialized daily rollups for fast report generation (Neon-optimized).

  Stores pre-computed daily summaries to accelerate report generation.
  Uses time-based partitioning for efficient querying in Neon serverless.
  Retains 90 days of history; older data archived to ClickHouse.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="report_archives", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False, db_index=True)
  report_date = models.DateField(db_index=True)  # Daily partition key
  period_start = models.DateTimeField()
  period_end = models.DateTimeField()

  # Pre-computed aggregates (denormalized for fast reads)
  total_requests = models.BigIntegerField(default=0)
  avg_latency_ms = models.FloatField(default=0.0)
  p99_latency_ms = models.FloatField(default=0.0)
  error_rate_percent = models.FloatField(default=0.0)
  threats_detected = models.IntegerField(default=0)
  active_incidents = models.IntegerField(default=0)
  unique_visitors = models.IntegerField(default=0)
  total_vulnerabilities = models.IntegerField(default=0)

  # Flexible schema for extensions, notes, trends
  summary_json = models.JSONField(default=dict, blank=True)

  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "report_archives"
    ordering = ["-report_date"]
    indexes = [
      models.Index(fields=["user", "report_date"]),
      models.Index(fields=["is_platform", "report_date"]),
    ]
    constraints = [
      models.UniqueConstraint(
        fields=["user", "report_date"],
        condition=models.Q(is_platform=False),
        name="unique_user_daily_report",
      ),
      models.UniqueConstraint(
        fields=["report_date"],
        condition=models.Q(is_platform=True),
        name="unique_platform_daily_report",
      ),
    ]

  def __str__(self):
    scope = "platform" if self.is_platform else (self.user_id or "unknown")
    return f"Report {self.report_date} ({scope})"


class APIKey(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_keys")
  name = models.CharField(max_length=255)
  prefix = models.CharField(max_length=8, unique=True)
  key_hash = models.CharField(max_length=128)
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)

  def set_key(self, raw_key):
    self.key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

  def verify_key(self, raw_key):
    return self.key_hash == hashlib.sha256(raw_key.encode()).hexdigest()

  def __str__(self):
    return f"{self.name} ({self.prefix}...)"


class OutboxEvent(models.Model):
  """
  Transactional Outbox for reliable event publishing to Redpanda.
  Events are written atomically with business state changes.
  A relay (management command or separate process) publishes them.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  topic = models.CharField(max_length=100)
  key = models.CharField(max_length=255, blank=True, null=True)  # for partitioning, e.g. uid
  payload = models.JSONField()
  headers = models.JSONField(default=dict, blank=True)
  idempotency_key = models.CharField(max_length=255, blank=True, null=True, unique=True)
  created_at = models.DateTimeField(auto_now_add=True)
  available_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
  published_at = models.DateTimeField(null=True, blank=True)
  attempts = models.IntegerField(default=0)
  last_error = models.TextField(blank=True, null=True)
  is_published = models.BooleanField(default=False)
  lease_owner = models.UUIDField(blank=True, null=True)
  lease_expires_at = models.DateTimeField(blank=True, null=True)
  dlq_at = models.DateTimeField(blank=True, null=True)

  class Meta:
    indexes = [
      models.Index(fields=["is_published", "created_at"]),
      models.Index(
        fields=["is_published", "available_at", "lease_expires_at"],
        name="monitor_out_delivery_idx",
      ),
      models.Index(fields=["topic"]),
    ]
    ordering = ["created_at"]

  def __str__(self):
    return f"Outbox {self.topic} @ {self.created_at}"


class ScheduledTaskRun(models.Model):
  """Durable, idempotent execution record for a UTC scheduler time bucket."""

  class State(models.TextChoices):
    PENDING = "pending", "Pending"
    PUBLISHED = "published", "Published"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  task_name = models.CharField(max_length=100)
  scheduled_for = models.DateTimeField()
  state = models.CharField(max_length=20, choices=State.choices, default=State.PENDING)
  attempts = models.IntegerField(default=0)
  last_error = models.TextField(blank=True, default="")
  claimed_by = models.UUIDField(blank=True, null=True)
  lease_expires_at = models.DateTimeField(blank=True, null=True)
  started_at = models.DateTimeField(blank=True, null=True)
  completed_at = models.DateTimeField(blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "scheduled_task_runs"
    constraints = [
      models.UniqueConstraint(
        fields=["task_name", "scheduled_for"], name="unique_scheduled_task_bucket"
      )
    ]
    indexes = [models.Index(fields=["state", "scheduled_for"], name="scheduled_t_state_1b67dc_idx")]


class HealthProbeObservation(models.Model):
  """Immutable raw result emitted by the Rust probe data plane."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  observation_key = models.CharField(max_length=255, unique=True)
  monitored_service = models.ForeignKey(
    MonitoredService, on_delete=models.CASCADE, related_name="probe_observations"
  )
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="probe_observations", null=True, blank=True
  )
  account_id = models.UUIDField(blank=True, null=True, db_index=True)
  is_platform = models.BooleanField(default=False, db_index=True)
  url = models.URLField()
  status_code = models.IntegerField()
  response_time_ms = models.PositiveBigIntegerField()
  is_active = models.BooleanField(default=False)
  error = models.TextField(blank=True, default="")
  observed_at = models.DateTimeField()
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "health_probe_observations"
    indexes = [
      models.Index(
        fields=["monitored_service", "observed_at"], name="health_prob_monitor_538bc5_idx"
      ),
      models.Index(
        fields=["user", "is_platform", "observed_at"], name="health_prob_user_id_672f2a_idx"
      ),
    ]


class TelemetryIngestReceipt(models.Model):
  """Kafka position receipt used to make Rust normalization idempotent."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  topic = models.CharField(max_length=100)
  partition = models.IntegerField()
  offset = models.BigIntegerField()
  account_id = models.UUIDField(blank=True, null=True, db_index=True)
  event_id = models.CharField(max_length=255, blank=True, default="")
  processed_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "telemetry_ingest_receipts"
    constraints = [
      models.UniqueConstraint(
        fields=["topic", "partition", "offset"], name="unique_telemetry_kafka_position"
      )
    ]
    indexes = [models.Index(fields=["topic", "processed_at"], name="telemetry_i_topic_590d13_idx")]


class UserLifecycleJob(models.Model):
  """Async account lifecycle work (deletion saga, future provisioning hooks)."""

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
    indexes = [
      models.Index(
        fields=["job_type", "state", "created_at"], name="user_lifecy_job_typ_0a8f2d_idx"
      ),
      models.Index(fields=["account_id"], name="user_lifecy_account_6e2b41_idx"),
    ]

  def __str__(self):
    return f"{self.job_type}:{self.state} ({self.account_id})"


class ValidatedSite(models.Model):
  """Registered domain for a user account; gates telemetry ingest (CORS)."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="validated_sites", null=True, blank=True
  )
  domain = models.CharField(max_length=255)
  is_verified = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "validated_sites"
    unique_together = ("user", "domain")

  def __str__(self):
    return f"{self.domain} ({self.user.username})"


class IncidentCase(models.Model):
  STATUS_CHOICES = [
    ("Open", "Open"),
    ("Investigating", "Investigating"),
    ("Mitigated", "Mitigated"),
    ("Resolved", "Resolved"),
    ("False Positive", "False Positive"),
  ]
  SEVERITY_CHOICES = [
    ("Low", "Low"),
    ("Medium", "Medium"),
    ("High", "High"),
    ("Critical", "Critical"),
  ]
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="incident_cases", null=True, blank=True
  )
  title = models.CharField(max_length=255)
  description = models.TextField(blank=True, null=True)
  status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="Open")
  severity = models.CharField(max_length=50, choices=SEVERITY_CHOICES, default="Medium")
  related_threats = models.ManyToManyField(
    ThreatIntelligence, related_name="incident_cases", blank=True
  )
  assigned_to = models.ForeignKey(
    User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_cases"
  )
  status_incident = models.ForeignKey(
    "Incident",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="security_cases",
    help_text="Optional public status-page incident linked from this SOC case.",
  )
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "incident_cases"
    ordering = ["-created_at"]
    indexes = [
      models.Index(fields=["created_at"]),
      models.Index(fields=["status"]),
    ]

  def __str__(self):
    return f"{self.title} ({self.status})"


class Playbook(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="playbooks", null=True, blank=True
  )
  name = models.CharField(max_length=255)
  description = models.TextField(blank=True, null=True)
  is_active = models.BooleanField(default=True)
  trigger_conditions = models.JSONField(
    default=dict, help_text="JSON representation of conditions to trigger this playbook"
  )
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "playbooks"

  def __str__(self):
    return self.name


class PlaybookAction(models.Model):
  ACTION_TYPES = [
    ("Webhook", "Webhook"),
    ("EmailAlert", "Email Alert"),
    ("BlockIP", "Block IP"),
    ("RevokeAPIKey", "Revoke API Key"),
  ]
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  playbook = models.ForeignKey(Playbook, on_delete=models.CASCADE, related_name="actions")
  action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
  configuration = models.JSONField(
    default=dict, help_text="Configuration for the action (e.g., URL for webhook)"
  )
  order = models.IntegerField(default=0, help_text="Order of execution")
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "playbook_actions"
    ordering = ["order"]

  def __str__(self):
    return f"{self.playbook.name} - {self.action_type}"


class SyntheticMonitor(models.Model):
  """Latest result of an automated synthetic health probe (e.g. the Event Projections
  loop), surfaced as a component on the platform status page. One row per named check;
  the worker upserts it on each probe."""

  STATUS_CHOICES = [
    ("Operational", "Operational"),
    ("Degraded", "Degraded"),
    ("Outage", "Outage"),
  ]

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  name = models.CharField(max_length=255, unique=True)
  status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Operational")
  latency_ms = models.IntegerField(null=True, blank=True)
  detail = models.CharField(max_length=500, blank=True, default="")
  checked_at = models.DateTimeField()

  class Meta:
    db_table = "synthetic_monitors"
    ordering = ["name"]

  def __str__(self):
    return f"{self.name} ({self.status})"


class ExportJob(models.Model):
  """Account-scoped analytics export artifact stored in RustFS (S3-compatible)."""

  class Kind(models.TextChoices):
    ANALYTICS = "analytics", "Analytics"
    THREAT = "threat", "Threat intelligence"
    LIGHTHOUSE = "lighthouse", "Lighthouse"
    VULNERABILITIES = "vulnerabilities", "Vulnerabilities"
    CUSTOM = "custom", "Custom"

  class Format(models.TextChoices):
    CSV = "csv", "CSV"
    JSON = "json", "JSON"
    PARQUET = "parquet", "Parquet"
    PDF = "pdf", "PDF"

  class Status(models.TextChoices):
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    READY = "ready", "Ready"
    FAILED = "failed", "Failed"
    EXPIRED = "expired", "Expired"

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="export_jobs")
  account_id = models.UUIDField(db_index=True)
  kind = models.CharField(max_length=32, choices=Kind.choices, default=Kind.ANALYTICS)
  format = models.CharField(max_length=16, choices=Format.choices, default=Format.CSV)
  params = models.JSONField(default=dict, blank=True)
  status = models.CharField(max_length=16, choices=Status.choices, default=Status.QUEUED)
  storage_uri = models.CharField(max_length=1024, blank=True, default="")
  object_key = models.CharField(max_length=1024, blank=True, default="")
  content_type = models.CharField(max_length=128, blank=True, default="")
  byte_size = models.BigIntegerField(default=0)
  checksum_sha256 = models.CharField(max_length=64, blank=True, default="")
  error = models.TextField(blank=True, default="")
  created_at = models.DateTimeField(auto_now_add=True)
  started_at = models.DateTimeField(null=True, blank=True)
  completed_at = models.DateTimeField(null=True, blank=True)
  expires_at = models.DateTimeField(null=True, blank=True)

  class Meta:
    db_table = "export_jobs"
    ordering = ["-created_at"]
    indexes = [
      models.Index(fields=["user", "status", "-created_at"], name="export_jobs_user_status_idx"),
      models.Index(fields=["account_id", "-created_at"], name="export_jobs_account_idx"),
      models.Index(fields=["status", "expires_at"], name="export_jobs_expiry_idx"),
    ]

  def __str__(self) -> str:
    return f"ExportJob {self.kind}/{self.format} ({self.status})"


class HoneypotEndpoint(models.Model):
  """Decoy endpoints for detecting crawlers, scanners, and malicious actors.

  Honeypots are intentionally exposed at common crawler paths (/.env, /admin, /wp-login, etc.)
  and log all interactions for threat intelligence analysis.
  """

  class TrapType(models.TextChoices):
    ENV_FILE = "env_file", "Environment File Leak"
    ADMIN_PANEL = "admin_panel", "Fake Admin Panel"
    WORDPRESS_LOGIN = "wordpress_login", "WordPress Login"
    GITLAB = "gitlab", "GitLab CI File"
    DOCKER_COMPOSE = "docker_compose", "Docker Compose File"
    DATABASE_CONFIG = "database_config", "Database Config File"
    API_SECRET = "api_secret", "Fake API Secret"
    GENERIC = "generic", "Generic Decoy"

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="honeypots", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False)
  trap_type = models.CharField(
    max_length=32, choices=TrapType.choices, default=TrapType.GENERIC
  )
  path = models.CharField(max_length=255, help_text="Relative path e.g., /.env or /admin")
  created_at = models.DateTimeField(auto_now_add=True)
  is_active = models.BooleanField(default=True)

  class Meta:
    db_table = "honeypot_endpoints"
    unique_together = ("user", "path")
    indexes = [
      models.Index(fields=["is_platform", "is_active"]),
      models.Index(fields=["created_at"]),
    ]

  def __str__(self):
    owner = "platform" if self.is_platform else f"user-{self.user_id}"
    return f"Honeypot ({self.get_trap_type_display()}) at {self.path} [{owner}]"


class HoneypotInteraction(models.Model):
  """Logged interaction with a honeypot endpoint for ML training."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  honeypot = models.ForeignKey(
    HoneypotEndpoint, on_delete=models.CASCADE, related_name="interactions"
  )
  source_ip = models.GenericIPAddressField()
  user_agent = models.TextField(null=True, blank=True)
  method = models.CharField(max_length=10, default="GET")
  timestamp = models.DateTimeField(auto_now_add=True)
  request_headers = models.JSONField(default=dict, blank=True)
  response_code = models.IntegerField(default=404)

  class Meta:
    db_table = "honeypot_interactions"
    ordering = ["-timestamp"]
    indexes = [
      models.Index(fields=["honeypot", "-timestamp"]),
      models.Index(fields=["source_ip", "-timestamp"]),
      models.Index(fields=["timestamp"]),
    ]

  def __str__(self):
    return f"Honeypot hit from {self.source_ip} at {self.timestamp}"


class BenchmarkRun(models.Model):
  """ML model self-benchmarking results for performance tracking."""

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="benchmarks", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False)
  model_type = models.CharField(max_length=32, help_text="e.g., sla, threat, spiking")
  mae = models.FloatField(help_text="Mean Absolute Error on benchmark dataset")
  rmse = models.FloatField(help_text="Root Mean Square Error")
  accuracy = models.FloatField(null=True, blank=True, help_text="Classification accuracy (0-1)")
  training_duration_seconds = models.FloatField()
  dataset_size = models.IntegerField()
  benchmark_score = models.FloatField(help_text="Normalized performance score")
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "benchmark_runs"
    ordering = ["-created_at"]
    indexes = [
      models.Index(fields=["model_type", "-created_at"]),
      models.Index(fields=["is_platform", "-created_at"]),
    ]

  def __str__(self):
    owner = "platform" if self.is_platform else f"user-{self.user_id}"
    return f"Benchmark ({self.model_type}) for {owner}: MAE={self.mae:.4f}, Score={self.benchmark_score:.2f}"
