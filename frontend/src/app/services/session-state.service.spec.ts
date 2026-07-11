import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import {
  SESSION_EVENT_STORAGE_KEY,
  SESSION_TAB_ID,
  SessionIdleService,
} from './session-idle.service';
import { SessionStateService } from './session-state.service';

describe('SessionStateService cross-tab idle synchronization', () => {
  const authMock = {
    isAuthenticated: vi.fn(() => true),
    logout: vi.fn(async () => undefined),
  };
  const idleMock = {
    start: vi.fn(),
    stop: vi.fn(),
    syncExtendedSession: vi.fn(),
  };
  const routerMock = {
    navigate: vi.fn(async () => true),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    idleMock.start.mockClear();
    idleMock.stop.mockClear();
    idleMock.syncExtendedSession.mockClear();
    TestBed.configureTestingModule({
      providers: [
        SessionStateService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authMock },
        { provide: SessionIdleService, useValue: idleMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('applies an extension from another tab', async () => {
    TestBed.inject(SessionStateService).init();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SESSION_EVENT_STORAGE_KEY,
        newValue: JSON.stringify({ type: 'extend', sourceId: 'another-tab' }),
      }),
    );
    await Promise.resolve();

    expect(idleMock.syncExtendedSession).toHaveBeenCalledTimes(1);
  });

  it('ignores its own extension event to prevent echo loops', async () => {
    TestBed.inject(SessionStateService).init();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SESSION_EVENT_STORAGE_KEY,
        newValue: JSON.stringify({ type: 'extend', sourceId: SESSION_TAB_ID }),
      }),
    );
    await Promise.resolve();

    expect(idleMock.syncExtendedSession).not.toHaveBeenCalled();
  });
});
