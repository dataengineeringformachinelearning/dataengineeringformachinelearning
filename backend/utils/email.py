"""Transactional alert email via Resend (control-plane notifications only)."""

import logging
import os

import resend

logger = logging.getLogger(__name__)


def send_alert_email(subject: str, message: str):
  """Send an alert email using Resend with a marketing-style HTML template."""
  from django.conf import settings

  api_key = getattr(settings, "RESEND_API_KEY", "") or os.environ.get("RESEND_API_KEY")
  if not api_key:
    logger.warning("RESEND_API_KEY is not set. Skipping email sending.")
    return

  resend.api_key = api_key

  target_email = getattr(settings, "ALERT_EMAIL_TARGET", "") or os.environ.get("ALERT_EMAIL_TARGET")
  if not target_email:
    logger.warning("ALERT_EMAIL_TARGET is not set. Skipping email sending.")
    return

  from_email = (
    getattr(settings, "ALERT_EMAIL_FROM", "")
    or os.environ.get("ALERT_EMAIL_FROM")
    or "notifications@deml.app"
  )

  html_message = f"""
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
      body {{
        margin: 0;
        padding: 0;
        background-color: #f4f5f7;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        color: #111111;
      }}
      table {{ border-collapse: collapse; }}
      .container {{
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        margin-top: 40px;
        margin-bottom: 40px;
      }}
      .header {{
        background-color: #111111;
        padding: 30px 40px;
        text-align: center;
      }}
      .header h1 {{
        color: #ffffff;
        margin: 0;
        font-size: 24px;
        letter-spacing: -0.02em;
        font-weight: 600;
      }}
      .hero {{
        padding: 40px 40px 20px;
        text-align: center;
      }}
      .hero h2 {{
        margin: 0 0 15px;
        font-size: 22px;
        color: #0d7377;
        font-weight: 600;
        letter-spacing: -0.02em;
      }}
      .hero p {{
        margin: 0;
        font-size: 16px;
        line-height: 1.6;
        color: #555555;
      }}
      .content {{
        padding: 0 40px 40px;
      }}
      .alert-box {{
        background-color: #f8f9fa;
        border-left: 4px solid #0d7377;
        padding: 20px;
        border-radius: 4px;
        margin-bottom: 30px;
      }}
      .alert-box pre {{
        margin: 0;
        font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace;
        font-size: 13px;
        line-height: 1.5;
        color: #111111;
        white-space: pre-wrap;
      }}
      .cta {{
        text-align: center;
        margin: 30px 0;
      }}
      .cta a {{
        background-color: #0d7377;
        color: #ffffff;
        text-decoration: none;
        padding: 14px 28px;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        display: inline-block;
      }}
      .footer {{
        background-color: #f4f5f7;
        padding: 30px 40px;
        text-align: center;
        font-size: 13px;
        color: #888888;
        line-height: 1.5;
      }}
      .footer a {{
        color: #0d7377;
        text-decoration: none;
      }}
    </style>
  </head>
  <body>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f5f7">
      <tr>
        <td align="center">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>DEML Platform</h1>
            </div>

            <!-- Hero Section -->
            <div class="hero">
              <h2>System Alert Notification</h2>
              <p>We've detected a new event on your infrastructure that requires your attention. Please review the details below.</p>
            </div>

            <!-- Main Content -->
            <div class="content">
              <div style="font-weight: 600; margin-bottom: 10px; color: #111111; font-size: 15px;">Event Overview: {subject}</div>
              <div class="alert-box">
                <pre>{message}</pre>
              </div>

               <div class="cta">
                <a href="https://deml.app/analytics">View Analytics Dashboard</a>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 20px; line-height: 1.5;">
                If you have any questions or need immediate assistance, please contact our support team at <a href="mailto:support@deml.app" style="color: #0d7377;">support@deml.app</a>.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p>
                &copy; 2026 Data Engineering for Machine Learning Platform.<br>
                Automated System Notification.
              </p>
              <p>
                You received this email because you are subscribed to critical alerts.<br>
                <a href="#">Manage Preferences</a> | <a href="#">Unsubscribe</a>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
  </html>
  """

  try:
    r = resend.Emails.send(
      {
        "from": from_email,
        "to": target_email,
        "subject": subject,
        "text": message,
        "html": html_message,
      }
    )
    logger.info("Alert email sent successfully: %s", r)
  except Exception as e:
    logger.error("Failed to send alert email: %s", e)
