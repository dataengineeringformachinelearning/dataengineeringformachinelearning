import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  VIKING_BRAND_ICON_NAMES,
  VIKING_FILLED_ICON_NAMES,
  VIKING_ICON_PATHS,
  resolveVikingIcon,
  vikingIconViewBox,
  VikingIconName,
} from '../core/icons';

/**
 * viking-icon — inline SVG icon.
 * Zero-dependency stroke icons from the internal registry; brand marks use official artwork.
 */
@Component({
  selector: 'viking-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.viking-icon-spin]': 'spin()',
    'aria-hidden': 'true',
  },
  template: `
    @if (resolvedName() === 'google') {
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        [style.width.px]="size()"
        [style.height.px]="size()"
        aria-hidden="true"
      >
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.5 24c0-1.55-.15-3.24-.47-4.77H24v9.03h12.75c-.55 2.83-2.13 5.23-4.53 6.82l7.02 5.44C43.35 36.56 46.5 30.82 46.5 24z"
        />
        <path
          fill="#FBBC05"
          d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.98-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.02-5.44c-1.99 1.33-4.51 2.15-7.87 2.15-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    } @else if (resolvedName() === 'apple') {
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 170 170"
        fill="currentColor"
        [style.width.px]="size()"
        [style.height.px]="size()"
        aria-hidden="true"
      >
        <path
          d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.25-9.3-.9-14.86-3.47-5.56-2.57-9.9-6.93-13.01-13.06-7.72-14.88-11.58-30.82-11.58-47.81 0-14.93 3.33-27.07 9.99-36.42 6.66-9.35 15.26-14.07 25.81-14.17 5.11-.1 10.13 1.54 15.06 4.9 4.93 3.37 8.52 4.9 10.77 4.58 2.05-.32 5.56-1.92 10.53-4.78 4.96-2.87 9.87-4.22 14.72-4.05 15.2.85 26.68 6.58 34.41 17.2-12.18 7.37-18.15 17.51-17.9 30.4.25 10.3 4.18 18.91 11.78 25.8 7.6 6.89 16.48 10.5 26.63 10.82-1.95 5.66-4.66 11.45-8.12 17.38zm-30.34-114.7c0 8.16-2.92 15.53-8.76 21.09-5.84 5.56-12.79 8.78-20.85 9.68-.2-1.63-.3-3.23-.3-4.79 0-8.41 3.12-16.14 9.35-23.19 6.23-7.05 13.68-11.02 22.37-11.9.1.86.19 2.06.19 3.61z"
        />
      </svg>
    } @else {
      <svg
        xmlns="http://www.w3.org/2000/svg"
        [attr.viewBox]="viewBox()"
        [attr.fill]="filled() ? 'currentColor' : 'none'"
        [attr.stroke]="filled() ? 'none' : 'currentColor'"
        [attr.stroke-width]="filled() ? null : '1.8'"
        stroke-linecap="round"
        stroke-linejoin="round"
        [style.width.px]="size()"
        [style.height.px]="size()"
        [innerHTML]="paths()"
      ></svg>
    }
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

  readonly name = input.required<VikingIconName | string>();
  readonly size = input<number>(24);
  readonly spin = input<boolean>(false);

  protected readonly resolvedName = computed(() => resolveVikingIcon(this.name()));

  protected readonly viewBox = computed(() => vikingIconViewBox(this.resolvedName()));

  protected readonly filled = computed(() => {
    const name = this.resolvedName();
    if ((VIKING_BRAND_ICON_NAMES as readonly string[]).includes(name)) {
      return false;
    }
    return (VIKING_FILLED_ICON_NAMES as readonly string[]).includes(name);
  });

  protected readonly paths = computed<SafeHtml>(() =>
    // Registry content is a static, trusted constant defined inside this package.
    this.sanitizer.bypassSecurityTrustHtml(VIKING_ICON_PATHS[this.resolvedName()] ?? ''),
  );
}
