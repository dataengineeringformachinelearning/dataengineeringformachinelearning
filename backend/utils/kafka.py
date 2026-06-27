import asyncio
import os

from aiokafka import AIOKafkaProducer

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
