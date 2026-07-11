"""DEML Rate Limit - Dragonfly/Redis sliding window rate limiting.

Provides security-focused rate limiting with COGS optimization.
"""

import time
from typing import Any

__version__ = "0.1.0"

DEFAULT_QUOTA_PER_MINUTE = 60


class RateLimitError(Exception):
    """Raised when rate limit is exceeded."""


def check_rate_limit(
    key: str,
    redis_client: Any = None,
    quota: int = DEFAULT_QUOTA_PER_MINUTE,
    window_seconds: int = 60,
) -> tuple[bool, int, int]:
    """Check rate limit and increment counter.
    
    Args:
        key: Unique identifier (e.g., account:uuid)
        redis_client: Redis/Dragonfly client
        quota: Max requests per window
        window_seconds: Sliding window duration
        
    Returns:
        Tuple of (is_allowed, current_count, window_seconds)
    """
    if not redis_client:
        return True, 0, window_seconds
    
    try:
        current_time = int(time.time())
        window_start = current_time - window_seconds
        
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.expire(key, window_seconds)
        results = pipe.execute()
        
        current_count = results[1] + 1
        is_allowed = current_count <= quota
        
        if not is_allowed:
            # Remove the entry we just added
            redis_client.zrem(key, str(current_time))
            
        return is_allowed, current_count, window_seconds
    except Exception:
        return True, 0, window_seconds
