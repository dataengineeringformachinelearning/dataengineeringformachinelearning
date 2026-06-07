import os
from aiokafka import AIOKafkaProducer

_global_producer = None

def get_kafka_brokers() -> str:
    """Returns the list of bootstrap servers from the environment."""
    return os.environ.get('REDPANDA_BROKERS', 'localhost:19092')

async def get_kafka_producer() -> AIOKafkaProducer:
    """Returns a running global singleton instance of AIOKafkaProducer."""
    global _global_producer
    if _global_producer is None:
        _global_producer = AIOKafkaProducer(bootstrap_servers=get_kafka_brokers())
        await _global_producer.start()
    return _global_producer

def create_kafka_producer() -> AIOKafkaProducer:
    """Creates a new instance of AIOKafkaProducer. The caller is responsible for starting and stopping it."""
    return AIOKafkaProducer(bootstrap_servers=get_kafka_brokers())
