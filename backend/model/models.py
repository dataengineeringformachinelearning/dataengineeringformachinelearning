import uuid
from django.db import models

class TrainingRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    average_sla = models.FloatField()
    loss = models.FloatField()

    class Meta:
        db_table = 'training_runs'
        ordering = ['-created_at']

    def __str__(self):
        return f"TrainingRun {self.id} (SLA: {self.average_sla:.2f})"

