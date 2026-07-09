import { Injectable, Injector, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { VikingDialogService } from './viking-dialog.service';

/** Idle session length before forced sign-out (10 minutes). */
const SESSION_IDLE_MS = 10 * 60 * 1000;
/** Show continue prompt this long before forced sign-out. */
const SESSION_WARN_LEAD_MS = 60 * 1000;
/** Idle duration after which the warning dialog opens. */
const SESSION_WARN_MS = SESSION_IDLE_MS - SESSION_WARN_LEAD_MS;
const SESSION_CHANNEL = 'deml-session';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Tracks user activity and prompts 60s before idle sign-out so the user can
 * continue the session. Complements Firebase token refresh with an in-app idle boundary.
 */
@Injectable({ providedIn: 'root' })
export class SessionIdleService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(VikingDialogService);
  private readonly router = inject(Router);

  /** Lazy resolve breaks AuthService ↔ session services circular DI during SSR. */
  private get authService(): AuthService {
    return this.injector.get(AuthService);
  }

  private warnTimer: ReturnType<typeof setTimeout> | undefined;
  private logoutTimer: ReturnType<typeof setTimeout> | undefined;
  private warningOpen = false;
  private expired = false;
  private boundOnActivity: (() => void) | undefined;
  /** Absolute timestamp when forced logout will occur (ms since epoch). */
  private logoutAt = 0;

  start(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.stopTimersOnly();
    this.expired = false;
    this.warningOpen = false;
    if (!this.boundOnActivity) {
      this.boundOnActivity = () => this.onActivity();
      for (const eventName of ACTIVITY_EVENTS) {
        window.addEventListener(eventName, this.boundOnActivity, { passive: true });
      }
    }
    this.armIdleTimers();
  }

  stop(): void {
    if (this.boundOnActivity && isPlatformBrowser(this.platformId)) {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, this.boundOnActivity);
      }
      this.boundOnActivity = undefined;
    }
    this.stopTimersOnly();
    this.warningOpen = false;
    this.expired = false;
    this.logoutAt = 0;
  }

  /** Explicit extension from UI or cross-tab broadcast. */
  extendSession(): void {
    if (!this.authService.isAuthenticated() || this.expired) {
      return;
    }
    if (this.warningOpen) {
      this.dialog.resolveConfirm(true);
    }
    this.warningOpen = false;
    this.armIdleTimers();
    this.postSessionMessage({ type: 'extend' });
  }

  private stopTimersOnly(): void {
    clearTimeout(this.warnTimer);
    clearTimeout(this.logoutTimer);
    this.warnTimer = undefined;
    this.logoutTimer = undefined;
  }

  private onActivity(): void {
    if (!this.authService.isAuthenticated() || this.expired) {
      return;
    }
    // While the pre-expiry prompt is open, only "Continue session" extends.
    // Random pointer/scroll noise must not hide the prompt or silently re-arm.
    if (this.warningOpen) {
      return;
    }
    this.armIdleTimers();
  }

  private armIdleTimers(): void {
    if (!this.authService.isAuthenticated() || this.expired) {
      return;
    }
    this.stopTimersOnly();
    this.touchSessionCache();
    this.logoutAt = Date.now() + SESSION_IDLE_MS;

    this.warnTimer = setTimeout(() => {
      void this.showWarning();
    }, SESSION_WARN_MS);

    this.logoutTimer = setTimeout(() => {
      void this.expireSession();
    }, SESSION_IDLE_MS);
  }

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
    if (this.warningOpen || this.expired || !this.authService.isAuthenticated()) {
      return;
    }
    this.warningOpen = true;

    // Guarantee a full 60s grace window from the moment the prompt is shown,
    // even if timer drift or a late fire reduced the original remaining time.
    const graceMs = SESSION_WARN_LEAD_MS;
    this.logoutAt = Date.now() + graceMs;
    clearTimeout(this.logoutTimer);
    this.logoutTimer = setTimeout(() => {
      void this.expireSession();
    }, graceMs);

    const stay = await this.dialog.openConfirm({
      title: 'Session expiring soon',
      message:
        'Your session will expire in 60 seconds due to inactivity. Choose Continue session to stay signed in, or you will be signed out automatically.',
      confirmBtnText: 'Continue session',
      cancelBtnText: 'Sign out now',
      type: 'confirm',
    });

    // Dialog resolved (user chose an action or dismissed).
    this.warningOpen = false;

    if (this.expired) {
      // Logout already ran while the dialog was open.
      return;
    }

    if (stay) {
      this.armIdleTimers();
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
    if (this.expired) {
      return;
    }
    this.expired = true;
    this.stopTimersOnly();

    // Close any open confirm so it does not resolve after navigation.
    if (this.warningOpen) {
      this.dialog.resolveConfirm(false);
      this.warningOpen = false;
    }

    this.postSessionMessage({ type: 'logout', reason: 'timeout' });
    try {
      await this.authService.logout();
    } finally {
      if (this.boundOnActivity && isPlatformBrowser(this.platformId)) {
        for (const eventName of ACTIVITY_EVENTS) {
          window.removeEventListener(eventName, this.boundOnActivity);
        }
        this.boundOnActivity = undefined;
      }
      void this.router.navigate(['/login'], { queryParams: { reason: 'timeout' } });
    }
  }
}
