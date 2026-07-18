import logging
import time
from functools import wraps

from django.http import JsonResponse

try:
  import redis

  HAS_REDIS = True
except ImportError:
  HAS_REDIS = False

logger = logging.getLogger(__name__)

from utils.env import get_str
from utils.tls import materialize_tls_file

# Optional Redis only when REDIS_URL is set (deml-dragonfly retired).
redis_client = None
if HAS_REDIS:
  redis_url = get_str("REDIS_URL")
  if redis_url:
    try:
      redis_ca = materialize_tls_file("REDIS_SSL_CA", "REDIS_SSL_CA_B64")
      redis_client = redis.from_url(
        redis_url,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
        **({"ssl_ca_certs": redis_ca, "ssl_cert_reqs": "required"} if redis_ca else {}),
      )
    except Exception as e:
      logger.error("Failed to connect to redis: %s", e)
      redis_client = None

BLOCKLIST_PREFIX = "deml:blocked_ip:"


def block_ip(ip: str, ttl_seconds: int = 86400) -> bool:
  """Add IP to edge blocklist (Dragonfly/Redis). Best-effort."""
  if not redis_client or not ip:
    return False
  try:
    redis_client.setex(f"{BLOCKLIST_PREFIX}{ip}", ttl_seconds, "1")
    return True
  except Exception as exc:
    logger.error("Failed to block IP %s: %s", ip, exc)
    return False


def is_ip_blocked(ip: str) -> bool:
  if not redis_client or not ip:
    return False
  try:
    return bool(redis_client.exists(f"{BLOCKLIST_PREFIX}{ip}"))
  except Exception:
    return False


def get_user_rate_limit(user):
  """Return max requests per minute based on user profile tier."""
  if not user:
    return 60

  profile = getattr(user, "profile", None)
  if profile and profile.tier == "Pro":
    return 1000
  return 60


def get_tenant_rate_limit(tenant_or_user):
  """Backward-compatible alias for rate limit tier lookup."""
  if tenant_or_user is None:
    return 60
  if hasattr(tenant_or_user, "tier") and not hasattr(tenant_or_user, "profile"):
    return 1000 if tenant_or_user.tier == "Pro" else 60
  return get_user_rate_limit(tenant_or_user)


def rate_limit():
  """
  Ninja decorator to enforce rate limits per user account.
  Assumes request.auth contains the authenticated User (like from IntegrationAPIKeyAuth).
  """

  def decorator(func):
    @wraps(func)
    async def async_wrapper(request, *args, **kwargs):
      if not redis_client:
        logger.warning("Redis not available, skipping rate limit check.")
        return await func(request, *args, **kwargs)

      user = getattr(request, "auth", None)
      client_ip = request.META.get("REMOTE_ADDR", "unknown")
      if not user:
        key = f"rate_limit:ip:{client_ip}"
        limit = 60
      else:
        from asgiref.sync import sync_to_async

        @sync_to_async
        def get_limit_and_key(u):
          profile = getattr(u, "profile", None)
          if profile:
            return get_user_rate_limit(u), f"rate_limit:account:{profile.account_id}"
          return 60, f"rate_limit:user:{u.id}"

        limit, key = await get_limit_and_key(user)

      current_time = time.time()
      window_start = current_time - 60
      request_member = str(time.time_ns())

      from asgiref.sync import sync_to_async

      @sync_to_async
      def check_redis():
        try:
          pipe = redis_client.pipeline()
          pipe.zremrangebyscore(key, 0, window_start)
          pipe.zcard(key)
          pipe.zadd(key, {request_member: current_time})
          pipe.expire(key, 60)
          results = pipe.execute()
          return results[1]
        except Exception as e:
          logger.error(f"Redis rate limit check failed: {e}")
          return 0

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
      client_ip = request.META.get("REMOTE_ADDR", "unknown")
      if not user:
        key = f"rate_limit:ip:{client_ip}"
        limit = 60
      else:
        profile = getattr(user, "profile", None)
        if profile:
          limit = get_user_rate_limit(user)
          key = f"rate_limit:account:{profile.account_id}"
        else:
          limit = 60
          key = f"rate_limit:user:{user.id}"

      current_time = time.time()
      window_start = current_time - 60
      request_member = str(time.time_ns())

      try:
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {request_member: current_time})
        pipe.expire(key, 60)
        results = pipe.execute()
        request_count = results[1]
      except Exception as e:
        logger.error(f"Redis rate limit check failed: {e}")
        request_count = 0

      if request_count >= limit:
        return JsonResponse(
          {"detail": "Rate limit exceeded. Please upgrade your tier or try again later."},
          status=429,
        )

      return func(request, *args, **kwargs)

    import inspect

    if inspect.iscoroutinefunction(func):
      return async_wrapper
    return sync_wrapper

  return decorator
