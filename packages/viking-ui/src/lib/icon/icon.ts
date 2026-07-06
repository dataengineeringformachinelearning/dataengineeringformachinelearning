import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import {
  VIKING_FILLED_ICON_NAMES,
  VIKING_ICON_FILLED_PATHS,
  VIKING_ICON_PATHS,
  resolveVikingIcon,
  resolveVikingIconColor,
  resolveVikingIconSize,
  vikingIconViewBox,
  VikingIconColorToken,
  VikingIconName,
  VikingIconSizePreset,
  VikingIconVariant,
  VIKING_DRAKKAR_ICON_NAMES_LIST,
} from "../../core/icons";
import {
  isIntegrationBrandIcon,
  VIKING_INTEGRATION_BRAND_SVGS,
  type VikingIntegrationBrandName,
} from "../../core/integration-brand-icons";

const VIKING_FILLED_ICON_SET = new Set<string>(VIKING_FILLED_ICON_NAMES);
const VIKING_DRAKKAR_ICON_SET = new Set<string>(VIKING_DRAKKAR_ICON_NAMES_LIST);

/**
 * viking-icon — themeable inline SVG icon (Lucide-sourced registry + DEML brand marks).
 * Zero runtime dependencies; paths are inlined at build time from Lucide.
 *
 * @example Outline with semantic color
 * ```html
 * <viking-icon name="search" sizePreset="md" color="accent" />
 * ```
 *
 * @example Brand mark (outline)
 * ```html
 * <viking-icon name="drakkar" [size]="28" color="accent" />
 * ```
 */
@Component({
  selector: "viking-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.viking-icon-spin]": "spin()",
    "[class.viking-icon-filled]": "isFilled()",
    "[class.viking-icon-outline]": "!isFilled()",
    "[class.viking-icon-brand-drakkar]": "isDrakkarBrand()",
    "[class.viking-icon-sm]": 'sizePreset() === "sm"',
    "[class.viking-icon-md]": 'sizePreset() === "md"',
    "[class.viking-icon-lg]":
      'sizePreset() === "lg" || (!sizePreset() && !size())',
    "[class.viking-icon-backdrop]": "backdrop()",
    "[class.viking-icon-backdrop-success]":
      "backdrop() && backdropTone() === 'success'",
    "[class.viking-icon-backdrop-warning]":
      "backdrop() && backdropTone() === 'warning'",
    "[class.viking-icon-backdrop-danger]":
      "backdrop() && backdropTone() === 'danger'",
    "[class.viking-icon-backdrop-info]":
      "backdrop() && backdropTone() === 'info'",
    "[style.color]": "resolvedColor()",
    "aria-hidden": "true",
  },
  template: `
    @if (resolvedName() === "google") {
      <svg
        class="viking-icon-svg viking-icon-brand"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        [style.width.px]="resolvedSize()"
        [style.height.px]="resolvedSize()"
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
    } @else if (resolvedName() === "apple") {
      <svg
        class="viking-icon-svg viking-icon-brand"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        [style.width.px]="resolvedSize()"
        [style.height.px]="resolvedSize()"
        aria-hidden="true"
      >
        <path
          d="M16.365 12.14c.02 2.53 2.21 3.38 2.23 3.39-.02.07-.35 1.21-1.16 2.4-.7 1.02-1.43 2.03-2.58 2.05-1.13.02-1.49-.67-2.78-.67-1.29 0-1.69.65-2.75.69-1.11.04-1.95-1.12-2.66-2.13-1.44-2.08-2.54-5.87-1.07-8.43.73-1.27 2.04-2.08 3.46-2.1 1.08-.02 2.1.72 2.78.72.67 0 2.14-.89 3.61-.76.61.03 2.33.25 3.44 1.88-.09.06-2.05 1.2-2.03 3.55M13.75 3.64c.59-.71 1-1.7.89-2.68-.86.03-1.9.57-2.52 1.28-.55.63-1.03 1.65-.9 2.62.95.07 1.92-.49 2.53-1.22"
        />
      </svg>
    } @else if (isIntegrationBrand()) {
      <span
        class="viking-icon-svg-host"
        [style.width.px]="resolvedSize()"
        [style.height.px]="resolvedSize()"
        [innerHTML]="integrationBrandSvg()"
      ></span>
    } @else {
      <span
        class="viking-icon-svg-host"
        [style.width.px]="resolvedSize()"
        [style.height.px]="resolvedSize()"
        [innerHTML]="svgMarkup()"
      ></span>
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
        color: inherit;
      }

      .viking-icon-svg-host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        line-height: 0;
      }

      .viking-icon-svg-host .viking-icon-svg {
        width: 100%;
        height: 100%;
      }

      :host(.viking-icon-outline) .viking-icon-svg {
        --viking-icon-stroke-width: 1.75;
        stroke-width: var(--viking-icon-stroke-width);
        shape-rendering: geometricPrecision;
      }

      :host(.viking-icon-outline.viking-icon-brand-drakkar) .viking-icon-svg {
        --viking-icon-stroke-width: 1.5;
      }

      :host(.viking-icon-sm) .viking-icon-svg {
        --viking-icon-stroke-width: 1.5;
      }

      :host(.viking-icon-lg) .viking-icon-svg {
        --viking-icon-stroke-width: 1.75;
      }

      :host(.viking-icon-filled) .viking-icon-svg {
        stroke: none;
      }

      :host(.viking-icon-spin) svg {
        animation: viking-icon-rotate 0.9s linear infinite;
      }

      :host(.viking-icon-backdrop) {
        padding: var(--viking-icon-backdrop-padding, var(--viking-space-half));
        border-radius: var(--viking-radius-lg);
        background: var(--viking-accent-soft);
        color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-sm);
      }

      :host(.viking-icon-backdrop-success) {
        background: color-mix(in srgb, var(--viking-success) 14%, transparent);
        color: var(--viking-success);
      }

      :host(.viking-icon-backdrop-warning) {
        background: color-mix(in srgb, var(--viking-warning) 14%, transparent);
        color: var(--viking-warning);
      }

      :host(.viking-icon-backdrop-danger) {
        background: color-mix(in srgb, var(--viking-danger) 14%, transparent);
        color: var(--viking-danger);
      }

      :host(.viking-icon-backdrop-info) {
        background: color-mix(in srgb, var(--viking-info) 14%, transparent);
        color: var(--viking-info);
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
  readonly name = input.required<VikingIconName | string>();
  /** Explicit pixel size — overridden by sizePreset when set. */
  readonly size = input<number | undefined>(undefined);
  /** sm (16px) · md (20px) · lg (24px) */
  readonly sizePreset = input<VikingIconSizePreset | null>(null);
  /** outline (stroke) or filled (solid) */
  readonly variant = input<VikingIconVariant>("outline");
  /** Semantic token (accent, success, …) or any CSS color value. */
  readonly color = input<VikingIconColorToken | string | undefined>(undefined);
  /** Renders icon inside a padded tokenized backdrop (matches viking-icon-badge). */
  readonly backdrop = input<boolean>(false);
  readonly backdropTone = input<
    "default" | "success" | "warning" | "danger" | "info"
  >("default");
  readonly spin = input<boolean>(false);

  protected readonly resolvedName = computed(() =>
    resolveVikingIcon(this.name()),
  );

  protected readonly resolvedSize = computed(() =>
    resolveVikingIconSize(this.size(), this.sizePreset()),
  );

  protected readonly resolvedColor = computed(() =>
    resolveVikingIconColor(this.color()),
  );

  protected readonly viewBox = computed(() =>
    vikingIconViewBox(this.resolvedName()),
  );

  protected readonly isFilled = computed(() => {
    const name = this.resolvedName();
    if (name === "google" || name === "apple" || isIntegrationBrandIcon(name)) {
      return false;
    }
    if (this.variant() === "filled") {
      return true;
    }
    return VIKING_FILLED_ICON_SET.has(name);
  });

  protected readonly isDrakkarBrand = computed(() =>
    VIKING_DRAKKAR_ICON_SET.has(this.resolvedName()),
  );

  protected readonly isIntegrationBrand = computed(() =>
    isIntegrationBrandIcon(this.resolvedName()),
  );

  protected readonly integrationBrandSvg = computed<SafeHtml>(() => {
    const name = this.resolvedName() as VikingIntegrationBrandName;
    const html = VIKING_INTEGRATION_BRAND_SVGS[name] ?? "";
    const size = this.resolvedSize();
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg class="viking-icon-svg viking-icon-brand viking-icon-integration-brand" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: ${size}px; height: ${size}px;" aria-hidden="true"><g>${html}</g></svg>`,
    );
  });

  protected readonly svgMarkup = computed<SafeHtml>(() => {
    const name = this.resolvedName();
    const html =
      this.isFilled() && VIKING_ICON_FILLED_PATHS[name]
        ? VIKING_ICON_FILLED_PATHS[name]
        : (VIKING_ICON_PATHS[name] ?? "");
    const fill = this.isFilled() ? "currentColor" : "none";
    const fillRule = this.isFilled() ? ' fill-rule="evenodd"' : "";
    const stroke = this.isFilled() ? "none" : "currentColor";
    const size = this.resolvedSize();
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg class="viking-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${this.viewBox()}" fill="${fill}"${fillRule} stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="width: ${size}px; height: ${size}px;" aria-hidden="true"><g>${html}</g></svg>`,
    );
  });

  constructor(private readonly sanitizer: DomSanitizer) {}
}

/** Alias for consumers expecting VikingIconComponent. */
export { VikingIcon as VikingIconComponent };
