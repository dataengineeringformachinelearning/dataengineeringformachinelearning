"""Unit tests for RustFS-backed object storage helpers."""

from __future__ import annotations

import io
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from utils.object_storage import (
  ObjectStorageNotConfiguredError,
  export_object_key,
  generate_presigned_get,
  get_object_stream,
  is_configured,
  put_bytes,
)


@pytest.fixture(autouse=True)
def _clear_client_cache() -> Any:
  from utils import object_storage

  object_storage._client.cache_clear()
  yield
  object_storage._client.cache_clear()


@pytest.mark.django_db
def test_export_object_key_layout() -> None:
  key = export_object_key(
    account_id="acc-uuid",
    job_id="job-uuid",
    filename="report.pdf",
  )
  assert key == "accounts/acc-uuid/exports/job-uuid/report.pdf"


@pytest.mark.django_db
def test_export_object_key_sanitizes_path_segments() -> None:
  key = export_object_key(
    account_id="acc",
    job_id="job",
    filename="../evil/../name.pdf",
  )
  assert ".." not in key
  assert "/" not in key.split("/")[-1] or key.endswith("name.pdf")


@pytest.mark.django_db
def test_is_configured_false_when_empty(settings: Any) -> None:
  settings.RUSTFS_ENDPOINT = ""
  settings.RUSTFS_ACCESS_KEY = ""
  settings.RUSTFS_SECRET_KEY = ""
  assert is_configured() is False


@pytest.mark.django_db
def test_put_bytes_uses_path_style_client(settings: Any) -> None:
  settings.RUSTFS_ENDPOINT = "http://rustfs:9000"
  settings.RUSTFS_ACCESS_KEY = "key"
  settings.RUSTFS_SECRET_KEY = "secret"  # pragma: allowlist secret
  settings.RUSTFS_BUCKET = "deml-exports"
  settings.RUSTFS_REGION = "us-east-1"
  settings.RUSTFS_ADDRESSING_STYLE = "path"

  mock_client = MagicMock()
  with patch("utils.object_storage.boto3.client", return_value=mock_client) as boto_client:
    uri = put_bytes(
      key="accounts/a/exports/j/report.pdf",
      body=b"%PDF-1.4",
      content_type="application/pdf",
      metadata={"job_id": "j"},
    )

  boto_client.assert_called_once()
  mock_client.put_object.assert_called_once()
  kwargs = mock_client.put_object.call_args.kwargs
  assert kwargs["Bucket"] == "deml-exports"
  assert kwargs["Key"] == "accounts/a/exports/j/report.pdf"
  assert kwargs["ContentType"] == "application/pdf"
  assert uri == "s3://deml-exports/accounts/a/exports/j/report.pdf"


@pytest.mark.django_db
def test_generate_presigned_get(settings: Any) -> None:
  settings.RUSTFS_ENDPOINT = "http://rustfs:9000"
  settings.RUSTFS_ACCESS_KEY = "key"
  settings.RUSTFS_SECRET_KEY = "secret"  # pragma: allowlist secret
  settings.RUSTFS_BUCKET = "deml-exports"
  settings.RUSTFS_REGION = "us-east-1"
  settings.RUSTFS_ADDRESSING_STYLE = "path"

  mock_client = MagicMock()
  mock_client.generate_presigned_url.return_value = "http://rustfs:9000/signed"
  with patch("utils.object_storage.boto3.client", return_value=mock_client):
    url = generate_presigned_get(key="accounts/a/exports/j/r.pdf", expires_in=120)

  assert url == "http://rustfs:9000/signed"
  mock_client.generate_presigned_url.assert_called_once()


@pytest.mark.django_db
def test_get_object_stream_uses_private_storage_client(settings: Any) -> None:
  settings.RUSTFS_ENDPOINT = "http://rustfs:9000"
  settings.RUSTFS_ACCESS_KEY = "key"
  settings.RUSTFS_SECRET_KEY = "secret"  # pragma: allowlist secret
  settings.RUSTFS_BUCKET = "deml-exports"
  settings.RUSTFS_REGION = "us-east-1"
  settings.RUSTFS_ADDRESSING_STYLE = "path"

  body = io.BytesIO(b"report")
  mock_client = MagicMock()
  mock_client.get_object.return_value = {
    "Body": body,
    "ContentType": "application/pdf",
    "ContentLength": 6,
  }
  with patch("utils.object_storage.boto3.client", return_value=mock_client):
    stored = get_object_stream(key="accounts/a/exports/j/r.pdf")

  assert stored.body is body
  assert stored.content_type == "application/pdf"
  assert stored.content_length == 6
  mock_client.get_object.assert_called_once_with(
    Bucket="deml-exports",
    Key="accounts/a/exports/j/r.pdf",
  )


@pytest.mark.django_db
def test_client_requires_config(settings: Any) -> None:
  settings.RUSTFS_ENDPOINT = ""
  settings.RUSTFS_ACCESS_KEY = ""
  settings.RUSTFS_SECRET_KEY = ""
  with pytest.raises(ObjectStorageNotConfiguredError):
    put_bytes(key="k", body=b"x", content_type="text/plain")


@pytest.mark.django_db
def test_client_requires_ssl_flag_to_match_endpoint(settings: Any) -> None:
  from utils import object_storage

  settings.RUSTFS_ENDPOINT = "http://rustfs.internal:9000"
  settings.RUSTFS_ACCESS_KEY = "key"
  settings.RUSTFS_SECRET_KEY = "secret"  # pragma: allowlist secret
  settings.RUSTFS_USE_SSL = True

  with pytest.raises(ObjectStorageNotConfiguredError, match="must match"):
    object_storage._client()
