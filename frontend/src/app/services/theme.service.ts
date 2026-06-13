import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private themeSignal = signal<'light' | 'dark'>('dark');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        this.themeSignal.set(savedTheme);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.themeSignal.set(prefersDark ? 'dark' : 'light');
      }

      effect(() => {
        if (isPlatformBrowser(this.platformId)) {
          const activeTheme = this.themeSignal();
          document.documentElement.setAttribute('data-theme', activeTheme);
          localStorage.setItem('theme', activeTheme);
        }
      });
    }
  }

  get theme() {
    return this.themeSignal.asReadonly();
  }

  toggleTheme() {
    this.themeSignal.update(current => (current === 'light' ? 'dark' : 'light'));
  }
}
