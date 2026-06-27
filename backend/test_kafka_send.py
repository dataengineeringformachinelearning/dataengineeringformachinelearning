import asyncio
import json

from utils.kafka import get_kafka_producer


async def main():
  try:
    producer = await get_kafka_producer()
    print("Connected to Kafka!")
    data = {
      "tenant_id": "test",
      "url": "http://localhost",
      "status_code": 200,
      "response_time": 0.5,
      "ip_address": "127.0.0.1",
      "is_active": True,
    }
    value = json.dumps(data).encode("utf-8")
    await producer.send("app-events", value)
    print("Sent successfully!")
    await producer.stop()
  except Exception:
    import traceback

    traceback.print_exc()


asyncio.run(main())
