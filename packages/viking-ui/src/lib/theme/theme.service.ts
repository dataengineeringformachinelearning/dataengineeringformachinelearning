import { isPlatformBrowser } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from "@angular/core";
import { runOptimistic } from "../../core/optimistic";
import { getDefaultPreferencesStore } from "../../core/preferences";
import {
  type SuiteThemePreference,
  type SuiteThemeResolved,
  applySuiteTheme,
  dispatchSuiteThemeChange,
  prefersDarkScheme,
  readSuiteThemePreference,
  resolveSuiteTheme,
  toggleSuiteThemePreference,
  cycleSuiteThemePreference,
  writeSuiteThemePreference,
} from "../../core/theme";
import { VikingCommandHistoryService } from "../command-history/command-history.service";

/**
 * VikingThemeService — suite light/dark/system with persistence + OS sync.
 * Apply `data-theme` on `<html>`; FOUC script should mirror read/resolve.
 * Equality-guarded: skips DOM writes / events when nothing changed.
 * Theme changes are optimistic with storage rollback on failure.
 */
@Injectable({ providedIn: "root" })
export class VikingThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly history = inject(VikingCommandHistoryService);
  private media: MediaQueryList | null = null;
  private readonly onMediaChange = (): void => {
    if (this.preference() !== "system") return;
    this.applyCurrent();
  };

  private readonly preferenceSignal = signal<SuiteThemePreference>("system");
  private readonly systemDarkSignal = signal(true);

  /** Stored preference: light | dark | system. */
  readonly preference = this.preferenceSignal.asReadonly();

  /** Resolved appearance applied to the document. */
  readonly theme = computed<SuiteThemeResolved>(() =>
    resolveSuiteTheme(this.preferenceSignal(), this.systemDarkSignal()),
  );

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const prefs = getDefaultPreferencesStore();
    this.preferenceSignal.set(prefs.get().theme || readSuiteThemePreference());
    if (typeof window.matchMedia === "function") {
      this.media = window.matchMedia("(prefers-color-scheme: dark)");
      this.systemDarkSignal.set(prefersDarkScheme(this.media));
      this.media.addEventListener("change", this.onMediaChange);
      this.destroyRef.onDestroy(() => {
        this.media?.removeEventListener("change", this.onMediaChange);
      });
    } else {
      this.systemDarkSignal.set(true);
    }
    // Follow preferences store (cross-tab sync owned by VikingPreferencesService).
    const unsubPrefs = prefs.subscribe(() => {
      const next = prefs.get().theme;
      if (next !== this.preferenceSignal()) {
        this.preferenceSignal.set(next);
        this.applyCurrent({ preferenceChanged: true });
      }
    });
    this.destroyRef.onDestroy(unsubPrefs);
    this.applyCurrent();
  }

  /**
   * Optimistic theme change: update UI immediately, persist to storage, roll
   * back preference + DOM if storage throws (quota / private mode).
   * Successful changes join the command-history stack (⌘Z / Undo toast).
   */
  setPreference(
    preference: SuiteThemePreference,
    opts?: { readonly recordHistory?: boolean },
  ): void {
    if (preference === this.preferenceSignal()) return;
    if (!isPlatformBrowser(this.platformId)) {
      this.preferenceSignal.set(preference);
      return;
    }

    const previous = this.preferenceSignal();
    const commit = async (next: SuiteThemePreference): Promise<void> => {
      const result = await runOptimistic({
        snapshot: () => this.preferenceSignal(),
        apply: () => {
          this.preferenceSignal.set(next);
          this.applyCurrent({ preferenceChanged: true });
        },
        persist: () => {
          writeSuiteThemePreference(next);
          getDefaultPreferencesStore().patch(
            { theme: next },
            { source: "theme" },
          );
        },
        rollback: (snap) => {
          this.preferenceSignal.set(snap);
          this.applyCurrent({ preferenceChanged: true });
        },
      });
      if (!result.ok) {
        throw result.error ?? new Error("Theme preference could not be saved");
      }
    };

    if (opts?.recordHistory === false) {
      void commit(preference);
      return;
    }

    void this.history.run({
      label: `Theme → ${preference}`,
      do: () => commit(preference),
      undo: () => commit(previous),
    });
  }

  /** Flip explicit light ↔ dark based on current resolved theme. */
  toggleTheme(): void {
    const next = toggleSuiteThemePreference(
      this.preferenceSignal(),
      this.systemDarkSignal(),
    );
    this.setPreference(next);
  }

  /** Cycle system → light → dark → system. */
  cyclePreference(): void {
    this.setPreference(cycleSuiteThemePreference(this.preferenceSignal()));
  }

  useSystemPreference(): void {
    this.setPreference("system");
  }

  private applyCurrent(opts?: { preferenceChanged?: boolean }): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const systemDark = this.media
      ? prefersDarkScheme(this.media)
      : this.systemDarkSignal();
    if (systemDark !== this.systemDarkSignal()) {
      this.systemDarkSignal.set(systemDark);
    }

    const preference = this.preferenceSignal();
    const resolved = resolveSuiteTheme(preference, this.systemDarkSignal());
    const domChanged = applySuiteTheme(resolved);
    // Dispatch when DOM changed, or preference changed with same resolved
    // (e.g. system → dark while OS is dark) so labels/subscribers update.
    if (domChanged || opts?.preferenceChanged) {
      dispatchSuiteThemeChange({ preference, resolved });
    }
  }
}
