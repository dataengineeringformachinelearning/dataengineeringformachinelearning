import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
} from "@angular/core";
import { VikingSkeleton } from "../skeleton/skeleton";

/**
 * viking-card — surface container.
 * Compose with viking-card-header / viking-card-footer for structured layouts.
 */
@Component({
  selector: "viking-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.viking-card-interactive]": "interactive()",
    "[class.viking-card-loading]": "loading()",
    "[class.viking-card-compact]": "compact()",
    "[attr.aria-busy]": "loading() ? 'true' : null",
    "[attr.tabindex]": "interactive() ? 0 : null",
    "[attr.role]": "interactive() ? 'button' : null",
    "(keydown.enter)": "onActivate($event)",
    "(keydown.space)": "onActivate($event)",
  },
  template: `
    @if (loading()) {
      <div class="viking-card-skeleton" aria-hidden="true">
        <viking-skeleton height="var(--viking-font-size-lg)" width="45%" />
        <viking-skeleton height="var(--viking-font-size-sm)" width="80%" />
        <viking-skeleton height="var(--viking-font-size-sm)" width="65%" />
      </div>
    } @else {
      <ng-content />
    }
  `,
  imports: [VikingSkeleton],
  styles: [
    `
      :host {
        display: grid;
        gap: var(--viking-card-content-gap, var(--viking-space-3));
        background: var(--viking-surface);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-lg);
        padding: var(--viking-card-padding, var(--viking-space-3));
        color: var(--viking-text);
        transition: var(--viking-transition-interactive);
        min-width: 0;
      }
      :host(.viking-card-headerless) .viking-card-header,
      :host(.viking-card-headerless) viking-card-header {
        display: none;
      }
      :host(.viking-card-interactive) {
        cursor: pointer;
      }
      :host(.viking-card-interactive):focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      :host(.viking-card-interactive):hover {
        border-color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-sm);
        transform: translateY(var(--viking-state-hover-lift));
      }
      :host(.viking-card-interactive):active {
        transform: translateY(0) scale(var(--viking-state-active-scale));
      }
      :host(.viking-card-loading) {
        pointer-events: none;
      }
      :host(.viking-card-compact) {
        padding: var(--viking-card-padding-compact, var(--viking-space-2));
        gap: var(--viking-card-content-gap-compact, var(--viking-space-2));
      }
      .viking-card-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
      }
    `,
  ],
})
export class VikingCard {
  readonly interactive = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly compact = input<boolean>(false);

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  protected onActivate = (event: Event): void => {
    if (!this.interactive() || this.loading()) {
      return;
    }
    event.preventDefault();
    this.host.nativeElement.click();
  };
}

/** Header row for viking-card. */
@Component({
  selector: "viking-card-header",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-3);
        padding-bottom: var(--viking-space-2-5);
        margin-bottom: 0;
        border-bottom: 1px solid var(--viking-border-subtle);
      }
      /* Support slotted left meta + right actions uniformly */
      :host ::ng-deep > * {
        display: inline-flex;
        align-items: center;
      }

      :host ::ng-deep viking-card-title {
        flex: 1 1 auto;
        min-width: 0;
      }
    `,
  ],
})
export class VikingCardHeader {}

/** Footer row for viking-card. */
@Component({
  selector: "viking-card-footer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--viking-space-2);
        padding-top: var(--viking-space-2-5);
        margin-top: 0;
        border-top: 1px solid var(--viking-border-subtle);
      }
    `,
  ],
})
export class VikingCardFooter {}
