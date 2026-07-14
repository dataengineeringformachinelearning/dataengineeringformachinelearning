from typing import Any
from unittest.mock import MagicMock, patch

from config.email import RESEND_REQUEST_TIMEOUT_SECONDS, send_resend_email


def test_send_resend_email_uses_bounded_timeout(settings: Any) -> None:
  settings.RESEND_API_KEY = "test-resend-key"  # pragma: allowlist secret
  response = MagicMock()
  response.__enter__.return_value.read.return_value = b'{"id":"email-1"}'

  with patch(
    "config.email.urllib.request.urlopen",
    return_value=response,
  ) as mock_urlopen:
    sent = send_resend_email(
      "operator@example.com",
      "DEML notification",
      "<p>Delivered</p>",
    )

  assert sent is True
  mock_urlopen.assert_called_once()
  assert mock_urlopen.call_args.kwargs["timeout"] == RESEND_REQUEST_TIMEOUT_SECONDS
