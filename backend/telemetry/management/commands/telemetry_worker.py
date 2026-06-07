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
            'user-issues',
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
                    
                    if tp.topic == 'app-events':
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
                    
                    elif tp.topic == 'user-issues':
                        for msg in messages:
                            try:
                                payload = json.loads(msg.value.decode('utf-8'))
                                if payload.get("event_type") == "user_issue":
                                    bug_report_id = payload.get("bug_report_id")
                                    report_text = payload.get("report")
                                    if bug_report_id and report_text:
                                        await self.update_bug_report(bug_report_id, report_text)
                            except Exception as e:
                                self.stderr.write(self.style.ERROR(f"Failed to parse user issue msg: {e}"))
                        
                        await consumer.commit()
                        self.stdout.write(self.style.SUCCESS(f"Processed and committed user-issues batch"))
                            
        finally:
            await consumer.stop()
            self.stdout.write(self.style.WARNING("Worker stopped."))

    @sync_to_async
    def update_bug_report(self, bug_report_id: str, report_text: str):
        from monitor.models import BugReport
        try:
            bug_report = BugReport.objects.get(id=bug_report_id)
            bug_report.processed_report = report_text
            bug_report.save()
            self.stdout.write(self.style.SUCCESS(f"Successfully updated BugReport {bug_report_id} with AI report."))
        except BugReport.DoesNotExist:
            self.stderr.write(self.style.WARNING(f"BugReport {bug_report_id} not found in database."))


    @sync_to_async
    def save_to_db(self, df: pl.DataFrame):
        # Ensure platform-status page exists
        from monitor.models import StatusPage, MonitoredService
        from django.contrib.auth.models import User
        
        try:
            page = StatusPage.objects.get(slug="platform-status")
        except StatusPage.DoesNotExist:
            default_user = User.objects.first()
            if not default_user:
                from django.utils.crypto import get_random_string
                default_user = User.objects.create_user(
                    username="system",
                    email="system@dataengineeringformachinelearning.com",
                    password=get_random_string(32)
                )
            page = StatusPage.objects.create(
                user=default_user,
                title="Platform Status",
                slug="platform-status",
                description="Monitoring system health and telemetry pipelines for the Data Engineering Platform."
            )

        # Collect unique urls from df and ensure they are added
        urls = list(df['url'].unique())
        existing_urls = set(MonitoredService.objects.filter(status_page=page, url__in=urls).values_list('url', flat=True))

        def clean_service_name(url_str):
            if "system-status/health" in url_str:
                return "Django Web Server"
            if "9092" in url_str:
                return "Redpanda Broker"
            from urllib.parse import urlparse
            parsed = urlparse(url_str)
            path = parsed.path.strip('/')
            host = parsed.netloc
            if not path:
                return host
            parts = [p.capitalize() for p in path.split('/') if p]
            return f"{host} - {' '.join(parts)}"

        for u in urls:
            if u not in existing_urls:
                MonitoredService.objects.create(
                    status_page=page,
                    name=clean_service_name(u),
                    url=u
                )

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
