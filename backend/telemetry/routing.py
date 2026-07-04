from django.urls import re_path

from . import consumers, session_consumer

websocket_urlpatterns = [
  re_path(r"ws/telemetry/(?P<tenant_slug>[\w-]+)/$", consumers.TelemetryConsumer.as_asgi()),
  re_path(r"ws/session/$", session_consumer.SessionConsumer.as_asgi()),
]
