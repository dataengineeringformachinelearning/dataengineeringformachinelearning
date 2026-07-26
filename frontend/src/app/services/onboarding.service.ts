import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  VikingDialogService,
  getDefaultOnboardingStore,
  recordSuiteActivity,
  type OnboardingStore,
} from '@dataengineeringformachinelearning/viking-ui';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly vikingDialog = inject(VikingDialogService);
  private platformId = inject(PLATFORM_ID);
  private store: OnboardingStore | null = null;

  private getStore(): OnboardingStore | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    if (!this.store) {
      this.store = getDefaultOnboardingStore();
      this.store.setActiveFlow('deml-status');
      this.store.bindSync();
    }
    return this.store;
  }

  shouldShowGuide(): boolean {
    return this.getStore()?.shouldShowGuide() ?? false;
  }

  /** Subscribe to journey changes (checklist / empty CTAs). */
  subscribe(listener: () => void): () => void {
    return this.getStore()?.subscribe(listener) ?? (() => undefined);
  }

  isSkipped(): boolean {
    return this.getStore()?.get().dismissed ?? false;
  }

  isMarkedComplete(): boolean {
    return this.getStore()?.get().completed ?? false;
  }

  completeStep(id: string): void {
    this.getStore()?.completeStep(id);
  }

  markComplete(): void {
    const store = this.getStore();
    if (!store) {
      return;
    }
    for (const id of ['welcome', 'site', 'endpoint', 'publish', 'done']) {
      store.completeStep(id);
    }
    store.markComplete();
    recordSuiteActivity({
      kind: 'onboarding.complete',
      label: 'Completed status-page setup',
      source: 'deml',
    });
  }

  markSkipped(): void {
    this.getStore()?.markDismissed();
    recordSuiteActivity({
      kind: 'onboarding.dismiss',
      label: 'Dismissed status-page setup',
      source: 'deml',
    });
  }

  resetForTesting(): void {
    this.getStore()?.reset();
  }

  shouldAutoOpen(hasOwnPages: boolean): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    if (hasOwnPages || this.isMarkedComplete()) return false;
    return this.shouldShowGuide();
  }

  openWizard(force = false): Promise<boolean | undefined> | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return this.vikingDialog.openOnboarding(force);
  }
}
