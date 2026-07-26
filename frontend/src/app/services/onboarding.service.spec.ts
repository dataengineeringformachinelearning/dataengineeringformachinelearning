import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDefaultActivityLog,
  getDefaultOnboardingStore,
  resetDefaultActivityLog,
  resetDefaultOnboardingStore,
  VikingDialogService,
} from '@dataengineeringformachinelearning/viking-ui';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  beforeEach(() => {
    resetDefaultOnboardingStore();
    resetDefaultActivityLog();
    TestBed.configureTestingModule({
      providers: [
        OnboardingService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: VikingDialogService,
          useValue: {
            openOnboarding: vi.fn(() => Promise.resolve(true)),
          },
        },
      ],
    });
  });

  afterEach(() => {
    resetDefaultOnboardingStore();
    resetDefaultActivityLog();
  });

  it('shouldAutoOpen when guide is active and user has no pages', () => {
    const svc = TestBed.inject(OnboardingService);
    expect(svc.shouldAutoOpen(false)).toBe(true);
    expect(svc.shouldAutoOpen(true)).toBe(false);
  });

  it('markComplete writes store and activity', () => {
    const svc = TestBed.inject(OnboardingService);
    svc.markComplete();
    expect(getDefaultOnboardingStore().get().completed).toBe(true);
    expect(
      getDefaultActivityLog()
        .list()
        .some(e => e.kind === 'onboarding.complete'),
    ).toBe(true);
  });

  it('markSkipped dismisses guide and records activity', () => {
    const svc = TestBed.inject(OnboardingService);
    svc.markSkipped();
    expect(getDefaultOnboardingStore().get().dismissed).toBe(true);
    expect(svc.shouldShowGuide()).toBe(false);
    expect(
      getDefaultActivityLog()
        .list()
        .some(e => e.kind === 'onboarding.dismiss'),
    ).toBe(true);
  });

  it('openWizard delegates to VikingDialogService', async () => {
    const dialog = TestBed.inject(VikingDialogService);
    const svc = TestBed.inject(OnboardingService);
    await svc.openWizard(true);
    expect(dialog.openOnboarding).toHaveBeenCalledWith(true);
  });
});
