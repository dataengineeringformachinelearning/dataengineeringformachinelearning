import { Injectable, Injector, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import {
  SESSION_EVENT_STORAGE_KEY,
  SESSION_TAB_ID,
  SessionIdleService,
} from './session-idle.service';

const SESSION_CHANNEL = 'deml-session';

type SessionMessage =
  | { type: 'logout'; reason?: string; sourceId?: string }
  | { type: 'extend'; sourceId?: string }
  | { type: 'auth-sync' };

/**
 * Cross-tab session coordination via BroadcastChannel + localStorage.
 * Keeps Sign In/Sign Out state aligned and propagates idle timeout sign-out.
 */
@Injectable({ providedIn: 'root' })
export class SessionStateService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly sessionIdle = inject(SessionIdleService);
  private readonly router = inject(Router);

  private channel: BroadcastChannel | null = null;
  private authEffectRegistered = false;
  private initialized = false;
  private authPollId: number | undefined;
  private previousAuthState: boolean | undefined;

  /** Lazy resolve breaks AuthService ↔ SessionStateService circular DI during SSR. */
  private get authService(): AuthService {
    return this.injector.get(AuthService);
  }

  init(): void {
    if (!isPlatformBrowser(this.platformId) || this.initialized) {
      return;
    }
    this.initialized = true;
    this.bindAuthLifecycle();
    this.bindCrossTab();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.authPollId !== undefined) {
      window.clearInterval(this.authPollId);
      this.authPollId = undefined;
    }
    window.removeEventListener('storage', this.onStorage);
    this.channel?.close();
    this.channel = null;
    this.initialized = false;
    this.authEffectRegistered = false;
    this.previousAuthState = undefined;
  }

  /** Notify other tabs that this tab signed out or timed out. */
  broadcastLogout(reason?: string): void {
    this.publish({ type: 'logout', reason, sourceId: SESSION_TAB_ID });
  }

  /** Reset idle timers in every open tab. */
  broadcastExtend(): void {
    this.publish({ type: 'extend', sourceId: SESSION_TAB_ID });
  }

  private bindAuthLifecycle(): void {
    if (this.authEffectRegistered) {
      return;
    }
    this.authEffectRegistered = true;

    // Poll signal transitions — AuthService uses Angular signals without effect hook here.
    this.authPollId = window.setInterval(() => this.syncAuthState(), 500);
    this.syncAuthState();
  }

  /** Immediately align idle tracking after an explicit auth lifecycle operation. */
  syncAuthState(): void {
    const next = this.authService.isAuthenticated();
    if (next === this.previousAuthState) {
      return;
    }
    this.previousAuthState = next;
    if (next) {
      this.sessionIdle.start();
    } else {
      this.sessionIdle.stop();
    }
  }

  private bindCrossTab(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(SESSION_CHANNEL);
      this.channel.onmessage = (event: MessageEvent<SessionMessage>) => {
        void this.handleMessage(event.data);
      };
    }

    window.addEventListener('storage', this.onStorage);
  }

  private readonly onStorage = (event: StorageEvent): void => {
    if (event.key === SESSION_EVENT_STORAGE_KEY && event.newValue) {
      try {
        const message = JSON.parse(event.newValue) as SessionMessage;
        void this.handleMessage(message);
      } catch {
        // Ignore malformed cross-tab messages.
      }
      return;
    }
    if (event.key !== 'deml_auth_status') {
      return;
    }
    if (!event.newValue && this.authService.isAuthenticated()) {
      void this.forceLocalLogout('remote');
    }
  };

  private publish(message: SessionMessage): void {
    this.channel?.postMessage(message);
    localStorage.setItem(
      SESSION_EVENT_STORAGE_KEY,
      JSON.stringify({ ...message, nonce: `${SESSION_TAB_ID}-${Date.now()}` }),
    );
  }

  private async handleMessage(message: SessionMessage): Promise<void> {
    if ('sourceId' in message && message.sourceId === SESSION_TAB_ID) {
      return;
    }
    if (message.type === 'logout') {
      if (this.authService.isAuthenticated()) {
        await this.forceLocalLogout(message.reason);
      }
      return;
    }
    if (message.type === 'extend' && this.authService.isAuthenticated()) {
      this.sessionIdle.syncExtendedSession();
    }
  }

  private async forceLocalLogout(reason?: string): Promise<void> {
    this.sessionIdle.stop();
    await this.authService.logout();
    const query = reason === 'timeout' ? { reason: 'timeout' } : undefined;
    void this.router.navigate(['/login'], { queryParams: query });
  }

  /** Server- or cross-tab initiated sign-out. */
  async forceLogout(reason?: string): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      return;
    }
    await this.forceLocalLogout(reason);
  }
}
