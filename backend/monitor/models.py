import uuid
from django.db import models

class Endpoints(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField()
    last_tested = models.DateTimeField(auto_now=True)
    status_code = models.IntegerField()
    response_time = models.DurationField()
    ip_address = models.GenericIPAddressField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'endpoints'

    def __str__(self):
        return self.url
