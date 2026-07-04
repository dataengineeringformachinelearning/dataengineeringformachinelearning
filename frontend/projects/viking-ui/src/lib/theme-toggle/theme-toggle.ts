import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { VikingIcon } from '../icon/icon';

/**
 * viking-theme-toggle — navbar utility control for light/dark theme switching.
 * Uses `.theme-toggle-btn` styles from viking-ui.css (static-navbar.scss).
 */
@Component({
  selector: 'viking-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [VikingIcon],
  host: { class: 'viking-theme-toggle-host' },
  template: `
    <button
      type="button"
      class="theme-toggle-btn"
      aria-label="Toggle light and dark theme"
      (click)="toggle.emit()"
    >
      <viking-icon [name]="icon()" [size]="20" />
    </button>
  `,
})
export class VikingThemeToggle {
  readonly theme = input<'light' | 'dark'>('dark');
  readonly toggle = output<void>();

  protected readonly icon = computed(() => (this.theme() === 'dark' ? 'sun' : 'moon'));
}
