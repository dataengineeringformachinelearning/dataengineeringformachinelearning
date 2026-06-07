from typing import Any

def get_client_ip(request: Any) -> str:
    """Extracts the client IP address from a request, accounting for proxies/x-forwarded-for."""
    x_forwarded_for = request.headers.get('x-forwarded-for')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')

def get_user_agent(request: Any) -> str:
    """Extracts the User-Agent header from a request."""
    return request.headers.get('user-agent', request.META.get('HTTP_USER_AGENT', ''))
