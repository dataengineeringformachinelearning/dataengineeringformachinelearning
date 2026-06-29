# TensorFlow Integration

Stream training data from DEML directly into a `tf.data.Dataset` for batched, high-throughput TensorFlow training loops.

## Prerequisites

- Python 3.11+
- TensorFlow 2.15+
- A DEML API key (Settings → API Keys in the dashboard)

## Quick Start

### Install the SDK _(planned package)_

```bash
pip install deml-tensorflow
```

Until the package ships, use the REST ingest endpoint with a custom generator (see below).

### Stream via `tf.data.Dataset`

```python
import json
import tensorflow as tf
import requests

API_KEY = "YOUR_API_KEY"
INGEST_URL = "https://backend.deml.app/api/v1/ingest"
PREDICT_URL = "https://backend.deml.app/api/v1/predict"


def fetch_batch(batch_size: int = 32) -> list[dict]:
    response = requests.post(
        INGEST_URL,
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"batch_size": batch_size, "format": "tensorflow"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["records"]


def record_generator():
    while True:
        for record in fetch_batch():
            yield record["features"], record["label"]


def build_dataset(batch_size: int = 32) -> tf.data.Dataset:
    dataset = tf.data.Dataset.from_generator(
        record_generator,
        output_signature=(
            tf.TensorSpec(shape=(None,), dtype=tf.float32),
            tf.TensorSpec(shape=(), dtype=tf.int32),
        ),
    )
    return dataset.batch(batch_size).prefetch(tf.data.AUTOTUNE)


model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation="relu"),
    tf.keras.layers.Dense(1, activation="sigmoid"),
])

model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
model.fit(build_dataset(), steps_per_epoch=100, epochs=10)
```

## Real-time Inference

Call `/api/v1/predict` from TensorFlow Serving sidecars or directly in training callbacks:

```python
import requests

payload = {"model_version": "v2", "inputs": [0.5, 0.2, 0.9]}
result = requests.post(
    PREDICT_URL,
    headers={"Authorization": f"Bearer {API_KEY}"},
    json=payload,
    timeout=5,
)
prediction = result.json()["outputs"]
```

## Planned SDK API

When `deml-tensorflow` ships, the interface will simplify to:

```python
from deml.tensorflow import PlatformDataset

dataset = PlatformDataset(
    api_key="YOUR_API_KEY",
    batch_size=32,
    prefetch=True,
)
model.fit(dataset, epochs=10)
```

## Integration Health Check

```bash
curl https://backend.deml.app/api/v1/integrations/tensorflow \
  -H "Authorization: Bearer YOUR_API_KEY"
```
