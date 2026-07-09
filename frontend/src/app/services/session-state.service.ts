import { Injectable, Injector, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SessionIdleService } from './session-idle.service';

const SESSION_CHANNEL = 'deml-session';

type SessionMessage =
  | { type: 'logout'; reason?: string }
  | { type: 'extend' }
  | { type: 'auth-sync' };

/**
 * Cross-tab session coordination via BroadcastChannel + localStorage.
 * Keeps Sign In/Sign Out state aligned and propagates idle timeout sign-out.
 */
@Injectable({ providedIn: 'root' })
export class SessionStateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly sessionIdle = inject(SessionIdleService);
  private readonly router = inject(Router);

  private channel: BroadcastChannel | null = null;
  private authEffectRegistered = false;

  /** Lazy resolve breaks AuthService ↔ SessionStateService circular DI during SSR. */
  private get authService(): AuthService {
    return this.injector.get(AuthService);
  }

  init(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.bindAuthLifecycle();
    this.bindCrossTab();
  }

  /** Notify other tabs that this tab signed out or timed out. */
  broadcastLogout(reason?: string): void {
    this.channel?.postMessage({ type: 'logout', reason } satisfies SessionMessage);
  }

  /** Reset idle timers in every open tab. */
  broadcastExtend(): void {
    this.channel?.postMessage({ type: 'extend' } satisfies SessionMessage);
  }

  private bindAuthLifecycle(): void {
    if (this.authEffectRegistered) {
      return;
    }
    this.authEffectRegistered = true;

    let previous = this.authService.isAuthenticated();
    const sync = (): void => {
      const next = this.authService.isAuthenticated();
      if (next === previous) {
        return;
      }
      previous = next;
      if (next) {
        this.sessionIdle.start();
      } else {
        this.sessionIdle.stop();
      }
    };

    // Poll signal transitions — AuthService uses Angular signals without effect hook here.
    const interval = window.setInterval(sync, 500);
    window.addEventListener('beforeunload', () => window.clearInterval(interval));
    sync();
  }

  private bindCrossTab(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(SESSION_CHANNEL);
      this.channel.onmessage = (event: MessageEvent<SessionMessage>) => {
        void this.handleMessage(event.data);
      };
    }

    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== 'deml_auth_status') {
        return;
      }
      if (!event.newValue && this.authService.isAuthenticated()) {
        void this.forceLocalLogout('remote');
      }
    });
  }

  private async handleMessage(message: SessionMessage): Promise<void> {
    if (message.type === 'logout') {
      if (this.authService.isAuthenticated()) {
        await this.forceLocalLogout(message.reason);
      }
      return;
    }
    if (message.type === 'extend' && this.authService.isAuthenticated()) {
      this.sessionIdle.extendSession();
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
