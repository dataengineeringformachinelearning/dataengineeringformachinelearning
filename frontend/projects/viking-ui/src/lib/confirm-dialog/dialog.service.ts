import { Injectable, signal } from '@angular/core';

export type VikingDialogKind = 'confirm' | 'search' | 'onboarding';

export interface VikingConfirmDialogData {
  title?: string;
  message: string;
  type?: 'alert' | 'confirm' | 'prompt';
  confirmText?: string;
  confirmBtnText?: string;
  confirmBtnColor?: 'primary' | 'warn' | 'accent';
}

export interface VikingDialogState {
  kind: VikingDialogKind;
  data?: VikingConfirmDialogData & { force?: boolean };
}

/** Programmatic confirm / prompt / overlay orchestration for Viking-UI modals. */
@Injectable({ providedIn: 'root' })
export class VikingDialogService {
  readonly active = signal<VikingDialogState | null>(null);

  private confirmResolver: ((value: boolean) => void) | null = null;
  private onboardingResolver: ((value: boolean | undefined) => void) | null = null;

  openConfirm(data: VikingConfirmDialogData): Promise<boolean> {
    this.closeActive(false);
    return new Promise<boolean>(resolve => {
      this.confirmResolver = resolve;
      this.active.set({ kind: 'confirm', data });
    });
  }

  resolveConfirm(result: boolean): void {
    this.confirmResolver?.(result);
    this.confirmResolver = null;
    this.active.set(null);
  }

  openSearch(): void {
    if (this.active()?.kind === 'search') {
      return;
    }
    this.closeActive(false);
    this.active.set({ kind: 'search' });
  }

  closeSearch(): void {
    if (this.active()?.kind === 'search') {
      this.active.set(null);
    }
  }

  openOnboarding(force = false): Promise<boolean | undefined> {
    this.closeActive(false);
    return new Promise<boolean | undefined>(resolve => {
      this.onboardingResolver = resolve;
      this.active.set({ kind: 'onboarding', data: { message: '', force } });
    });
  }

  resolveOnboarding(result?: boolean): void {
    this.onboardingResolver?.(result);
    this.onboardingResolver = null;
    this.active.set(null);
  }

  closeActive(cancelPending = true): void {
    if (cancelPending) {
      this.confirmResolver?.(false);
      this.onboardingResolver?.(undefined);
    }
    this.confirmResolver = null;
    this.onboardingResolver = null;
    this.active.set(null);
  }
}
