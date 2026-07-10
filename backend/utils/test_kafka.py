from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from aiokafka import TopicPartition

from utils.kafka import get_kafka_consumer_lag


@pytest.mark.asyncio
async def test_kafka_consumer_lag_uses_committed_offsets() -> None:
  first = TopicPartition("frontend-events-dlq", 0)
  second = TopicPartition("frontend-events-dlq", 1)
  consumer = MagicMock()
  consumer.start = AsyncMock()
  consumer.stop = AsyncMock()
  consumer.topics = AsyncMock(return_value={"frontend-events-dlq"})
  consumer.partitions_for_topic = MagicMock(return_value={0, 1})
  consumer.beginning_offsets = AsyncMock(return_value={first: 0, second: 5})
  consumer.end_offsets = AsyncMock(return_value={first: 10, second: 15})
  consumer.committed = AsyncMock(side_effect=[7, None])

  with patch("utils.kafka.AIOKafkaConsumer", return_value=consumer):
    lag = await get_kafka_consumer_lag("frontend-events-dlq", "projection-dlq-replay")

  assert lag == 13
  consumer.start.assert_awaited_once()
  consumer.stop.assert_awaited_once()
