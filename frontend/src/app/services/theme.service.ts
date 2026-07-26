import { Injectable, inject } from '@angular/core';
import {
  VikingThemeService,
  type SuiteThemePreference,
  type SuiteThemeResolved,
} from '@dataengineeringformachinelearning/viking-ui';

/**
 * App ThemeService — thin façade over suite VikingThemeService
 * (system preference + persistence + data-theme apply).
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly suite = inject(VikingThemeService);

  /** Resolved light | dark currently on the document. */
  get theme() {
    return this.suite.theme;
  }

  /** Stored preference including system. */
  get preference() {
    return this.suite.preference;
  }

  toggleTheme(): void {
    this.suite.toggleTheme();
  }

  cyclePreference(): void {
    this.suite.cyclePreference();
  }

  useSystemPreference(): void {
    this.suite.useSystemPreference();
  }

  setPreference(preference: SuiteThemePreference): void {
    this.suite.setPreference(preference);
  }

  /** @deprecated use theme() — kept for call sites expecting SuiteThemeResolved */
  resolved(): SuiteThemeResolved {
    return this.suite.theme();
  }
}
