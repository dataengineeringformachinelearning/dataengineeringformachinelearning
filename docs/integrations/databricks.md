# Databricks Integration

Connect Databricks notebooks and jobs to DEML for secure telemetry ingest, model inference, and cross-platform analytics.

## Prerequisites

- Databricks Runtime 13.3+ (Python or Scala)
- DEML API key
- Outbound HTTPS to `backend.deml.app`

## Store Credentials in Databricks Secrets

Never hardcode API keys in notebooks. Use a Secret Scope:

```bash
databricks secrets create-scope --scope deml
databricks secrets put --scope deml --key api-key --string-value YOUR_API_KEY
```

In a notebook:

```python
api_key = dbutils.secrets.get(scope="deml", key="api-key")
```

## Ingest from a Notebook

```python
import requests

INGEST_URL = "https://backend.deml.app/api/v1/ingest"
api_key = dbutils.secrets.get(scope="deml", key="api-key")

df = spark.table("analytics.telemetry_events")
records = [row.asDict() for row in df.limit(1000).collect()]

response = requests.post(
    INGEST_URL,
    headers={"Authorization": f"Bearer {api_key}"},
    json={"source": "databricks", "records": records},
    timeout=60,
)
response.raise_for_status()
print(f"Ingested {len(records)} records")
```

## Scheduled Job Pattern

1. Create a Databricks Job with a Python task.
2. Mount the `deml` secret scope on the cluster.
3. Run on a schedule (e.g., every 5 minutes) to push aggregated features.

```python
# Databricks job: push hourly rollups to DEML
rollup = spark.sql("""
  SELECT tenant_id, AVG(latency_ms) AS avg_latency, COUNT(*) AS requests
  FROM delta.`/mnt/telemetry/raw`
  WHERE event_time > current_timestamp() - INTERVAL 1 HOUR
  GROUP BY tenant_id
""")

records = rollup.collect()
requests.post(
    INGEST_URL,
    headers={"Authorization": f"Bearer {api_key}"},
    json={"source": "databricks-job", "records": [r.asDict() for r in records]},
).raise_for_status()
```

## Real-time Inference from Databricks

```python
PREDICT_URL = "https://backend.deml.app/api/v1/predict"

def predict_row(features: list[float]) -> float:
    result = requests.post(
        PREDICT_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model_version": "v2", "inputs": features},
        timeout=10,
    )
    result.raise_for_status()
    return result.json()["outputs"][0]

# Apply to a Spark UDF or driver-side batch calls
scores = [predict_row(row.features) for row in df.limit(100).collect()]
```

## Unity Catalog & Multi-Tenancy

Map Databricks workspace catalogs to DEML tenant UUIDs in your job metadata so analytics remain isolated per customer.

## Integration Health Check

```bash
curl https://backend.deml.app/api/v1/integrations/databricks \
  -H "Authorization: Bearer YOUR_API_KEY"
```
