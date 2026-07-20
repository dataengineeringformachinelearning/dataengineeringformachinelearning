import { isPlatformBrowser } from '@angular/common';
import { Injectable, InjectionToken, Injector, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { VikingDialogService } from '@dataengineeringformachinelearning/viking-ui';

export interface SessionIdleConfig {
  idleMs: number;
  warningLeadMs: number;
  activityThrottleMs: number;
  crossTabThrottleMs: number;
}

export const SESSION_IDLE_CONFIG = new InjectionToken<SessionIdleConfig>('SESSION_IDLE_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    idleMs: 10 * 60 * 1000,
    warningLeadMs: 60 * 1000,
    activityThrottleMs: 1000,
    crossTabThrottleMs: 15 * 1000,
  }),
});

const SESSION_CHANNEL = 'deml-session';
export const SESSION_EVENT_STORAGE_KEY = 'deml_session_event';
export const SESSION_TAB_ID =
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'focus'] as const;

type SessionMessage = {
  type: 'logout' | 'extend';
  reason?: string;
  sentAt: number;
  sourceId?: string;
};

/**
 * Native idle-session coordinator.
 *
 * Uses absolute deadlines so background timer throttling cannot extend a
 * session, shows a live pre-expiry countdown, and synchronizes activity across
 * tabs through BroadcastChannel with a localStorage fallback.
 */
@Injectable({ providedIn: 'root' })
export class SessionIdleService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(VikingDialogService);
  private readonly router = inject(Router);
  private readonly config = inject(SESSION_IDLE_CONFIG);

  /** Lazy resolve breaks AuthService ↔ session services circular DI during SSR. */
  private get authService(): AuthService {
    return this.injector.get(AuthService);
  }

  readonly warningRemainingSeconds = signal(0);

  private warnTimer: ReturnType<typeof setTimeout> | undefined;
  private logoutTimer: ReturnType<typeof setTimeout> | undefined;
  private warningTick: ReturnType<typeof setInterval> | undefined;
  private warningOpen = false;
  private expired = false;
  private remoteExtensionPending = false;
  private boundOnActivity: (() => void) | undefined;
  private boundOnVisibilityChange: (() => void) | undefined;
  private logoutAt = 0;
  private lastActivityHandledAt = 0;
  private lastCrossTabBroadcastAt = 0;
  private generation = 0;

  start(): void {
    if (!isPlatformBrowser(this.platformId) || !this.authService.isAuthenticated()) {
      return;
    }
    this.generation += 1;
    if (this.warningOpen) {
      this.dialog.resolveConfirm(false);
    }
    this.stopTimersOnly();
    this.expired = false;
    this.warningOpen = false;
    this.remoteExtensionPending = false;
    this.bindActivityListeners();
    this.armIdleTimers();
  }

  stop(): void {
    this.generation += 1;
    if (this.warningOpen) {
      this.dialog.resolveConfirm(false);
    }
    if (isPlatformBrowser(this.platformId)) {
      this.unbindActivityListeners();
    }
    this.stopTimersOnly();
    this.warningOpen = false;
    this.expired = false;
    this.remoteExtensionPending = false;
    this.logoutAt = 0;
    this.warningRemainingSeconds.set(0);
  }

  /** Explicit extension initiated by this tab. */
  extendSession(): void {
    this.resetSessionWindow(true);
  }

  /** Extension received from another tab; never broadcasts back. */
  syncExtendedSession(): void {
    if (!this.authService.isAuthenticated() || this.expired) {
      return;
    }
    if (this.warningOpen) {
      this.remoteExtensionPending = true;
      this.dialog.resolveConfirm(true);
      return;
    }
    this.armIdleTimers();
  }

  private bindActivityListeners(): void {
    if (!this.boundOnActivity) {
      this.boundOnActivity = () => this.onActivity();
      for (const eventName of ACTIVITY_EVENTS) {
        window.addEventListener(eventName, this.boundOnActivity, { passive: true });
      }
    }
    if (!this.boundOnVisibilityChange) {
      this.boundOnVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          this.reconcileDeadline();
        }
      };
      document.addEventListener('visibilitychange', this.boundOnVisibilityChange);
    }
  }

  private unbindActivityListeners(): void {
    if (this.boundOnActivity) {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, this.boundOnActivity);
      }
      this.boundOnActivity = undefined;
    }
    if (this.boundOnVisibilityChange) {
      document.removeEventListener('visibilitychange', this.boundOnVisibilityChange);
      this.boundOnVisibilityChange = undefined;
    }
  }

  private stopTimersOnly(): void {
    clearTimeout(this.warnTimer);
    clearTimeout(this.logoutTimer);
    clearInterval(this.warningTick);
    this.warnTimer = undefined;
    this.logoutTimer = undefined;
    this.warningTick = undefined;
  }

  private onActivity(): void {
    if (!this.authService.isAuthenticated() || this.expired || this.warningOpen) {
      return;
    }
    const now = Date.now();
    if (now - this.lastActivityHandledAt < this.config.activityThrottleMs) {
      return;
    }
    this.lastActivityHandledAt = now;
    this.armIdleTimers();
    if (now - this.lastCrossTabBroadcastAt >= this.config.crossTabThrottleMs) {
      this.lastCrossTabBroadcastAt = now;
      this.postSessionMessage({ type: 'extend', sentAt: now });
    }
  }

  private resetSessionWindow(broadcast: boolean): void {
    if (!this.authService.isAuthenticated() || this.expired) {
      return;
    }
    if (this.warningOpen) {
      this.dialog.resolveConfirm(true);
      return;
    }
    this.armIdleTimers();
    if (broadcast) {
      this.postSessionMessage({ type: 'extend', sentAt: Date.now() });
    }
  }

  private armIdleTimers(): void {
    if (!this.authService.isAuthenticated() || this.expired) {
      return;
    }
    this.stopTimersOnly();
    this.warningRemainingSeconds.set(0);
    this.logoutAt = Date.now() + this.config.idleMs;
    this.touchSessionCache(this.logoutAt);
    this.scheduleFromDeadline();
  }

  private scheduleFromDeadline(): void {
    const now = Date.now();
    const warningAt = this.logoutAt - this.config.warningLeadMs;
    const warningDelay = Math.max(0, warningAt - now);
    const logoutDelay = Math.max(0, this.logoutAt - now);

    this.warnTimer = setTimeout(() => {
      void this.showWarning();
    }, warningDelay);
    this.logoutTimer = setTimeout(() => {
      void this.expireSession();
    }, logoutDelay);
  }

  private reconcileDeadline(): void {
    if (!this.authService.isAuthenticated() || this.expired || this.logoutAt === 0) {
      return;
    }
    const remainingMs = this.logoutAt - Date.now();
    if (remainingMs <= 0) {
      void this.expireSession();
      return;
    }
    if (remainingMs <= this.config.warningLeadMs) {
      void this.showWarning();
    }
  }

  private touchSessionCache(expires: number): void {
    localStorage.setItem('deml_session_active', JSON.stringify({ active: true, expires }));
  }

  private warningMessage(seconds: number): string {
    const unit = seconds === 1 ? 'second' : 'seconds';
    return `Your session will expire in ${seconds} ${unit} due to inactivity. Choose Continue session to stay signed in, or you will be signed out automatically.`;
  }

  private updateWarningCountdown(): void {
    const seconds = Math.max(0, Math.ceil((this.logoutAt - Date.now()) / 1000));
    this.warningRemainingSeconds.set(seconds);
    const activeDialog = this.dialog.active();
    if (activeDialog?.kind === 'confirm' && activeDialog.data) {
      this.dialog.active.set({
        ...activeDialog,
        data: { ...activeDialog.data, message: this.warningMessage(seconds) },
      });
    }
  }

  private async showWarning(): Promise<void> {
    if (this.warningOpen || this.expired || !this.authService.isAuthenticated()) {
      return;
    }
    if (Date.now() >= this.logoutAt) {
      await this.expireSession();
      return;
    }

    this.warningOpen = true;
    const warningGeneration = this.generation;
    const initialSeconds = Math.max(1, Math.ceil((this.logoutAt - Date.now()) / 1000));
    this.warningRemainingSeconds.set(initialSeconds);
    const stayPromise = this.dialog.openConfirm({
      title: 'Session expiring soon',
      message: this.warningMessage(initialSeconds),
      confirmBtnText: 'Continue session',
      cancelBtnText: 'Sign out now',
      type: 'confirm',
    });
    this.warningTick = setInterval(() => this.updateWarningCountdown(), 1000);

    const stay = await stayPromise;
    clearInterval(this.warningTick);
    this.warningTick = undefined;
    this.warningOpen = false;
    this.warningRemainingSeconds.set(0);

    if (this.expired || warningGeneration !== this.generation) {
      return;
    }

    if (stay) {
      const shouldBroadcast = !this.remoteExtensionPending;
      this.remoteExtensionPending = false;
      this.armIdleTimers();
      if (shouldBroadcast) {
        this.postSessionMessage({ type: 'extend', sentAt: Date.now() });
      }
      return;
    }

    this.remoteExtensionPending = false;
    await this.expireSession();
  }

  private postSessionMessage(message: SessionMessage): void {
    const sourcedMessage = { ...message, sourceId: SESSION_TAB_ID };
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(SESSION_CHANNEL);
      channel.postMessage(sourcedMessage);
      channel.close();
    }
    localStorage.setItem(
      SESSION_EVENT_STORAGE_KEY,
      JSON.stringify({
        ...sourcedMessage,
        nonce: `${SESSION_TAB_ID}-${message.sentAt}-${Math.random().toString(36).slice(2)}`,
      }),
    );
  }

  private async expireSession(): Promise<void> {
    if (this.expired) {
      return;
    }
    this.expired = true;
    this.stopTimersOnly();

    if (this.warningOpen) {
      this.dialog.resolveConfirm(false);
      this.warningOpen = false;
    }
    this.warningRemainingSeconds.set(0);

    this.postSessionMessage({ type: 'logout', reason: 'timeout', sentAt: Date.now() });
    try {
      await this.authService.logout();
    } finally {
      this.unbindActivityListeners();
      void this.router.navigate(['/'], { queryParams: { reason: 'timeout' } });
    }
  }
}
