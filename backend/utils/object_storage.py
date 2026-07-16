"""S3-compatible object storage client for DEML export artifacts (RustFS).

Analytics facts remain in ClickHouse / Postgres. This module only stores and
streams generated report bytes (PDF, CSV, Parquet, JSON). The application uses
signed proxy URLs for browser downloads; presigning remains available for
private operational smoke tests.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Final
from urllib.parse import urlparse

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_PRESIGN_SECONDS: Final[int] = 900  # 15 minutes


class ObjectStorageNotConfiguredError(RuntimeError):
  """Raised when RUSTFS_* settings are missing or incomplete."""


@dataclass(frozen=True)
class StoredObject:
  """Streaming object response returned by the private RustFS client."""

  body: Any
  content_type: str
  content_length: int


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
  parsed_endpoint = urlparse(endpoint)
  if parsed_endpoint.scheme not in {"http", "https"} or not parsed_endpoint.hostname:
    raise ObjectStorageNotConfiguredError("RUSTFS_ENDPOINT must be an absolute HTTP(S) URL")
  use_ssl = bool(getattr(settings, "RUSTFS_USE_SSL", False))
  if (parsed_endpoint.scheme == "https") != use_ssl:
    raise ObjectStorageNotConfiguredError("RUSTFS_USE_SSL must match the RUSTFS_ENDPOINT scheme")

  addressing = (getattr(settings, "RUSTFS_ADDRESSING_STYLE", "") or "path").strip()
  if addressing not in {"path", "virtual"}:
    raise ObjectStorageNotConfiguredError("RUSTFS_ADDRESSING_STYLE must be 'path' or 'virtual'")
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
  if not (endpoint and access_key and secret_key):
    return False
  try:
    _client()
  except ObjectStorageNotConfiguredError:
    return False
  return True


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


def get_object_stream(*, key: str, bucket: str | None = None) -> StoredObject:
  """Open an object for streaming through an authenticated application endpoint."""
  client = _client()
  name = bucket or exports_bucket()
  response = client.get_object(Bucket=name, Key=key)
  return StoredObject(
    body=response["Body"],
    content_type=str(response.get("ContentType") or "application/octet-stream"),
    content_length=max(0, int(response.get("ContentLength") or 0)),
  )


def delete_object(*, key: str, bucket: str | None = None) -> None:
  client = _client()
  name = bucket or exports_bucket()
  client.delete_object(Bucket=name, Key=key)
