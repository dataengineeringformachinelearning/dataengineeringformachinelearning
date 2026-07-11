# DEML Rate Limit

Dragonfly/Redis sliding window rate limiting with security-focused COGS optimization.

## Installation

```bash
pip install deml-rate-limit
```

## Usage

```python
import redis
from deml_rate_limit import check_rate_limit, RateLimitError

client = redis.Redis.from_url("redis://localhost:6379")

# Check rate limit
allowed, count, window = check_rate_limit("user:123", client, quota=100)
if not allowed:
    raise RateLimitError("Rate limit exceeded")
```

## Features

- Sliding window algorithm
- Automatic cleanup of expired entries
- UUIDsafe keys for multi-tenant systems
