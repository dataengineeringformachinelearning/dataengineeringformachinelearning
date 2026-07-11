import asyncio
import os
import ssl
from typing import Any

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer, TopicPartition

from utils.env import is_production
from utils.internode_encryption import decrypt_kafka_value, encrypt_kafka_value
from utils.tls import materialize_tls_file

_producers = {}


def get_kafka_brokers() -> str:
  """Returns the list of bootstrap servers from the environment."""
  default_broker = (
    "deml-queue.railway.internal:9092" if os.getenv("RAILWAY_ENVIRONMENT") else "localhost:19092"
  )
  return os.environ.get("REDPANDA_BROKERS", default_broker)


def get_kafka_client_config() -> dict[str, Any]:
  """Return verified TLS/SASL settings shared by every Python Kafka client."""
  default_protocol = "SASL_SSL" if is_production() else "PLAINTEXT"
  protocol = os.getenv("REDPANDA_SECURITY_PROTOCOL", default_protocol).strip().upper()
  valid_protocols = {"PLAINTEXT", "SSL", "SASL_PLAINTEXT", "SASL_SSL"}
  if protocol not in valid_protocols:
    raise RuntimeError(f"REDPANDA_SECURITY_PROTOCOL must be one of {sorted(valid_protocols)}")
  if is_production() and protocol not in {"SSL", "SASL_SSL"}:
    raise RuntimeError("production Redpanda connections must use SSL or SASL_SSL")

  config: dict[str, Any] = {
    "bootstrap_servers": get_kafka_brokers(),
    "security_protocol": protocol,
  }
  if protocol in {"SSL", "SASL_SSL"}:
    cafile = materialize_tls_file("REDPANDA_SSL_CA")
    certfile = materialize_tls_file("REDPANDA_SSL_CERT")
    keyfile = materialize_tls_file("REDPANDA_SSL_KEY")
    if bool(certfile) != bool(keyfile):
      raise RuntimeError("REDPANDA_SSL_CERT and REDPANDA_SSL_KEY must be configured together")
    if is_production() and (not cafile or not certfile or not keyfile):
      raise RuntimeError("production Redpanda mTLS requires a CA, client certificate, and key")
    config["ssl_context"] = ssl.create_default_context(
      purpose=ssl.Purpose.SERVER_AUTH,
      cafile=cafile,
    )
    if certfile and keyfile:
      config["ssl_context"].load_cert_chain(certfile=certfile, keyfile=keyfile)
  if protocol.startswith("SASL_"):
    username = (os.getenv("REDPANDA_SASL_USERNAME") or "").strip()
    password = (os.getenv("REDPANDA_SASL_PASSWORD") or "").strip()
    if not username or not password:
      raise RuntimeError("SASL Redpanda transport requires username and password")
    config.update(
      sasl_mechanism=os.getenv("REDPANDA_SASL_MECHANISM", "SCRAM-SHA-256"),
      sasl_plain_username=username,
      sasl_plain_password=password,
    )
  return config


async def send_kafka_value(
  producer: AIOKafkaProducer,
  topic: str,
  value: bytes,
  **kwargs: Any,
) -> Any:
  """Encrypt a durable message, bind it to its topic, and await broker acknowledgement."""
  return await producer.send_and_wait(topic, encrypt_kafka_value(value, topic), **kwargs)


def decode_kafka_value(value: bytes, topic: str) -> bytes:
  """Authenticate and decrypt a durable message received from a topic."""
  return decrypt_kafka_value(value, topic)


async def get_kafka_producer() -> AIOKafkaProducer:
  """Returns a running AIOKafkaProducer bound to the current event loop."""
  global _producers
  loop = asyncio.get_running_loop()

  if loop not in _producers:
    producer = AIOKafkaProducer(**get_kafka_client_config())
    try:
      await asyncio.wait_for(producer.start(), timeout=5.0)
      _producers[loop] = producer
    except asyncio.TimeoutError as err:
      raise ConnectionError("Failed to connect to Kafka broker (timeout)") from err

  return _producers[loop]


def create_kafka_producer() -> AIOKafkaProducer:
  """Creates a new instance of AIOKafkaProducer. The caller is responsible for starting and stopping it."""
  return AIOKafkaProducer(**get_kafka_client_config())


async def get_kafka_consumer_lag(topic: str, group_id: str) -> int:
  """Return pending records for a topic/consumer group across all partitions.

  This measures actionable DLQ backlog rather than retained topic size: records
  stop contributing after the replay consumer commits them, even while Redpanda
  retains the underlying audit history.
  """
  consumer = AIOKafkaConsumer(
    **get_kafka_client_config(),
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
