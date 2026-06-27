import asyncio

from utils.kafka import get_kafka_producer


async def main():
  try:
    producer = await get_kafka_producer()
    print("Connected to Kafka!")
    await producer.stop()
  except Exception as e:
    print(f"Error connecting to Kafka: {e}")


asyncio.run(main())
