import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { VikingDialogService } from './viking-dialog.service';

/** Idle session length before forced sign-out (10 minutes). */
const SESSION_IDLE_MS = 10 * 60 * 1000;
/** Warn one minute before expiry. */
const SESSION_WARN_MS = SESSION_IDLE_MS - 60 * 1000;
const SESSION_CHANNEL = 'deml-session';

/**
 * Tracks user activity and prompts before idle sign-out.
 * Complements Firebase token refresh with an explicit in-app idle boundary.
 */
@Injectable({ providedIn: 'root' })
export class SessionIdleService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(VikingDialogService);
  private readonly router = inject(Router);

  private warnTimer: ReturnType<typeof setTimeout> | undefined;
  private logoutTimer: ReturnType<typeof setTimeout> | undefined;
  private warningOpen = false;
  private boundReset: (() => void) | undefined;

  start(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.stop();
    this.boundReset = () => this.resetTimers();
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    for (const eventName of events) {
      window.addEventListener(eventName, this.boundReset, { passive: true });
    }
    this.resetTimers();
  }

  stop(): void {
    if (this.boundReset && isPlatformBrowser(this.platformId)) {
      const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
      for (const eventName of events) {
        window.removeEventListener(eventName, this.boundReset);
      }
      this.boundReset = undefined;
    }
    clearTimeout(this.warnTimer);
    clearTimeout(this.logoutTimer);
    this.warnTimer = undefined;
    this.logoutTimer = undefined;
  }

  private resetTimers = (): void => {
    if (!this.authService.isAuthenticated()) {
      return;
    }
    clearTimeout(this.warnTimer);
    clearTimeout(this.logoutTimer);
    this.touchSessionCache();
    this.warnTimer = setTimeout(() => {
      void this.showWarning();
    }, SESSION_WARN_MS);
    this.logoutTimer = setTimeout(() => {
      void this.expireSession();
    }, SESSION_IDLE_MS);
  };

  private touchSessionCache(): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(
      'deml_session_active',
      JSON.stringify({ active: true, expires: Date.now() + 24 * 60 * 60 * 1000 }),
    );
  }

  private async showWarning(): Promise<void> {
    if (this.warningOpen || !this.authService.isAuthenticated()) {
      return;
    }
    this.warningOpen = true;
    const stay = await this.dialog.openConfirm({
      title: 'Session expiring',
      message:
        'Your session will expire in one minute due to inactivity. Continue working to stay signed in.',
      confirmBtnText: 'Continue session',
      type: 'confirm',
    });
    this.warningOpen = false;
    if (stay) {
      this.resetTimers();
      this.postSessionMessage({ type: 'extend' });
      return;
    }
    await this.expireSession();
  }

  private postSessionMessage(message: { type: 'logout' | 'extend'; reason?: string }): void {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }
    new BroadcastChannel(SESSION_CHANNEL).postMessage(message);
  }

  private async expireSession(): Promise<void> {
    this.stop();
    this.postSessionMessage({ type: 'logout', reason: 'timeout' });
    await this.authService.logout();
    void this.router.navigate(['/login'], { queryParams: { reason: 'timeout' } });
  }
}
