import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  ElementRef,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

export interface PipelineStep {
  id: string;
  name: string;
  icon: string;
  tag: string;
  description: string;
  codeSnippet: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private cdr = inject(ChangeDetectorRef);

  activeStepIndex = 0;
  private intervalId: any;

  pipelineSteps: PipelineStep[] = [
    {
      id: 'ingest',
      name: 'Data Ingestion',
      icon: 'sync_alt',
      tag: 'STREAMING & BATCH',
      description:
        'Ingest analytics traffic, GA4 event data, and raw log files securely via authenticated GA4 API and endpoints.',
      codeSnippet:
        'POST /api/v1/telemetry/ingest\n{\n  "source": "ga4_events",\n  "timestamp": 1718302300,\n  "payload": { "sessions": 1420, "errors": 3 }\n}',
    },
    {
      id: 'clean',
      name: 'Transformation',
      icon: 'cleaning_services',
      tag: 'DATAFORM ELT',
      description:
        'Cleanse and model raw events using Dataform. Transform raw telemetry into structured, queryable data warehouse tables.',
      codeSnippet:
        'config { type: "table" }\nSELECT\n  timestamp,\n  geo_network.country as country,\n  COUNT(DISTINCT session_id) as active_users\nFROM ${ref("raw_events")}',
    },
    {
      id: 'analyze',
      name: 'Warehouse & Analysis',
      icon: 'storage',
      tag: 'BIGQUERY ML',
      description:
        'Query massive datasets with sub-second latency. Analyze patterns and monitor SLA parameters across global instances.',
      codeSnippet:
        'SELECT\n  service_name,\n  AVG(latency_ms) as avg_latency,\n  percentile_99 as p99\nFROM `data_warehouse.telemetry_metrics`\nGROUP BY 1',
    },
    {
      id: 'predict',
      name: 'Threat Forecasting',
      icon: 'psychology',
      tag: 'PYTORCH ANOMALY',
      description:
        'Run deep learning models on server metrics. Predict threat anomaly scores and forecast 90-day SLA compliance statuses.',
      codeSnippet:
        'class ThreatModel(nn.Module):\n  def forward(self, x):\n    lstm_out, _ = self.lstm(x)\n    anomaly_score = self.fc(lstm_out[:, -1, :])\n    return torch.sigmoid(anomaly_score)',
    },
  ];

  ngOnInit() {
    this.titleService.setTitle('Data Engineering for Machine Learning');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Interactive steps, working notes, and AI annotation on the Data Engineering for Machine Learning book.',
    });

    if (isPlatformBrowser(this.platformId)) {
      // Load status widget script
      const footer = this.elementRef.nativeElement.querySelector('.landing-footer');
      if (footer) {
        const script = document.createElement('script');
        script.src = 'assets/widget.js';
        script.setAttribute('data-page-id', 'platform-status');
        script.setAttribute('data-backend-url', environment.backendUrl);
        footer.appendChild(script);
      }

      // Auto-play the pipeline flow animation
      this.startPipelineCycle();
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  setStep(index: number) {
    this.activeStepIndex = index;
    // Reset timer on manual click to avoid immediate jumping
    this.startPipelineCycle();
    this.cdr.markForCheck();
  }

  private startPipelineCycle() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      this.activeStepIndex = (this.activeStepIndex + 1) % this.pipelineSteps.length;
      this.cdr.markForCheck();
    }, 4500);
  }
}
