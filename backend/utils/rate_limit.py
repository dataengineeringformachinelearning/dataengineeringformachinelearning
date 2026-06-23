import logging
import time
from functools import wraps

from django.conf import settings
from django.http import JsonResponse

try:
  import redis

  HAS_REDIS = True
except ImportError:
  HAS_REDIS = False

logger = logging.getLogger(__name__)

# Initialize redis connection
redis_host = getattr(settings, "REDIS_HOST", "dragonfly")
redis_port = getattr(settings, "REDIS_PORT", 6379)

if HAS_REDIS:
  try:
    redis_client = redis.Redis(host=redis_host, port=redis_port, db=0, decode_responses=True)
  except Exception as e:
    logger.error(f"Failed to connect to redis: {e}")
    redis_client = None
else:
  redis_client = None


def get_tenant_rate_limit(tenant):
  """Return max requests per minute based on tenant tier"""
  if not tenant:
    return 60  # default fallback

  if tenant.tier == "Pro":
    return 1000
  return 60  # Standard tier


def rate_limit():
  """
  Ninja decorator to enforce rate limits per Tenant.
  Assumes request.auth contains the authenticated User (like from IntegrationAPIKeyAuth).
  """

  def decorator(func):
    @wraps(func)
    async def async_wrapper(request, *args, **kwargs):
      if not redis_client:
        logger.warning("Redis not available, skipping rate limit check.")
        return await func(request, *args, **kwargs)

      user = getattr(request, "auth", None)
      if not user:
        client_ip = request.META.get("REMOTE_ADDR", "unknown")
        key = f"rate_limit:ip:{client_ip}"
        limit = 60
      else:
        # Synchronous ORM calls should be wrapped in sync_to_async or pre-fetched, but since it's an async endpoint we might need to handle it.
        # However, ninja handles async auth by running auth in threadpool if it's sync.
        # Let's just use sync_to_async for the membership lookup to be safe.
        from asgiref.sync import sync_to_async

        @sync_to_async
        def get_limit_and_key(u):
          membership = u.tenant_memberships.first()
          if membership:
            t = membership.tenant
            return get_tenant_rate_limit(t), f"rate_limit:tenant:{t.id}"
          return 60, f"rate_limit:user:{u.id}"

        limit, key = await get_limit_and_key(user)

      current_time = int(time.time())
      window_start = current_time - 60

      # redis-py is sync, but we are in async. Should run in threadpool.
      from asgiref.sync import sync_to_async

      @sync_to_async
      def check_redis():
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.expire(key, 60)
        results = pipe.execute()
        return results[1]

      request_count = await check_redis()

      if request_count >= limit:
        return JsonResponse(
          {"detail": "Rate limit exceeded. Please upgrade your tier or try again later."},
          status=429,
        )

      return await func(request, *args, **kwargs)

    @wraps(func)
    def sync_wrapper(request, *args, **kwargs):
      if not redis_client:
        logger.warning("Redis not available, skipping rate limit check.")
        return func(request, *args, **kwargs)

      user = getattr(request, "auth", None)
      if not user:
        client_ip = request.META.get("REMOTE_ADDR", "unknown")
        key = f"rate_limit:ip:{client_ip}"
        limit = 60
      else:
        membership = user.tenant_memberships.first()
        if membership:
          tenant = membership.tenant
          limit = get_tenant_rate_limit(tenant)
          key = f"rate_limit:tenant:{tenant.id}"
        else:
          limit = 60
          key = f"rate_limit:user:{user.id}"

      current_time = int(time.time())
      window_start = current_time - 60

      pipe = redis_client.pipeline()
      pipe.zremrangebyscore(key, 0, window_start)
      pipe.zcard(key)
      pipe.zadd(key, {str(current_time): current_time})
      pipe.expire(key, 60)
      results = pipe.execute()

      request_count = results[1]

      if request_count >= limit:
        return JsonResponse(
          {"detail": "Rate limit exceeded. Please upgrade your tier or try again later."},
          status=429,
        )

      return func(request, *args, **kwargs)

    import asyncio

    if asyncio.iscoroutinefunction(func):
      return async_wrapper
    return sync_wrapper

  return decorator
