import json
import urllib.error
import urllib.request

from django.conf import settings


def send_resend_email(to_email, subject, html_content):
  api_key = getattr(settings, "RESEND_API_KEY", None)
  if not api_key:
    print("RESEND_API_KEY not set. Email logging (fallback):")
    print(f"To: {to_email}\nSubject: {subject}\nContent: {html_content}")
    return False

  url = "https://api.resend.com/emails"
  headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
  payload = {
    "from": "Acme <onboarding@resend.dev>",
    "to": [to_email],
    "subject": subject,
    "html": html_content,
  }

  req = urllib.request.Request(
    url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST"
  )
  try:
    with urllib.request.urlopen(req) as response:
      res_body = response.read().decode("utf-8")
      print("Resend response:", res_body)
      return True
  except urllib.error.HTTPError as e:
    print("Resend HTTP error:", e.code, e.read().decode("utf-8"))
    return False
  except Exception as e:
    print("Resend request error:", e)
    return False
