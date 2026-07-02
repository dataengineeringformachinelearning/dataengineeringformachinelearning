import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { VIKING_ICON_PATHS, VikingIconName } from '../core/icons';

/**
 * viking-icon — inline SVG icon (https://fluxui.dev/components/icon).
 * Zero-dependency 24x24 stroke icons from the internal registry.
 */
@Component({
  selector: 'viking-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.viking-icon-spin]': 'spin()',
    'aria-hidden': 'true',
  },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [innerHTML]="paths()"
    ></svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        line-height: 0;
      }
      :host(.viking-icon-spin) svg {
        animation: viking-icon-rotate 0.9s linear infinite;
      }
      @keyframes viking-icon-rotate {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class VikingIcon {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<VikingIconName>();
  readonly size = input<number>(24);
  readonly spin = input<boolean>(false);

  protected readonly paths = computed<SafeHtml>(() =>
    // Registry content is a static, trusted constant defined inside this package.
    this.sanitizer.bypassSecurityTrustHtml(VIKING_ICON_PATHS[this.name()] ?? ''),
  );
}
