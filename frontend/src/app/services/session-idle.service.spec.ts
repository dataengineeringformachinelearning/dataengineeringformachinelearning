import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VikingDialogService } from '@dataengineeringformachinelearning/viking-ui';
import { AuthService } from './auth.service';
import {
  SESSION_EVENT_STORAGE_KEY,
  SESSION_IDLE_CONFIG,
  SessionIdleService,
  type SessionIdleConfig,
} from './session-idle.service';

const TEST_CONFIG: SessionIdleConfig = {
  idleMs: 5000,
  warningLeadMs: 3000,
  activityThrottleMs: 10,
  crossTabThrottleMs: 100,
};

describe('SessionIdleService', () => {
  let service: SessionIdleService;
  let dialog: VikingDialogService;
  const authMock = {
    isAuthenticated: vi.fn(() => true),
    logout: vi.fn(async () => undefined),
  };
  const routerMock = {
    navigate: vi.fn(async () => true),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T12:00:00Z'));
    localStorage.clear();
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.logout.mockClear();
    routerMock.navigate.mockClear();

    TestBed.configureTestingModule({
      providers: [
        SessionIdleService,
        VikingDialogService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
        { provide: SESSION_IDLE_CONFIG, useValue: TEST_CONFIG },
      ],
    });
    service = TestBed.inject(SessionIdleService);
    dialog = TestBed.inject(VikingDialogService);
  });

  afterEach(() => {
    service.stop();
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.useRealTimers();
  });

  const flushPromises = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
  };

  it('opens a live countdown warning before the absolute deadline', async () => {
    service.start();
    await vi.advanceTimersByTimeAsync(2000);

    expect(dialog.active()?.data?.title).toBe('Session expiring soon');
    expect(dialog.active()?.data?.message).toContain('3 seconds');
    expect(service.warningRemainingSeconds()).toBe(3);

    await vi.advanceTimersByTimeAsync(1000);

    expect(dialog.active()?.data?.message).toContain('2 seconds');
    expect(service.warningRemainingSeconds()).toBe(2);
  });

  it('continues the session and resets the full idle window', async () => {
    service.start();
    await vi.advanceTimersByTimeAsync(2000);
    dialog.resolveConfirm(true);
    await flushPromises();

    expect(dialog.active()).toBeNull();
    await vi.advanceTimersByTimeAsync(4999);
    expect(authMock.logout).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(authMock.logout).toHaveBeenCalledTimes(1);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { reason: 'timeout' },
    });
  });

  it('signs out immediately when the warning is cancelled', async () => {
    service.start();
    await vi.advanceTimersByTimeAsync(2000);
    dialog.resolveConfirm(false);
    await flushPromises();

    expect(authMock.logout).toHaveBeenCalledTimes(1);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { reason: 'timeout' },
    });
  });

  it('automatically expires once and closes an open warning', async () => {
    service.start();
    await vi.advanceTimersByTimeAsync(5000);
    await flushPromises();

    expect(authMock.logout).toHaveBeenCalledTimes(1);
    expect(dialog.active()).toBeNull();
    expect(service.warningRemainingSeconds()).toBe(0);
  });

  it('enforces the absolute deadline when a background tab becomes visible late', async () => {
    service.start();
    vi.setSystemTime(new Date('2026-07-10T12:00:06Z'));
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();

    expect(authMock.logout).toHaveBeenCalledTimes(1);
  });

  it('accepts a remote extension without echoing another cross-tab event', async () => {
    service.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(dialog.active()).not.toBeNull();

    localStorage.removeItem(SESSION_EVENT_STORAGE_KEY);
    service.syncExtendedSession();
    await flushPromises();

    expect(dialog.active()).toBeNull();
    expect(localStorage.getItem(SESSION_EVENT_STORAGE_KEY)).toBeNull();
    await vi.advanceTimersByTimeAsync(4999);
    expect(authMock.logout).not.toHaveBeenCalled();
  });

  it('closes a pending warning without timing out after the service stops', async () => {
    service.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(dialog.active()).not.toBeNull();

    service.stop();
    await flushPromises();

    expect(dialog.active()).toBeNull();
    expect(authMock.logout).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
