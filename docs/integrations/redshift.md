# AWS Redshift Integration

Connect Amazon Redshift warehouses to DEML for scheduled analytics exports, feature-store rollups, and ML training pipelines. Redshift UNLOAD and COPY patterns push curated datasets into `/api/v1/ingest` while keeping credentials in AWS Secrets Manager or IAM roles.

## Prerequisites

- Amazon Redshift cluster or Redshift Serverless workgroup
- Network egress to `https://backend.deml.app` (or VPC endpoint + NAT)
- DEML API key stored in AWS Secrets Manager
- Optional: S3 staging bucket for UNLOAD/COPY workflows

## Architecture Options

| Pattern                    | Best for                              | Latency   | Ops overhead |
| -------------------------- | ------------------------------------- | --------- | ------------ |
| **Scheduled UNLOAD → S3**  | Nightly feature rollups, batch ingest | Minutes   | Low          |
| **Lambda + UNLOAD**        | Event-driven exports after ETL        | Seconds   | Medium       |
| **Redshift Data API**      | Serverless queries without JDBC       | Variable  | Low          |
| **Spectrum + Spark sink**  | Lakehouse federated queries           | Minutes   | Medium       |

## Scheduled UNLOAD to DEML Ingest

Export aggregated metrics from Redshift to S3, then POST batches to DEML:

```sql
UNLOAD (
  'SELECT tenant_id, metric_name, metric_value, recorded_at
   FROM analytics.daily_rollups
   WHERE recorded_at >= CURRENT_DATE - 1'
)
TO 's3://your-bucket/deml-export/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftUnloadRole'
FORMAT AS PARQUET
ALLOWOVERWRITE;
```

Python job (Lambda, ECS, or Databricks) reads Parquet and ingests:

```python
import json
import boto3
import requests

API_KEY = "YOUR_API_KEY"
INGEST_URL = "https://backend.deml.app/api/v1/ingest"
s3 = boto3.client("s3")

def ingest_parquet_object(bucket: str, key: str) -> None:
    obj = s3.get_object(Bucket=bucket, Key=key)
    # Parse Parquet with pyarrow/polars in production
    records = [{"source": "redshift", "payload": obj["Body"].read().decode("utf-8", errors="ignore")}]
    requests.post(
        INGEST_URL,
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"batch_id": key, "source": "aws-redshift", "records": records},
        timeout=120,
    ).raise_for_status()
```

## Redshift Data API (Serverless)

Query without persistent JDBC connections and stream rows to DEML:

```python
import boto3
import requests

redshift = boto3.client("redshift-data")
API_KEY = "YOUR_API_KEY"
INGEST_URL = "https://backend.deml.app/api/v1/ingest"

response = redshift.execute_statement(
    ClusterIdentifier="prod-analytics",
    Database="analytics",
    Sql="SELECT feature_a, feature_b, label FROM ml.training_features LIMIT 1000",
)
statement_id = response["Id"]

# Poll until FINISHED, then fetch results and POST to DEML
records = [{"feature_a": 1.0, "feature_b": 0.5, "label": 1}]  # map from GetStatementResult
requests.post(
    INGEST_URL,
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={"source": "redshift-data-api", "records": records},
    timeout=60,
).raise_for_status()
```

## COPY from S3 After DEML Predictions

Write inference results back to the warehouse for BI dashboards:

```sql
COPY analytics.model_predictions
FROM 's3://your-bucket/deml-predictions/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftCopyRole'
FORMAT AS JSON 'auto'
TIMEFORMAT 'auto';
```

Fetch predictions from DEML first:

```bash
curl -X POST https://backend.deml.app/api/v1/predict \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model_version": "v2", "inputs": [0.5, 0.2, 0.9]}'
```

## Secrets Manager Pattern

Store the DEML API key alongside Redshift credentials:

```python
import json
import boto3

secrets = boto3.client("secretsmanager")
payload = secrets.get_secret_value(SecretId="deml/production/api-key")
api_key = json.loads(payload["SecretString"])["DEML_API_KEY"]
```

## Integration Health Check

```bash
curl https://backend.deml.app/api/v1/integrations/redshift \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Expected response:

```json
{
  "integration": "AWS Redshift",
  "status": "ready",
  "enabled": true,
  "version": "2.0+",
  "message": "AWS Redshift warehouse integration is active."
}
```

## Related Guides

- [Apache Spark](apache-spark.md) — lakehouse batch and streaming sinks
- [Databricks](databricks.md) — notebook and job scheduling on AWS
- [PyTorch](pytorch.md) — train on features exported from Redshift
