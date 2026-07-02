import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FluxDialogService } from './flux-dialog.service';

const SKIP_KEY = 'deml_onboarding_skipped';
const COMPLETE_KEY = 'deml_onboarding_complete';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly fluxDialog = inject(FluxDialogService);
  private platformId = inject(PLATFORM_ID);

  private get storage(): Storage | null {
    return isPlatformBrowser(this.platformId) ? localStorage : null;
  }

  isSkipped(): boolean {
    return this.storage?.getItem(SKIP_KEY) === 'true';
  }

  isMarkedComplete(): boolean {
    return this.storage?.getItem(COMPLETE_KEY) === 'true';
  }

  markComplete(): void {
    this.storage?.setItem(COMPLETE_KEY, 'true');
    this.storage?.removeItem(SKIP_KEY);
  }

  markSkipped(): void {
    this.storage?.setItem(SKIP_KEY, 'true');
  }

  resetForTesting(): void {
    this.storage?.removeItem(SKIP_KEY);
    this.storage?.removeItem(COMPLETE_KEY);
  }

  shouldAutoOpen(hasOwnPages: boolean): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    if (hasOwnPages || this.isMarkedComplete()) return false;
    return !this.isSkipped();
  }

  openWizard(force = false): Promise<boolean | undefined> | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return this.fluxDialog.openOnboarding(force);
  }
}
