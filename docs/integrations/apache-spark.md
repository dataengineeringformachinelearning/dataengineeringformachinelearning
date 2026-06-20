# Apache Spark Integration

_(Coming Soon)_

This integration will detail how to configure your Spark cluster to write streaming DataFrames directly into our ingestion endpoints.

**Example Planned Usage:**

```scala
val df = spark.readStream...

df.writeStream
  .format("our_platform")
  .option("api_key", "YOUR_API_KEY")
  .option("endpoint", "https://your-domain.com/api/v1/ingest")
  .start()
```
