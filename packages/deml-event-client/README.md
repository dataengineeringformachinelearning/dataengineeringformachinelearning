# DEML Event Client

Redpanda/Kafka client with outbox patterns for DEML Platform.

## Installation

```bash
pip install deml-event-client
```

## Usage

```python
from deml_event_client import get_producer_config, get_consumer_config, serialize_event

# For producers
producer_conf = get_producer_config()

# For consumers
consumer_conf = get_consumer_config("telemetry-raw")

# Serialize events
event_bytes = serialize_event({"type": "user_action", "data": {...}})
```

## Features

- Transactional outbox pattern support
- Symmetrical multi-tenant pipeline design
- UUID-scoped event production
- Compression and batching optimized

## License

MIT
