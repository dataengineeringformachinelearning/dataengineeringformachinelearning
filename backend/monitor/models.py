import uuid

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class StatusPage(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="status_pages")
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


class Endpoints(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  url = models.URLField()
  last_tested = models.DateTimeField(auto_now=True)
  status_code = models.IntegerField()
  response_time = models.DurationField()
  ip_address = models.GenericIPAddressField(null=True, blank=True)
  is_active = models.BooleanField(default=True)

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

  def __str__(self):
    return f"{self.title} - {self.severity} ({self.status})"


class AuditLog(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
  )
  action = models.CharField(max_length=255)  # e.g., "STATUS_PAGE_CREATE", "INCIDENT_UPDATE"
  resource_id = models.CharField(max_length=255, blank=True, null=True)
  details = models.JSONField(default=dict, blank=True)
  ip_address = models.GenericIPAddressField(null=True, blank=True)
  user_agent = models.TextField(null=True, blank=True)
  timestamp = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "audit_logs"
    ordering = ["-timestamp"]

  def __str__(self):
    user_str = self.user.username if self.user else "Anonymous"
    return f"{self.timestamp} - {user_str} - {self.action}"


class UserProfile(models.Model):
  ROLE_CHOICES = [
    ("Viewer", "Viewer"),
    ("Operator", "Operator"),
    ("Security Admin", "Security Admin"),
  ]
  user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
  role = models.CharField(max_length=50, choices=ROLE_CHOICES, default="Viewer")

  class Meta:
    db_table = "user_profiles"

  def __str__(self):
    return f"{self.user.username} - {self.role}"


class ThreatIntelligence(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="threat_intelligence", null=True, blank=True
  )
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

  def __str__(self):
    return f"{self.source} - {self.ip_address or self.location} ({self.timestamp})"
