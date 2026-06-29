# Apache Spark Integration

Write Spark streaming and batch DataFrames directly to DEML ingestion endpoints for unified telemetry and ML feature pipelines.

## Prerequisites

- Apache Spark 3.4+ (Structured Streaming or batch)
- Network egress to `https://backend.deml.app`
- DEML API key stored in your cluster secrets manager

## Batch Write Pattern

Transform your DataFrame and POST batches via a `mapPartitions` sink:

```python
import json
import requests
from pyspark.sql import SparkSession

API_KEY = "YOUR_API_KEY"
INGEST_URL = "https://backend.deml.app/api/v1/ingest"

spark = SparkSession.builder.appName("deml-ingest").getOrCreate()
df = spark.read.parquet("s3://datalake/events/")

def send_partition(rows):
    records = [row.asDict() for row in rows]
    if not records:
        return
    requests.post(
        INGEST_URL,
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"source": "spark", "records": records},
        timeout=60,
    ).raise_for_status()

df.foreachPartition(send_partition)
```

## Structured Streaming

Stream micro-batches to DEML as they arrive:

```python
from pyspark.sql.functions import col, struct, to_json

stream = (
    spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "broker:9092")
    .option("subscribe", "telemetry")
    .load()
)

payload = stream.select(
    to_json(struct(col("value").alias("payload"))).alias("record")
)

def write_batch(batch_df, batch_id):
    rows = [row.record for row in batch_df.collect()]
    if rows:
        requests.post(
            INGEST_URL,
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={"source": "spark-stream", "batch_id": batch_id, "records": rows},
            timeout=60,
        ).raise_for_status()

query = payload.writeStream.foreachBatch(write_batch).start()
```

## Scala Alternative

```scala
df.writeStream
  .format("org.apache.spark.sql.kafka010.KafkaSourceProvider")
  .option("checkpointLocation", "/checkpoints/deml")
  .foreachBatch { (batchDF: DataFrame, batchId: Long) =>
    val records = batchDF.collect().map(_.getAs[String]("payload"))
    // POST records to https://backend.deml.app/api/v1/ingest
  }
  .start()
```

## Planned Native Spark Connector

A first-class `deml` format will simplify writes:

```scala
df.writeStream
  .format("deml")
  .option("api_key", sys.env("DEML_API_KEY"))
  .option("endpoint", "https://backend.deml.app/api/v1/ingest")
  .start()
```

## Integration Health Check

```bash
curl https://backend.deml.app/api/v1/integrations/apache-spark \
  -H "Authorization: Bearer YOUR_API_KEY"
```
