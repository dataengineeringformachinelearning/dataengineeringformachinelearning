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
  created_at = models.DateTimeField(auto_now_add=True)
  published_at = models.DateTimeField(null=True, blank=True)
  attempts = models.IntegerField(default=0)
  last_error = models.TextField(blank=True, null=True)
  is_published = models.BooleanField(default=False)

  class Meta:
    indexes = [
      models.Index(fields=["is_published", "created_at"]),
      models.Index(fields=["topic"]),
    ]
    ordering = ["created_at"]

  def __str__(self):
    return f"Outbox {self.topic} @ {self.created_at}"


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
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "incident_cases"
    ordering = ["-created_at"]

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
  checked_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = "synthetic_monitors"
    ordering = ["name"]

  def __str__(self):
    return f"{self.name} ({self.status})"
