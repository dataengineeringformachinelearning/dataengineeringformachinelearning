import logging
import os

import resend

logger = logging.getLogger(__name__)


def get_recent_stats_text() -> str:
  """
  Retrieves the most recent 1h bucket of AggregatedAnalytics as a formatted string.
  """
  try:
    from monitor.models import AggregatedAnalytics

    recent = AggregatedAnalytics.objects.filter(bucket_size="1h").order_by("-timestamp").first()
    if not recent:
      return "No recent stats available."

    return (
      f"--- Recent Stats (Since {recent.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}) ---\n"
      f"Total Requests: {recent.total_requests}\n"
      f"Avg Latency: {recent.avg_latency_ms:.2f} ms\n"
      f"P99 Latency: {recent.p99_latency_ms:.2f} ms\n"
      f"Error Rate: {recent.error_rate_percent:.2f}%\n"
      f"Threats Detected: {recent.threats_detected}\n"
      f"Active Incidents: {recent.active_incidents}\n"
      f"Unique Visitors: {recent.unique_visitors}\n"
    )
  except Exception as e:
    logger.error(f"Failed to fetch recent stats for email: {e}")
    return "Failed to fetch recent stats."


def send_alert_email(subject: str, message: str):
  """
  Sends an alert email using the Resend API.
  """
  api_key = os.environ.get("RESEND_API_KEY")
  if not api_key:
    logger.warning("RESEND_API_KEY is not set. Skipping email sending.")
    return

  resend.api_key = api_key

  target_email = os.environ.get("ALERT_EMAIL_TARGET")
  if not target_email:
    logger.warning("ALERT_EMAIL_TARGET is not set. Skipping email sending.")
    return

  from_email = os.environ.get(
    "ALERT_EMAIL_FROM", "notifications@dataengineeringformachinelearning.com"
  )

  try:
    r = resend.Emails.send(
      {"from": from_email, "to": target_email, "subject": subject, "text": message}
    )
    logger.info(f"Alert email sent successfully: {r}")
  except Exception as e:
    logger.error(f"Failed to send alert email: {e}")
