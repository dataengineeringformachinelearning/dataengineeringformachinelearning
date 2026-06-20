# PyTorch Integration

_(Coming Soon)_

This integration will detail how to use our custom PyTorch `DataLoader` and `Dataset` classes to fetch and stream training data from our platform, or run remote inference from within your PyTorch scripts.

**Example Planned Usage:**

```python
import torch
from our_platform_sdk.pytorch import PlatformDataLoader

loader = PlatformDataLoader(
    api_key="YOUR_API_KEY",  # pragma: allowlist secret
    endpoint="https://your-domain.com/api/v1/ingest",
    batch_size=64,
    shuffle=True
)

for batch in loader:
    predictions = model(batch)
```
