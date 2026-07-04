import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { VikingSkeleton } from '../skeleton/skeleton';

/**
 * viking-card — surface container.
 * Compose with viking-card-header / viking-card-footer for structured layouts.
 */
@Component({
  selector: 'viking-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.viking-card-interactive]': 'interactive()',
    '[class.viking-card-loading]': 'loading()',
    '[class.viking-card-compact]': 'compact()',
    '[attr.aria-busy]': "loading() ? 'true' : null",
    '[attr.tabindex]': 'interactive() ? 0 : null',
    '[attr.role]': "interactive() ? 'button' : null",
    '(keydown.enter)': 'onActivate($event)',
    '(keydown.space)': 'onActivate($event)',
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
        display: block;
        background: var(--viking-surface);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-lg);
        box-shadow: var(--viking-shadow-sm);
        padding: var(--viking-space-3);
        color: var(--viking-text);
        transition: var(--viking-transition-interactive);
        position: relative;
        overflow: hidden;
        min-width: 0;
      }
      :host(.viking-card-headerless) .viking-card-header,
      :host(.viking-card-headerless) viking-card-header {
        display: none;
      }
      :host::before {
        content: '';
        position: absolute;
        inset: 0 0 auto;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          color-mix(in srgb, var(--viking-metallic-200) 18%, transparent),
          transparent
        );
        pointer-events: none;
      }
      :host(.viking-card-interactive) {
        cursor: pointer;
      }
      :host(.viking-card-interactive):hover {
        border-color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-hover);
        transform: translateY(var(--viking-state-hover-lift));
      }
      :host(.viking-card-interactive):active {
        transform: translateY(0) scale(var(--viking-state-active-scale));
        box-shadow: var(--viking-shadow-md);
      }
      :host(.viking-card-interactive):focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      :host(.viking-card-loading) {
        pointer-events: none;
      }
      :host(.viking-card-compact) {
        padding: var(--viking-space-2);
      }
      .viking-card-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1-5);
      }
    `,
  ],
})
export class VikingCard {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly interactive = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly compact = input<boolean>(false);

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
  selector: 'viking-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-2);
        padding-bottom: var(--viking-space-2);
        margin-bottom: var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border-subtle);
      }
      /* Support slotted left meta + right actions uniformly */
      :host ::ng-deep > * {
        display: inline-flex;
        align-items: center;
      }
    `,
  ],
})
export class VikingCardHeader {}

/** Footer row for viking-card. */
@Component({
  selector: 'viking-card-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--viking-space-2);
        padding-top: var(--viking-space-2);
        margin-top: var(--viking-space-2);
        border-top: 1px solid var(--viking-border-subtle);
      }
    `,
  ],
})
export class VikingCardFooter {}
