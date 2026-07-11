# DEML Storage

S3-compatible object storage abstraction for DEML Platform.

## Installation

```bash
pip install deml-storage
```

## Usage

```python
from deml_storage import StorageClient

# With environment variables (RUSTFS_ENDPOINT, RUSTFS_ACCESS_KEY, RUSTFS_SECRET_KEY)
client = StorageClient()

# Upload
client.upload_file("reports/2024-07-11/report.pdf", pdf_bytes)

# Download
data = client.get_file("reports/2024-07-11/report.pdf")

# Delete
client.delete_file("reports/2024-07-11/report.pdf")
```

## Features

- RustFS/S3-compatible backend
- Pluggable endpoint configuration
- UUID-safe key handling
- Used for analytics exports and report storage
