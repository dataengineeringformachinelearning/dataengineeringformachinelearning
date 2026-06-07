from django.apps import AppConfig
import os
import threading

class ModelConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'model'

    def ready(self):
        # Only start the thread in the main process (skip Django's auto-reloader process)
        if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('DJANGO_SETTINGS_MODULE'):
            threading.Thread(target=self.start_scheduler, daemon=True).start()

    def start_scheduler(self):
        import time
        # Give Django setup and DB a brief moment to settle down
        time.sleep(5)
        
        self.run_training_for_all_tenants()

        # Run every hour
        while True:
            time.sleep(3600)
            self.run_training_for_all_tenants()

    def run_training_for_all_tenants(self):
        from monitor.models import StatusPage
        from model.services import train_tenant_sla
        import logging

        logger = logging.getLogger(__name__)
        logger.info("SLA Predictor Scheduler: Running model training for all tenants...")
        try:
            pages = StatusPage.objects.all()
            for page in pages:
                try:
                    run = train_tenant_sla(page)
                    if run:
                        logger.info(f"SLA Predictor Scheduler: Trained model for tenant '{page.title}' (SLA: {run.average_sla:.2f}%)")
                    else:
                        logger.info(f"SLA Predictor Scheduler: Skipped tenant '{page.title}' (no telemetry data available)")
                except Exception as e:
                    logger.error(f"SLA Predictor Scheduler: Failed to train tenant '{page.title}': {e}")
        except Exception as e:
            logger.error(f"SLA Predictor Scheduler: Failed to retrieve tenants: {e}")
