import asyncio
import json
import os
import time
from datetime import timedelta
import polars as pl
from django.core.management.base import BaseCommand
from aiokafka import AIOKafkaConsumer
from asgiref.sync import sync_to_async

# Needed to interact with Django ORM asynchronously
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from monitor.models import Endpoints

class Command(BaseCommand):
    help = 'Runs the async telemetry background worker'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting Telemetry Worker..."))
        asyncio.run(self.run_worker())

    async def run_worker(self):
        brokers = os.environ.get('REDPANDA_BROKERS', 'localhost:19092')
        consumer = AIOKafkaConsumer(
            'app-events',
            bootstrap_servers=brokers,
            group_id="telemetry-group",
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            # wait up to 1000ms for a batch
            max_poll_records=100
        )

        await consumer.start()
        self.stdout.write(self.style.SUCCESS(f"Connected to Redpanda at {brokers}"))

        try:
            while True:
                # Get a batch of messages
                result = await consumer.getmany(timeout_ms=1000, max_records=100)
                
                if not result:
                    continue

                for tp, messages in result.items():
                    if not messages:
                        continue
                    
                    data_list = []
                    for msg in messages:
                        try:
                            payload = json.loads(msg.value.decode('utf-8'))
                            data_list.append(payload)
                        except Exception as e:
                            self.stderr.write(self.style.ERROR(f"Failed to parse msg: {e}"))
                    
                    if not data_list:
                        continue

                    # Process with Polars
                    df = pl.DataFrame(data_list)
                    
                    # Convert response_time float to timedelta object required by Django DurationField
                    # We will do this mapping during DB insertion or using polars to map.
                    # Simple approach: iterate rows. For higher throughput, use bulk_create.
                    
                    # Simulate DB commit phase
                    success = False
                    while not success:
                        try:
                            # DB save
                            await self.save_to_db(df)
                            success = True
                            
                            # Explicitly commit offset
                            await consumer.commit()
                            self.stdout.write(self.style.SUCCESS(f"Processed and committed batch of {len(data_list)} messages"))
                        except Exception as e:
                            self.stderr.write(self.style.ERROR(f"Database insertion failed: {e}"))
                            self.stderr.write(self.style.WARNING("Backing off for 5 seconds before retrying..."))
                            await asyncio.sleep(5)
                            # DO NOT commit so that on restart it fetches again
                            
        finally:
            await consumer.stop()
            self.stdout.write(self.style.WARNING("Worker stopped."))

    @sync_to_async
    def save_to_db(self, df: pl.DataFrame):
        objects_to_create = []
        for row in df.iter_rows(named=True):
            duration = timedelta(seconds=row['response_time'])
            
            # Create instance (we don't save yet to do it in bulk)
            ep = Endpoints(
                url=row['url'],
                status_code=row['status_code'],
                response_time=duration,
                ip_address=row['ip_address'],
                is_active=row['is_active']
            )
            objects_to_create.append(ep)
            
        if objects_to_create:
            Endpoints.objects.bulk_create(objects_to_create)
