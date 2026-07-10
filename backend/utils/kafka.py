import asyncio
import os

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer, TopicPartition

_producers = {}


def get_kafka_brokers() -> str:
  """Returns the list of bootstrap servers from the environment."""
  default_broker = (
    "deml-queue.railway.internal:9092" if os.getenv("RAILWAY_ENVIRONMENT") else "localhost:19092"
  )
  return os.environ.get("REDPANDA_BROKERS", default_broker)


async def get_kafka_producer() -> AIOKafkaProducer:
  """Returns a running AIOKafkaProducer bound to the current event loop."""
  global _producers
  loop = asyncio.get_running_loop()

  if loop not in _producers:
    producer = AIOKafkaProducer(bootstrap_servers=get_kafka_brokers())
    try:
      await asyncio.wait_for(producer.start(), timeout=5.0)
      _producers[loop] = producer
    except asyncio.TimeoutError as err:
      raise ConnectionError("Failed to connect to Kafka broker (timeout)") from err

  return _producers[loop]


def create_kafka_producer() -> AIOKafkaProducer:
  """Creates a new instance of AIOKafkaProducer. The caller is responsible for starting and stopping it."""
  return AIOKafkaProducer(bootstrap_servers=get_kafka_brokers())


async def get_kafka_consumer_lag(topic: str, group_id: str) -> int:
  """Return pending records for a topic/consumer group across all partitions.

  This measures actionable DLQ backlog rather than retained topic size: records
  stop contributing after the replay consumer commits them, even while Redpanda
  retains the underlying audit history.
  """
  consumer = AIOKafkaConsumer(
    bootstrap_servers=get_kafka_brokers(),
    group_id=group_id,
    enable_auto_commit=False,
  )
  await consumer.start()
  try:
    await consumer.topics()  # Refresh metadata without joining the replay group.
    partitions = consumer.partitions_for_topic(topic)
    if not partitions:
      return 0
    topic_partitions = [TopicPartition(topic, partition) for partition in partitions]
    beginnings = await consumer.beginning_offsets(topic_partitions)
    ends = await consumer.end_offsets(topic_partitions)
    lag = 0
    for topic_partition in topic_partitions:
      committed = await consumer.committed(topic_partition)
      current = (
        max(committed, beginnings[topic_partition])
        if committed is not None
        else beginnings[topic_partition]
      )
      lag += max(0, ends[topic_partition] - current)
    return lag
  finally:
    await consumer.stop()
