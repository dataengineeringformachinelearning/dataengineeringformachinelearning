import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  contentChildren,
  signal,
  viewChild,
} from '@angular/core';
import { FluxIcon } from '../icon/icon';

/** A single slide inside flux-carousel. */
@Component({
  selector: 'flux-carousel-slide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'group', 'aria-roledescription': 'slide' },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        flex: 0 0 100%;
        scroll-snap-align: start;
        display: block;
        box-sizing: border-box;
      }
    `,
  ],
})
export class FluxCarouselSlide {}

/**
 * flux-carousel — scroll-snap slideshow (https://fluxui.dev/components/carousel).
 */
@Component({
  selector: 'flux-carousel',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-roledescription': 'carousel' },
  template: `
    <div class="flux-carousel-viewport" #viewport (scroll)="onScroll()">
      <ng-content />
    </div>
    <div class="flux-carousel-controls">
      <button
        type="button"
        class="flux-carousel-nav"
        aria-label="Previous slide"
        [disabled]="index() <= 0"
        (click)="goTo(index() - 1)"
      >
        <flux-icon name="chevron-left" [size]="18" />
      </button>
      <div class="flux-carousel-dots">
        @for (slide of slides(); track $index) {
          <button
            type="button"
            class="flux-carousel-dot"
            [class.flux-active]="$index === index()"
            [attr.aria-label]="'Go to slide ' + ($index + 1)"
            [attr.aria-current]="$index === index()"
            (click)="goTo($index)"
          ></button>
        }
      </div>
      <button
        type="button"
        class="flux-carousel-nav"
        aria-label="Next slide"
        [disabled]="index() >= slides().length - 1"
        (click)="goTo(index() + 1)"
      >
        <flux-icon name="chevron-right" [size]="18" />
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .flux-carousel-viewport {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        border-radius: var(--flux-radius);
        border: 1px solid var(--flux-border);
        background: var(--flux-surface);
        scrollbar-width: none;
      }
      .flux-carousel-viewport::-webkit-scrollbar {
        display: none;
      }
      .flux-carousel-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--flux-space-2);
        margin-top: var(--flux-space-1);
      }
      .flux-carousel-nav {
        display: inline-flex;
        border: 1px solid var(--flux-border-strong);
        background: var(--flux-surface);
        color: var(--flux-text);
        border-radius: var(--flux-radius-pill);
        padding: var(--flux-space-1);
        cursor: pointer;
        transition: var(--flux-transition);
      }
      .flux-carousel-nav:hover:not(:disabled) {
        border-color: var(--flux-accent-strong);
        background: var(--flux-accent-soft);
      }
      .flux-carousel-nav:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
      .flux-carousel-nav:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .flux-carousel-dots {
        display: flex;
        gap: var(--flux-space-1);
      }
      .flux-carousel-dot {
        width: 11px;
        height: 11px;
        border-radius: var(--flux-radius-pill);
        border: 1px solid var(--flux-border-strong);
        background: var(--flux-surface-alt);
        cursor: pointer;
        padding: 0;
        transition: var(--flux-transition);
      }
      .flux-carousel-dot.flux-active {
        background: var(--flux-accent);
        border-color: var(--flux-accent);
      }
      .flux-carousel-dot:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class FluxCarousel {
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  protected readonly slides = contentChildren(FluxCarouselSlide);
  protected readonly index = signal(0);

  protected goTo = (target: number): void => {
    const clamped = Math.min(this.slides().length - 1, Math.max(0, target));
    const element = this.viewport().nativeElement;
    element.scrollTo({ left: clamped * element.clientWidth, behavior: 'smooth' });
    this.index.set(clamped);
  };

  protected onScroll = (): void => {
    const element = this.viewport().nativeElement;
    if (element.clientWidth > 0) {
      this.index.set(Math.round(element.scrollLeft / element.clientWidth));
    }
  };
}
