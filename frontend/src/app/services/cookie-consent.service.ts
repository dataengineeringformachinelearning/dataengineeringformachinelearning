import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CookiePreferences {
  necessary: boolean;
  analytical: boolean;
  marketing: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CookieConsentService {
  private platformId = inject(PLATFORM_ID);
  
  private preferencesSignal = signal<CookiePreferences>({
    necessary: true,
    analytical: false,
    marketing: false,
  });

  private hasDecidedSignal = signal<boolean>(false);
  private showBannerSignal = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('cookie_consent');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<CookiePreferences>;
          this.preferencesSignal.set({
            necessary: true,
            analytical: !!parsed.analytical,
            marketing: !!parsed.marketing,
          });
          this.hasDecidedSignal.set(true);
          this.showBannerSignal.set(false);
        } catch (e) {
          this.showBannerSignal.set(true);
        }
      } else {
        this.showBannerSignal.set(true);
      }
    }
  }

  get preferences() {
    return this.preferencesSignal.asReadonly();
  }

  get hasDecided() {
    return this.hasDecidedSignal.asReadonly();
  }

  get showBanner() {
    return this.showBannerSignal.asReadonly();
  }

  acceptAll() {
    this.save({
      necessary: true,
      analytical: true,
      marketing: true,
    });
  }

  rejectAll() {
    this.save({
      necessary: true,
      analytical: false,
      marketing: false,
    });
  }

  savePreferences(prefs: Omit<CookiePreferences, 'necessary'>) {
    this.save({
      necessary: true,
      analytical: prefs.analytical,
      marketing: prefs.marketing,
    });
  }

  openSettings() {
    this.showBannerSignal.set(true);
  }

  closeBanner() {
    // Only allow closing if they've already made a decision.
    if (this.hasDecidedSignal()) {
      this.showBannerSignal.set(false);
    }
  }

  private save(prefs: CookiePreferences) {
    this.preferencesSignal.set(prefs);
    this.hasDecidedSignal.set(true);
    this.showBannerSignal.set(false);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('cookie_consent', JSON.stringify(prefs));
      // Dispatch a custom event to notify other scripts or third-party libraries of the cookie update
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: prefs }));
    }
  }
}
