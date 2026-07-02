import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  afterNextRender,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FluxButton,
  FluxCallout,
  FluxCheckbox,
  FluxField,
  FluxInput,
  FluxModal,
  FluxProgress,
} from '@deml/flux-material';
import { FluxAppIcon } from '../flux-app-icon/flux-app-icon';
import { MonitorService, StatusPageData } from '../../services/monitor.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { OnboardingService } from '../../services/onboarding.service';
import { FluxDialogService } from '../../services/flux-dialog.service';
import { environment } from '../../../environments/environment';

const STEPS = ['welcome', 'site', 'endpoint', 'publish', 'done'] as const;
type WizardStep = (typeof STEPS)[number];

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FluxModal,
    FluxButton,
    FluxCallout,
    FluxCheckbox,
    FluxField,
    FluxInput,
    FluxProgress,
    FluxAppIcon,
  ],
  templateUrl: './onboarding-wizard.html',
  styleUrl: './onboarding-wizard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizard {
  private readonly fluxDialog = inject(FluxDialogService);
  private monitorService = inject(MonitorService);
  private settingsService = inject(SettingsService);
  private authService = inject(AuthService);
  private onboardingService = inject(OnboardingService);
  private cdr = inject(ChangeDetectorRef);

  protected readonly open = computed(() => this.fluxDialog.active()?.kind === 'onboarding');

  currentStep = signal<WizardStep>('welcome');
  isBusy = signal(false);
  errorMessage = signal<string | null>(null);

  newPageTitle = '';
  newPageSlug = '';
  newServiceName = '';
  newServiceUrl = '';
  publishPage = true;

  createdPage = signal<StatusPageData | null>(null);
  copiedWidget = signal(false);

  readonly steps = STEPS;

  stepIndex = () => STEPS.indexOf(this.currentStep());

  progressPercent = () => ((this.stepIndex() + 1) / STEPS.length) * 100;

  constructor() {
    afterNextRender(() => {
      const pages = this.settingsService.statusPages();
      const uid = this.authService.currentUserId();
      const own = pages.find(p => p.user_id === uid && p.slug !== 'platform-status');
      if (own) {
        this.createdPage.set(own);
        if (own.is_published) {
          this.currentStep.set('done');
        } else {
          this.currentStep.set('publish');
        }
        this.cdr.markForCheck();
      }
    });
  }

  protected onOpenChange = (next: boolean): void => {
    if (!next) {
      this.fluxDialog.resolveOnboarding(false);
    }
  };

  goNext() {
    const idx = this.stepIndex();
    if (idx < STEPS.length - 1) {
      this.currentStep.set(STEPS[idx + 1]);
      this.errorMessage.set(null);
    }
  }

  goBack() {
    const idx = this.stepIndex();
    if (idx > 0) {
      this.currentStep.set(STEPS[idx - 1]);
      this.errorMessage.set(null);
    }
  }

  skip() {
    this.onboardingService.markSkipped();
    this.fluxDialog.resolveOnboarding(false);
  }

  finish() {
    this.onboardingService.markComplete();
    this.fluxDialog.resolveOnboarding(true);
  }

  createSite() {
    if (!this.newPageTitle.trim() || !this.newPageSlug.trim()) {
      this.errorMessage.set('Please enter a site name and URL slug.');
      return;
    }
    this.isBusy.set(true);
    this.errorMessage.set(null);
    this.monitorService
      .createStatusPage({ title: this.newPageTitle.trim(), slug: this.newPageSlug.trim() })
      .subscribe({
        next: page => {
          this.createdPage.set(page);
          this.settingsService.selectedPage.set(page);
          this.refreshPages();
          this.isBusy.set(false);
          this.goNext();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isBusy.set(false);
          this.errorMessage.set('Could not create site. The slug may already be taken.');
          this.cdr.markForCheck();
        },
      });
  }

  addEndpoint() {
    const page = this.createdPage();
    if (!page) {
      this.errorMessage.set('Create a site first.');
      return;
    }
    if (!this.newServiceName.trim() || !this.newServiceUrl.trim()) {
      this.errorMessage.set('Enter a service name and health check URL.');
      return;
    }
    this.isBusy.set(true);
    this.errorMessage.set(null);
    this.monitorService
      .addService(page.id, {
        name: this.newServiceName.trim(),
        url: this.newServiceUrl.trim(),
      })
      .subscribe({
        next: () => {
          this.isBusy.set(false);
          this.goNext();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isBusy.set(false);
          this.errorMessage.set('Could not add endpoint. Check the URL and try again.');
          this.cdr.markForCheck();
        },
      });
  }

  skipEndpoint() {
    this.goNext();
  }

  saveAndPublish() {
    const page = this.createdPage();
    if (!page) {
      this.finish();
      return;
    }
    this.isBusy.set(true);
    this.monitorService
      .updateStatusPage(page.id, {
        title: page.title,
        slug: page.slug,
        is_published: this.publishPage,
      })
      .subscribe({
        next: updated => {
          this.createdPage.set(updated);
          this.refreshPages();
          this.isBusy.set(false);
          this.onboardingService.markComplete();
          this.goNext();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isBusy.set(false);
          this.errorMessage.set('Could not update publish settings.');
          this.cdr.markForCheck();
        },
      });
  }

  getWidgetCode(): string {
    const page = this.createdPage();
    if (!page) return '';
    const statusAppUrl =
      environment.frontendUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
    const backendUrl = environment.backendUrl;
    return `<script src="${statusAppUrl}/assets/widget.js" async defer data-page-id="${page.slug}" data-backend-url="${backendUrl}" data-frontend-url="${statusAppUrl}"></script>`;
  }

  async copyWidget() {
    const code = this.getWidgetCode();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.copiedWidget.set(true);
      setTimeout(() => {
        this.copiedWidget.set(false);
        this.cdr.markForCheck();
      }, 2000);
      this.cdr.markForCheck();
    } catch {
      this.errorMessage.set('Could not copy to clipboard.');
    }
  }

  private refreshPages() {
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        if (!Array.isArray(data)) return;
        const uid = this.authService.currentUserId();
        const myPages = data.filter(p => p.user_id === uid && p.slug !== 'platform-status');
        this.settingsService.statusPages.set(myPages);
        this.cdr.markForCheck();
      },
    });
  }
}
