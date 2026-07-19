from __future__ import annotations

import hashlib
import json
import re
import uuid
from typing import Any
from urllib.parse import urlsplit

from django.db import migrations, models

_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
_JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")
_BEARER_RE = re.compile(r"(?i)\bbearer\b(\s+\S+)?")
_PEM_RE = re.compile(r"(?i)-----begin[\s\S]*?(-----end[^-]*-----|\Z)")
_AWS_ACCESS_KEY_RE = re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")
_FORJD_SERVICE_TOKEN_RE = re.compile(
  r"(?<![A-Za-z0-9_])fjsvc_[^_\s]{8}_[^\s,;]+",
  re.IGNORECASE,
)
_DEML_API_KEY_RE = re.compile(
  r"(?<![A-Za-z0-9_])deml_[A-Za-z0-9]{8}_[A-Za-z0-9_-]{16,}",
  re.IGNORECASE,
)
_SECRET_ASSIGNMENT_RE = re.compile(
  r"(?i)\b(?:api[_-]?key|access[_-]?key|secret|password|session[_-]?id|"
  r"refresh[_-]?token|oauth[_-]?code|authorization|cookie)\b\s*[:=]\s*[^\s,;&]+"
)
_PHONE_RE = re.compile(r"(?<!\w)(?:\+?\d[\d ().-]{7,}\d)(?!\w)")
_IP_RE = re.compile(r"(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])")
_SAFE_ERROR_LABEL_RE = re.compile(r"\A(?:Error:)?[A-Za-z][A-Za-z0-9_.-]{0,63}\Z")


def _redact_report_text(value: str) -> str:
  text = _PEM_RE.sub("[redacted-credential]", str(value or ""))
  text = _JWT_RE.sub("[redacted-credential]", text)
  text = _BEARER_RE.sub("[redacted-credential]", text)
  text = _AWS_ACCESS_KEY_RE.sub("[redacted-credential]", text)
  text = _FORJD_SERVICE_TOKEN_RE.sub("[redacted-credential]", text)
  text = _DEML_API_KEY_RE.sub("[redacted-credential]", text)
  text = _SECRET_ASSIGNMENT_RE.sub("[redacted-credential]", text)
  text = _EMAIL_RE.sub("[redacted-email]", text)
  text = _PHONE_RE.sub("[redacted-phone]", text)
  return _IP_RE.sub("[redacted-ip]", text)


def _route_only(value: str) -> str:
  try:
    parsed = urlsplit(value)
  except ValueError:
    return "/"
  path = parsed.path if parsed.scheme or parsed.netloc else value.split("?", 1)[0].split("#", 1)[0]
  cleaned = path if path.startswith("/") else f"/{path}"
  return _redact_report_text(cleaned)[:512] or "/"


def _report_context(value: object) -> dict[str, Any]:
  if not isinstance(value, dict):
    return {}
  context: dict[str, Any] = {}
  url = value.get("route", value.get("url"))
  if isinstance(url, str) and url:
    context["route"] = _route_only(url)
  user_agent = value.get("userAgent", value.get("user_agent"))
  if isinstance(user_agent, str) and user_agent:
    context["user_agent"] = _redact_report_text(user_agent)[:256]
  errors = value.get("recentErrors", value.get("recent_errors"))
  if isinstance(errors, list):
    labels = [item for item in errors[:10] if isinstance(item, str)]
    context["recent_errors"] = [
      item if _SAFE_ERROR_LABEL_RE.fullmatch(item) else "client_error" for item in labels
    ]
  return context


def _content_sha256(body: str, context: dict[str, Any]) -> str:
  canonical = json.dumps(
    {"body": body, "context": context},
    sort_keys=True,
    separators=(",", ":"),
    ensure_ascii=False,
  ).encode()
  return hashlib.sha256(canonical).hexdigest()


def backfill_legacy_reports(apps, schema_editor) -> None:
  """Pseudonymize existing reports and retain them locally instead of auto-shipping."""
  bug_report = apps.get_model("monitor", "BugReport")
  database = schema_editor.connection.alias
  pending = []
  queryset = bug_report.objects.using(database).all()
  for report in queryset.iterator(chunk_size=500):
    report.client_report_id = uuid.uuid4()
    report.user_description = _redact_report_text(report.user_description).strip()[:8000]
    report.telemetry_context = _report_context(report.telemetry_context)
    report.content_sha256 = _content_sha256(
      report.user_description,
      report.telemetry_context,
    )
    report.delivery_status = "legacy_retained"
    report.next_delivery_at = None
    report.last_delivery_error = "LegacyReportRetainedLocally"
    pending.append(report)
    if len(pending) == 500:
      bug_report.objects.using(database).bulk_update(
        pending,
        [
          "client_report_id",
          "user_description",
          "telemetry_context",
          "content_sha256",
          "delivery_status",
          "next_delivery_at",
          "last_delivery_error",
        ],
      )
      pending.clear()
  if pending:
    bug_report.objects.using(database).bulk_update(
      pending,
      [
        "client_report_id",
        "user_description",
        "telemetry_context",
        "content_sha256",
        "delivery_status",
        "next_delivery_at",
        "last_delivery_error",
      ],
    )


class Migration(migrations.Migration):
  dependencies = [("monitor", "0057_browser_session_auth_handoff")]

  operations = [
    migrations.AddField(
      model_name="bugreport",
      name="client_report_id",
      field=models.UUIDField(editable=False, null=True),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="content_sha256",
      field=models.CharField(blank=True, default="", max_length=64),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="delivery_status",
      field=models.CharField(
        choices=[
          ("pending", "Pending"),
          ("delivered", "Delivered"),
          ("legacy_retained", "Legacy retained locally"),
        ],
        db_index=True,
        default="pending",
        max_length=16,
      ),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="forjd_document_id",
      field=models.CharField(blank=True, default="", max_length=64),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="delivery_attempts",
      field=models.PositiveIntegerField(default=0),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="next_delivery_at",
      field=models.DateTimeField(blank=True, db_index=True, null=True),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="last_delivery_error",
      field=models.CharField(blank=True, default="", max_length=128),
    ),
    migrations.RunPython(backfill_legacy_reports, migrations.RunPython.noop),
    migrations.AlterField(
      model_name="bugreport",
      name="client_report_id",
      field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
    ),
  ]
