"""S3-compatible object storage client for DEML export artifacts (RustFS).

Analytics facts remain in ClickHouse / Postgres. This module only stores
generated report bytes (PDF, CSV, Parquet, JSON) and issues short-lived
presigned download URLs.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Final

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_PRESIGN_SECONDS: Final[int] = 900  # 15 minutes


class ObjectStorageNotConfiguredError(RuntimeError):
  """Raised when RUSTFS_* settings are missing or incomplete."""


@lru_cache(maxsize=1)
def _client() -> BaseClient:
  endpoint = (getattr(settings, "RUSTFS_ENDPOINT", "") or "").strip()
  access_key = (getattr(settings, "RUSTFS_ACCESS_KEY", "") or "").strip()
  secret_key = (getattr(settings, "RUSTFS_SECRET_KEY", "") or "").strip()
  region = (getattr(settings, "RUSTFS_REGION", "") or "us-east-1").strip()
  if not endpoint or not access_key or not secret_key:
    raise ObjectStorageNotConfiguredError(
      "RUSTFS_ENDPOINT, RUSTFS_ACCESS_KEY, and RUSTFS_SECRET_KEY must be set"
    )

  addressing = (getattr(settings, "RUSTFS_ADDRESSING_STYLE", "") or "path").strip()
  return boto3.client(
    "s3",
    endpoint_url=endpoint,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name=region,
    config=Config(
      signature_version="s3v4",
      s3={"addressing_style": addressing},
    ),
  )


def exports_bucket() -> str:
  bucket = (getattr(settings, "RUSTFS_BUCKET", "") or "deml-exports").strip()
  if not bucket:
    raise ObjectStorageNotConfiguredError("RUSTFS_BUCKET must be set")
  return bucket


def is_configured() -> bool:
  endpoint = (getattr(settings, "RUSTFS_ENDPOINT", "") or "").strip()
  access_key = (getattr(settings, "RUSTFS_ACCESS_KEY", "") or "").strip()
  secret_key = (getattr(settings, "RUSTFS_SECRET_KEY", "") or "").strip()
  return bool(endpoint and access_key and secret_key)


def export_object_key(*, account_id: str, job_id: str, filename: str) -> str:
  """Stable multi-tenant object key layout for export artifacts."""
  safe_name = filename.replace("..", "").replace("/", "_").lstrip(".")
  return f"accounts/{account_id}/exports/{job_id}/{safe_name}"


def ensure_bucket(bucket: str | None = None) -> None:
  """Create the exports bucket if it does not exist (idempotent)."""
  client = _client()
  name = bucket or exports_bucket()
  try:
    client.head_bucket(Bucket=name)
  except ClientError:
    logger.info("Creating object storage bucket name=%s", name)
    client.create_bucket(Bucket=name)


def put_bytes(
  *,
  key: str,
  body: bytes,
  content_type: str,
  bucket: str | None = None,
  metadata: dict[str, str] | None = None,
) -> str:
  """Upload bytes; returns s3-style URI ``s3://bucket/key``."""
  client = _client()
  name = bucket or exports_bucket()
  extra: dict[str, Any] = {"ContentType": content_type}
  if metadata:
    extra["Metadata"] = {str(k): str(v) for k, v in metadata.items()}
  client.put_object(Bucket=name, Key=key, Body=body, **extra)
  return f"s3://{name}/{key}"


def generate_presigned_get(
  *,
  key: str,
  expires_in: int = DEFAULT_PRESIGN_SECONDS,
  bucket: str | None = None,
) -> str:
  """Time-limited download URL for a private object."""
  client = _client()
  name = bucket or exports_bucket()
  return client.generate_presigned_url(
    "get_object",
    Params={"Bucket": name, "Key": key},
    ExpiresIn=max(60, min(expires_in, 86400)),
  )


def delete_object(*, key: str, bucket: str | None = None) -> None:
  client = _client()
  name = bucket or exports_bucket()
  client.delete_object(Bucket=name, Key=key)
