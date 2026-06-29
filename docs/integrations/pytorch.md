# PyTorch Integration

Use DEML as a remote data source and inference backend from PyTorch training scripts, DataLoaders, and deployment pipelines.

## Prerequisites

- Python 3.11+
- PyTorch 2.x
- A DEML API key (Settings → API Keys)

## Custom DataLoader (Available Today)

```python
from __future__ import annotations

import requests
import torch
from torch.utils.data import Dataset, DataLoader

API_KEY = "YOUR_API_KEY"
INGEST_URL = "https://backend.deml.app/api/v1/ingest"
PREDICT_URL = "https://backend.deml.app/api/v1/predict"


class DemlRemoteDataset(Dataset):
    def __init__(self, page_size: int = 64) -> None:
        self.page_size = page_size
        self._cache: list[tuple[torch.Tensor, torch.Tensor]] = []
        self._index = 0
        self._refresh()

    def _refresh(self) -> None:
        response = requests.post(
            INGEST_URL,
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={"batch_size": self.page_size, "format": "pytorch"},
            timeout=30,
        )
        response.raise_for_status()
        records = response.json()["records"]
        self._cache = [
            (torch.tensor(r["features"], dtype=torch.float32), torch.tensor(r["label"]))
            for r in records
        ]
        self._index = 0

    def __len__(self) -> int:
        return len(self._cache)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        if idx >= len(self._cache):
            self._refresh()
        return self._cache[idx % len(self._cache)]


loader = DataLoader(DemlRemoteDataset(page_size=64), batch_size=32, shuffle=True)

for features, labels in loader:
    outputs = model(features)
    loss = criterion(outputs, labels)
    loss.backward()
```

## Remote Inference

```python
import requests
import torch

payload = {"model_version": "v2", "inputs": [0.5, 0.2, 0.9]}
response = requests.post(
    PREDICT_URL,
    headers={"Authorization": f"Bearer {API_KEY}"},
    json=payload,
    timeout=5,
)
outputs = torch.tensor(response.json()["outputs"])
```

DEML hosts tenant-namespaced PyTorch `state_dict` checkpoints on Hugging Face — no pickle, security-first.

## Planned SDK

```python
from deml.pytorch import PlatformDataLoader

loader = PlatformDataLoader(
    api_key="YOUR_API_KEY",
    batch_size=64,
    shuffle=True,
)

for batch in loader:
    predictions = model(batch)
```

## Integration Health Check

```bash
curl https://backend.deml.app/api/v1/integrations/pytorch \
  -H "Authorization: Bearer YOUR_API_KEY"
```
