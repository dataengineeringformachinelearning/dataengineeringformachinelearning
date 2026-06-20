# TensorFlow Integration

_(Coming Soon)_

This integration will detail how to use our Python SDK to natively stream data from our platform directly into a `tf.data.Dataset` for highly optimized, batched training loops.

**Example Planned Usage:**

```python
import tensorflow as tf
from our_platform_sdk.tensorflow import PlatformDataset

# Initialize a high-throughput stream
dataset = PlatformDataset(
    api_key="YOUR_API_KEY",  # pragma: allowlist secret
    endpoint="https://your-domain.com/api/v1/ingest",
    batch_size=32
)

model.fit(dataset, epochs=10)
```
