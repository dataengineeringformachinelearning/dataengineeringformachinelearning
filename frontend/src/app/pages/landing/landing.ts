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
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { signal, effect } from '@angular/core';
import { SanityService } from '../../services/sanity.service';
import { toSignal } from '@angular/core/rxjs-interop';

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
  imports: [RouterLink, MatIconModule, FormsModule],
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
  private http = inject(HttpClient);
  public sanityService = inject(SanityService);

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private queryParams = toSignal(this.route.queryParams);

  constructor() {
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      const params = this.queryParams();
      if (isAuth && params && params['action'] === 'checkout') {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { action: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        this.upgradeToPro();
      }
    });
  }

  version = environment.version || '1.0.0';
  emailVal = '';
  consentVal = false;
  submitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  showErrors = false;
  videoPlaying = signal(false);

  activeStepIndex = 0;
  private intervalId: any;

  pipelineSteps: PipelineStep[] = [
    {
      id: 'ingest',
      name: 'Widget Telemetry Streaming',
      icon: 'sync_alt',
      tag: 'CLIENT-SIDE EMBED',
      description:
        "The embedded status widget securely streams real-time, zero-dependency telemetry (visitor logs, anomalies) directly from the tenant's site into our ingestion pipeline.",
      codeSnippet:
        '<script src="https://platform.demo/assets/widget.js" data-page-id="tenant-id" async defer></script>',
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
      name: 'Deep Learning Pipeline',
      icon: 'psychology',
      tag: 'PYTORCH PIPELINE',
      description:
        'Orchestrate a PyTorch-based deep learning pipeline currently running two core modules (SLA and TA), designed to support additional forecasting modules in the future.',
      codeSnippet:
        'class DeepLearningPipeline(nn.Module):\n  def __init__(self):\n    super().__init__()\n    self.sla_module = SLAModule()\n    self.ta_module = TAModule()\n    self.future_extensions = nn.ModuleList()\n\n  def forward(self, x):\n    return self.sla_module(x), self.ta_module(x)',
    },
  ];

  ngOnInit() {
    this.titleService.setTitle('Web Application');
    this.metaService.updateTag({
      name: 'description',
      content: 'Interactive steps, working notes, and AI annotation on the Web Application book.',
    });

    this.sanityService.fetchPlatformVideo();

    if (isPlatformBrowser(this.platformId)) {
      // Load status widget script
      const mount = this.elementRef.nativeElement.querySelector('#hero-widget-mount');
      if (mount) {
        const script = document.createElement('script');
        script.src = 'assets/widget.js';
        script.async = true;
        script.defer = true;
        script.setAttribute('data-page-id', 'platform-status');
        script.setAttribute('data-backend-url', environment.backendUrl);
        mount.appendChild(script);
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

  onSubscribe() {
    this.showErrors = true;
    this.successMessage.set('');
    this.errorMessage.set('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.emailVal || !emailRegex.test(this.emailVal)) {
      return;
    }
    if (!this.consentVal) {
      return;
    }

    this.submitting.set(true);
    this.http
      .post<any>(`${environment.backendUrl}/api/v1/telemetry/subscribe`, {
        email: this.emailVal,
        consent: this.consentVal,
      })
      .subscribe({
        next: res => {
          this.submitting.set(false);
          if (res.status === 'success') {
            this.successMessage.set('Thank you for subscribing! A welcome email has been sent.');
            this.emailVal = '';
            this.consentVal = false;
            this.showErrors = false;
          } else {
            this.errorMessage.set(res.message || 'An error occurred. Please try again.');
          }
          this.cdr.markForCheck();
        },
        error: err => {
          this.submitting.set(false);
          this.errorMessage.set(
            err?.error?.message || 'Failed to submit. Please check your connection.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  startFreeTier() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    console.info('Standard Tier activated.');
  }

  async upgradeToPro() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/?action=checkout' } });
      return;
    }

    let token = '';
    try {
      if (this.authService.auth?.currentUser) {
        token = await this.authService.auth.currentUser.getIdToken();
      }
    } catch (e) {
      console.error('Failed to get auth token', e);
    }

    const payload = {};

    this.http
      .post<any>(`${environment.backendUrl}/api/v1/billing/create-checkout-session`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .subscribe({
        next: res => {
          if (res.checkout_url) {
            window.location.href = res.checkout_url;
          } else {
            console.warn('No checkout URL returned, likely missing Stripe config.', res);
            throw new Error(
              'Stripe configuration is missing. Checkout session could not be created.',
            );
          }
        },
        error: err => {
          console.warn('Failed to create checkout session, handling gracefully.', err);
          throw new Error('Billing integration is not fully configured (missing Stripe keys).');
        },
      });
  }
}
