"""
Django settings for config project.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.2/ref/settings/
"""

import json
import logging
import os
import re
from pathlib import Path

import dj_database_url
import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from a .env file located at the BASE_DIR (backend/)
load_dotenv(BASE_DIR / ".env", override=False)


# fmt: off
def clean_private_key(key: str) -> str:
  """Normalize a PEM private key that may have been double-escaped when injected via env vars."""
  if not key:
    return key
  key = key.replace("\\n", "\n")
  begin_tag = "-----" + "BEGIN PRIVATE KEY" + "-----"  # pragma: allowlist secret
  end_tag = "-----" + "END PRIVATE KEY" + "-----"  # pragma: allowlist secret
  if begin_tag in key and end_tag in key:
    start_idx = key.find(begin_tag) + len(begin_tag)
    end_idx = key.find(end_tag)
    body = key[start_idx:end_idx].strip()

    b64_chars = re.sub(r'\s+', '', body)
    missing_padding = len(b64_chars) % 4
    if missing_padding:
      b64_chars += '=' * (4 - missing_padding)
      body = '\n'.join(b64_chars[i:i+64] for i in range(0, len(b64_chars), 64))

    return f"{begin_tag}\n{body}\n{end_tag}\n"
  return key
# fmt: on


def _parse_service_account(raw_value: str | None) -> dict | None:
  """Parse service account JSON (handling common env var double-escaping) and clean private_key."""
  if not raw_value:
    return None
  try:
    cleaned = raw_value.strip()
    if cleaned.startswith('"') and cleaned.endswith('"'):
      try:
        inner = json.loads(cleaned)
        if isinstance(inner, str):
          cleaned = inner
      except Exception:
        pass

    parsed = json.loads(cleaned) if isinstance(cleaned, str) else cleaned
    if isinstance(parsed, str):
      parsed = json.loads(parsed)

    if isinstance(parsed, dict) and "private_key" in parsed:
      parsed["private_key"] = clean_private_key(parsed["private_key"])
    return parsed if isinstance(parsed, dict) else None
  except Exception:
    return None


# Write GCP service account JSON from environment variable to a file if provided
gcp_sa_json = os.getenv("GCP_SERVICE_ACCOUNT_JSON")
if gcp_sa_json:
  parsed_gcp = _parse_service_account(gcp_sa_json)
  if parsed_gcp:
    try:
      import tempfile

      fd, temp_credentials_path = tempfile.mkstemp(suffix=".json", prefix="gcp-sa-")
      with os.fdopen(fd, "w") as f:
        json.dump(parsed_gcp, f)
      os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_credentials_path
    except Exception as e:
      logging.getLogger("django").warning("Failed to write GCP JSON file: %s", e)


import sentry_sdk

sentry_dsn = os.getenv("SENTRY_DSN", "")
if sentry_dsn:
  sentry_sdk.init(
    dsn=sentry_dsn,
    # PII off by default — enable only when SENTRY_SEND_PII=true for debugging.
    send_default_pii=os.getenv("SENTRY_SEND_PII", "false").lower() == "true",
  )

# Initialize Firebase Admin
if not firebase_admin._apps:
  service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
  firebase_project_id = (
    os.getenv("FIREBASE_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT") or "demldotcom"
  )
  if service_account_json:
    cred_dict = _parse_service_account(service_account_json)
    if cred_dict:
      try:
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
      except Exception as e:
        logging.getLogger("django").error(
          "Failed to initialize Firebase with service account JSON: %s", e
        )
        firebase_admin.initialize_app(options={"projectId": firebase_project_id})
    else:
      firebase_admin.initialize_app(options={"projectId": firebase_project_id})
  else:
    cred_path = BASE_DIR / "firebase-service-account.json"
    if cred_path.exists():
      cred = credentials.Certificate(str(cred_path))
      firebase_admin.initialize_app(cred)
    else:
      # Fallback with explicit project ID to avoid hanging on GCP metadata server lookups in non-GCP environments
      firebase_admin.initialize_app(options={"projectId": firebase_project_id})


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

from utils.env import configure_database_url, get_bool, get_csv, get_str, validate_production_config

# Fail fast on Railway/production if SECRET_KEY, DEBUG, or DATABASE_URL are insecure.
validate_production_config()
configure_database_url()

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = get_str(
  "SECRET_KEY",
  "django-insecure-izn^)q(e0k=rklyawiv0*4(unp)%4%@v54**mnt!@tw!thaub9",
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = get_bool("DEBUG", default=True)

ALLOWED_HOSTS = [
  host.strip().strip('"').strip("'")
  for host in os.getenv("ALLOWED_HOSTS", "*").split(",")
  if host.strip()
]


# Application definition

INSTALLED_APPS = [
  "daphne",
  "django.contrib.auth",
  "django.contrib.contenttypes",
  "django.contrib.sessions",
  "django.contrib.messages",
  "django.contrib.staticfiles",
  "django.contrib.sitemaps",
  "corsheaders",
  "whitenoise.runserver_nostatic",
  "django_migration_linter",
  "monitor",
  "ml",
  "telemetry",
]

MIDDLEWARE = [
  "corsheaders.middleware.CorsMiddleware",
  "config.middleware.InternalMeshMiddleware",
  "django.middleware.security.SecurityMiddleware",
  "config.csp_middleware.ContentSecurityPolicyMiddleware",
  "whitenoise.middleware.WhiteNoiseMiddleware",
  "config.correlation_middleware.CorrelationIdMiddleware",
  "django.middleware.common.CommonMiddleware",
  "django.middleware.csrf.CsrfViewMiddleware",
  "config.middleware.FirebaseAuthenticationMiddleware",
  "telemetry.middleware.NetworkTelemetryMiddleware",
  "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
  {
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {
      "context_processors": [
        "django.template.context_processors.request",
      ],
    },
  },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DRAGONFLY_HOST = os.getenv("DRAGONFLY_HOST", "deml-dragonfly.railway.internal")

# Channels
CHANNEL_LAYERS = {
  "default": {
    "BACKEND": "channels_redis.core.RedisChannelLayer",
    "CONFIG": {
      "hosts": [(DRAGONFLY_HOST, 6379)],
    },
  },
}


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
  "default": dj_database_url.config(
    conn_max_age=600,
    conn_health_checks=True,
  )
}

# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
  {
    "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
  },
  {
    "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
  },
  {
    "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
  },
  {
    "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
  },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = False

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT.mkdir(
  parents=True, exist_ok=True
)  # prevent missing dir warnings from middleware/Sentry
STORAGES = {
  "staticfiles": {
    "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
  },
}

CORS_ALLOWED_ORIGINS = get_csv("CORS_ALLOWED_ORIGINS")

from corsheaders.defaults import default_headers

CORS_ALLOW_HEADERS = [
  *default_headers,
  "cache-control",
  "pragma",
  "expires",
  # Browser session registry (Dragonfly) — sent by credentials.interceptor.ts
  "x-deml-session-id",
]

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = get_bool("CORS_ALLOW_CREDENTIALS", default=True)

_csrf_origins = get_csv("CSRF_TRUSTED_ORIGINS")
CSRF_TRUSTED_ORIGINS = _csrf_origins if _csrf_origins else CORS_ALLOWED_ORIGINS

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
ALERT_EMAIL_TARGET = os.getenv("ALERT_EMAIL_TARGET", "notifications@deml.app")
ALERT_EMAIL_FROM = os.getenv("ALERT_EMAIL_FROM", "notifications@deml.app")
from typing import Final

FRONTEND_URL = get_str("FRONTEND_URL")
BACKEND_URL = get_str("BACKEND_URL")
MARKETING_URL: Final[str] = get_str("MARKETING_URL")

# Internal service URLs (env-driven; see BOOK.md Appendix C)
from utils.env import cpe_guesser_url, scanner_service_url, tor_proxy_url

SCANNER_SERVICE_URL = scanner_service_url()
CPE_GUESSER_URL = cpe_guesser_url()
TOR_PROXY_URL = tor_proxy_url()

# Shared secret for deml-daemon → Django internal API calls.
# Set the same value on both backend and deml-daemon in Railway secrets.
INTERNAL_SECRET: str = os.getenv("INTERNAL_SECRET", "dev-internal-secret")

# Stripe Settings
STRIPE_PUBLIC_KEY = os.getenv("STRIPE_PUBLIC_KEY", "")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Security Headers & Cookie Settings — Antigravity - Claude Opus 4.6
if not DEBUG:
  SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
  SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() == "true"
  SESSION_COOKIE_SECURE = True
  CSRF_COOKIE_SECURE = True
  SECURE_HSTS_SECONDS = 31536000  # 1 year
  SECURE_HSTS_INCLUDE_SUBDOMAINS = True
  SECURE_HSTS_PRELOAD = True

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"


# Google OAuth Analytics Integration Settings
GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "mock-client-id")
GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "mock-client-secret")
GOOGLE_OAUTH_REDIRECT_URI = os.getenv(
  "GOOGLE_OAUTH_REDIRECT_URI",
  "http://localhost:8000/api/v1/system-status/integrations/google/callback",
)

# App versioning configuration
VERSION_PATH = BASE_DIR.parent / "version.txt"
LOCAL_VERSION_PATH = BASE_DIR / "version.txt"
if VERSION_PATH.exists():
  with open(VERSION_PATH) as f:
    APP_VERSION = f.read().strip()
elif LOCAL_VERSION_PATH.exists():
  with open(LOCAL_VERSION_PATH) as f:
    APP_VERSION = f.read().strip()
else:
  APP_VERSION = "0.0.0-dev"

# Centralized Logging Configuration
LOGGING = {
  "version": 1,
  "disable_existing_loggers": False,
  "formatters": {
    "verbose": {
      "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
      "style": "{",
    },
    "simple": {
      "format": "{levelname} {message}",
      "style": "{",
    },
    "json": {
      "()": "utils.structured_log.StructuredJsonFormatter",
    },
  },
  "handlers": {
    "console": {
      "class": "logging.StreamHandler",
      "formatter": "json" if os.getenv("STRUCTURED_LOGS", "true").lower() == "true" else "simple",
    },
  },
  "loggers": {
    "django": {
      "handlers": ["console"],
      "level": "INFO",
    },
    "monitor.audit": {
      "handlers": ["console"],
      "level": "INFO",
      "propagate": True,
    },
    "telemetry": {
      "handlers": ["console"],
      "level": "INFO",
      "propagate": False,
    },
    "utils": {
      "handlers": ["console"],
      "level": "INFO",
      "propagate": False,
    },
  },
}

GCP_LOGGING_ENABLED = os.getenv("GCP_LOGGING_ENABLED", "False").lower() == "true"
if GCP_LOGGING_ENABLED:
  try:
    import google.cloud.logging

    gcp_client = google.cloud.logging.Client()
    LOGGING["handlers"]["gcp"] = {
      "class": "google.cloud.logging.handlers.CloudLoggingHandler",
      "client": gcp_client,
      "name": "audit_logs",
    }
    LOGGING["loggers"]["monitor.audit"]["handlers"].append("gcp")
  except Exception as e:
    import logging

    logging.getLogger("django").warning("Failed to initialize Google Cloud Logging: %s", e)


# Migration Linter Configuration
MIGRATION_LINTER_OPTIONS = {
  "ignore_initial_migrations": True,
  "ignore_name": [
    "0002_alter_endpoints_ip_address_statuspage_and_more",
    "0005_statuspage_is_published",
    "0009_rename_model_to_ml",
  ],
}
