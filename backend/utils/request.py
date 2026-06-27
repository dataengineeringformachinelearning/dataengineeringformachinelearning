from typing import Any


def get_client_ip(request: Any) -> str:
  """Extracts the client IP address from a request, accounting for proxies/x-forwarded-for."""
  x_forwarded_for = request.headers.get("x-forwarded-for") or request.META.get(
    "HTTP_X_FORWARDED_FOR"
  )
  if x_forwarded_for:
    return x_forwarded_for.split(",")[0].strip()
  return request.META.get("REMOTE_ADDR", "")


def get_user_agent(request: Any) -> str:
  """Extracts the User-Agent header from a request."""
  return request.headers.get("user-agent", request.META.get("HTTP_USER_AGENT", ""))


def anonymize_ip(ip: str) -> str:
  """Anonymizes the last octet of IPv4 or the last 64 bits of IPv6 addresses."""
  if not ip:
    return ""
  ip = ip.strip()
  if ":" in ip:  # IPv6
    # Keep the first 4 blocks and replace the rest with ::
    parts = ip.split(":")
    if len(parts) >= 4:
      return ":".join(parts[:4]) + "::"
    return ip
  else:  # IPv4
    parts = ip.split(".")
    if len(parts) == 4:
      return f"{parts[0]}.{parts[1]}.{parts[2]}.0"
    return ip
