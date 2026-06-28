import uuid

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class TrainingRun(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="training_runs", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False)
  created_at = models.DateTimeField(auto_now_add=True)
  average_sla = models.FloatField()
  loss = models.FloatField()

  class Meta:
    db_table = "training_runs"
    ordering = ["-created_at"]
    indexes = [
      models.Index(fields=["created_at"]),
    ]

  def __str__(self):
    return f"TrainingRun {self.id} (SLA: {self.average_sla:.2f})"


class ThreatReport(models.Model):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="threat_reports", null=True, blank=True
  )
  is_platform = models.BooleanField(default=False)
  anomaly_score = models.FloatField()
  top_location = models.CharField(max_length=255, default="Unknown")
  location_weight = models.FloatField(default=0.0)
  suspicious_ratio = models.FloatField(default=0.0)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = "threat_reports"
    ordering = ["-created_at"]
    indexes = [
      models.Index(fields=["created_at"]),
    ]

  def __str__(self):
    return f"ThreatReport {self.id} (Anomaly: {self.anomaly_score:.2%})"
