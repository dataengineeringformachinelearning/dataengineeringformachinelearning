from __future__ import annotations

import pytest
from asgiref.sync import sync_to_async
from monitor.models import OutboxEvent

from integrations.api import _enqueue_outbox_event


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_integration_event_is_durably_enqueued() -> None:
  await _enqueue_outbox_event(
    "app-events",
    "8a7e3f42-10c0-4f99-a5ad-fd30d4b28e35",
    {"event_type": "prediction", "inputs": [0.5]},
  )

  event = await sync_to_async(OutboxEvent.objects.get)(
    topic="app-events", key="8a7e3f42-10c0-4f99-a5ad-fd30d4b28e35"
  )
  assert event.topic == "app-events"
  assert event.key == "8a7e3f42-10c0-4f99-a5ad-fd30d4b28e35"
  assert event.payload["event_type"] == "prediction"
  assert event.headers == {"version": "1.0", "event_type": "prediction"}
