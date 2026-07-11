"""DEML Event Client - Redpanda/Kafka client with outbox patterns.

Provides durable event production and consumption for symmetrical multi-tenant
pipelines with transactional outbox support.
"""

import json
import os
from typing import Any, Final

__version__ = "0.1.0"

# Configuration from environment
REQUIRED_ENV_VARS: Final = [
    "REDPANDA_BROKERS",
    "REDPANDA_SASL_USERNAME",
    "REDPANDA_SASL_PASSWORD",
]

BROKERS: Final[str] = os.getenv("REDPANDA_BROKERS", "")
SECURITY_PROTOCOL: Final[str] = os.getenv("REDPANDA_SECURITY_PROTOCOL", "SASL_SSL")
SASL_USERNAME: Final[str] = os.getenv("REDPANDA_SASL_USERNAME", "")
SASL_PASSWORD: Final[str] = os.getenv("REDPANDA_SASL_PASSWORD", "")


def get_producer_config() -> dict[str, Any]:
    """Get Kafka producer configuration for Redpanda."""
    return {
        "bootstrap.servers": BROKERS,
        "security.protocol": SECURITY_PROTOCOL,
        "sasl.mechanism": "SCRAM-SHA-256",
        "sasl.username": SASL_USERNAME,
        "sasl.password": SASL_PASSWORD,
        "client.id": os.getenv("DEML_NODE_ID", "deml-client"),
    }


def get_consumer_config(topic: str, group_id: str | None = None) -> dict[str, Any]:
    """Get Kafka consumer configuration for Redpanda."""
    config = get_producer_config()
    config["group.id"] = group_id or f"deml-{topic}-consumer"
    config["auto.offset.reset"] = "earliest"
    return config


def serialize_event(event: dict[str, Any]) -> bytes:
    """Serialize event to JSON bytes for Kafka production."""
    return json.dumps(event).encode("utf-8")


def deserialize_event(data: bytes) -> dict[str, Any]:
    """Deserialize JSON bytes from Kafka to event dict."""
    return json.loads(data.decode("utf-8"))
