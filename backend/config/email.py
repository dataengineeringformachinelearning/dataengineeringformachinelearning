import json
import logging
import urllib.error
import urllib.request
from typing import Final

from django.conf import settings

logger = logging.getLogger(__name__)
RESEND_REQUEST_TIMEOUT_SECONDS: Final[float] = 10.0


def send_resend_email(to_email: str, subject: str, html_content: str) -> bool:
  api_key = getattr(settings, "RESEND_API_KEY", None)
  if not api_key:
    logger.warning("RESEND_API_KEY not set — email delivery skipped (fallback mode)")
    return False

  url = "https://api.resend.com/emails"
  headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
  payload = {
    "from": "DEML (DATA ENGINEERING FOR MACHINE LEARNING) <notifications@deml.app>",
    "to": [to_email],
    "subject": subject,
    "html": html_content,
  }

  req = urllib.request.Request(
    url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST"
  )
  try:
    # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
    with urllib.request.urlopen(req, timeout=RESEND_REQUEST_TIMEOUT_SECONDS) as response:
      res_body = response.read().decode("utf-8")
      logger.info("Resend delivery successful — response: %s", res_body)
      return True
  except urllib.error.HTTPError as e:
    logger.error("Resend HTTP error: %s — %s", e.code, e.read().decode("utf-8"))
    return False
  except Exception as e:
    logger.error("Resend request error: %s", e)
    return False
