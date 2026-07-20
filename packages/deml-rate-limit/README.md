# DEML Rate Limit

Standalone Redis/Dragonfly sliding-window rate limiting for optional deployments.

**Not used by the DEML control plane.** Production DEML (`deml-backend`) enforces
API quotas via Postgres-backed `HeadlessRateLimitBucket` (`config/headless_rate_limit.py`).
`REDIS_URL` is forbidden on the primary Fly backend profile. Use this package only
when you deliberately run a Redis-adjacent edge quota service outside DEML.

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
