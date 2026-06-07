import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class StatusPage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="status_pages")
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'status_pages'

    def __str__(self):
        return self.title

class MonitoredService(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status_page = models.ForeignKey(StatusPage, on_delete=models.CASCADE, related_name="services")
    name = models.CharField(max_length=255)
    url = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'monitored_services'

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
        db_table = 'endpoints'

    def __str__(self):
        return self.url
