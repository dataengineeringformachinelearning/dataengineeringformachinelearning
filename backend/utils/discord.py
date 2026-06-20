import logging
import os

import requests

logger = logging.getLogger(__name__)


def send_discord_alert(subject: str, message: str):
  """
  Sends an alert message to a Discord webhook.
  """
  webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
  if not webhook_url:
    logger.warning("DISCORD_WEBHOOK_URL is not set. Skipping Discord alert.")
    return

  payload = {"content": f"**{subject}**\n```\n{message}\n```"}

  try:
    response = requests.post(webhook_url, json=payload, timeout=5)
    response.raise_for_status()
    logger.info("Discord alert sent successfully.")
  except Exception as e:
    logger.error(f"Failed to send Discord alert: {e}")
