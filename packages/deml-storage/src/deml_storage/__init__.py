"""DEML Storage - S3-compatible object storage abstraction.

Supports RustFS, AWS S3, and other S3-compatible backends.
"""

import os
from typing import Any, Final

__version__ = "0.1.0"

DEFAULT_ENDPOINT: Final[str] = os.getenv("RUSTFS_ENDPOINT", "https://rustfs.deml.app")
DEFAULT_BUCKET: Final[str] = os.getenv("RUSTFS_BUCKET", "reports")


class StorageClient:
    """S3-compatible storage client abstraction."""
    
    def __init__(
        self,
        endpoint: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        bucket: str | None = None,
    ):
        self.endpoint = endpoint or DEFAULT_ENDPOINT
        self.access_key = access_key or os.getenv("RUSTFS_ACCESS_KEY", "")
        self.secret_key = secret_key or os.getenv("RUSTFS_SECRET_KEY", "")
        self.bucket = bucket or DEFAULT_BUCKET
        
        try:
            import boto3
            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
            )
        except ImportError:
            self._client = None
    
    def upload_file(self, key: str, body: bytes) -> bool:
        """Upload bytes to storage."""
        if not self._client:
            return False
        try:
            self._client.put_object(Bucket=self.bucket, Key=key, Body=body)
            return True
        except Exception:
            return False
    
    def get_file(self, key: str) -> bytes | None:
        """Retrieve file from storage."""
        if not self._client:
            return None
        try:
            response = self._client.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        except Exception:
            return None
    
    def delete_file(self, key: str) -> bool:
        """Delete file from storage."""
        if not self._client:
            return False
        try:
            self._client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False
