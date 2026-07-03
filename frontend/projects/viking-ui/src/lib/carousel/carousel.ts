import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  contentChildren,
  signal,
  viewChild,
} from '@angular/core';
import { VikingIcon } from '../icon/icon';

/** A single slide inside viking-carousel. */
@Component({
  selector: 'viking-carousel-slide',
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
export class VikingCarouselSlide {}

/**
 * viking-carousel — scroll-snap slideshow.
 */
@Component({
  selector: 'viking-carousel',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-roledescription': 'carousel' },
  template: `
    <div
      class="viking-carousel-viewport"
      #viewport
      tabindex="0"
      role="group"
      aria-label="Carousel slides"
      (scroll)="onScroll()"
    >
      <ng-content />
    </div>
    <div class="viking-carousel-controls">
      <button
        type="button"
        class="viking-carousel-nav"
        aria-label="Previous slide"
        [disabled]="index() <= 0"
        (click)="goTo(index() - 1)"
      >
        <viking-icon name="chevron-left" [size]="18" />
      </button>
      <div class="viking-carousel-dots">
        @for (slide of slides(); track $index) {
          <button
            type="button"
            class="viking-carousel-dot"
            [class.viking-active]="$index === index()"
            [attr.aria-label]="'Go to slide ' + ($index + 1)"
            [attr.aria-current]="$index === index()"
            (click)="goTo($index)"
          ></button>
        }
      </div>
      <button
        type="button"
        class="viking-carousel-nav"
        aria-label="Next slide"
        [disabled]="index() >= slides().length - 1"
        (click)="goTo(index() + 1)"
      >
        <viking-icon name="chevron-right" [size]="18" />
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .viking-carousel-viewport {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        border-radius: var(--viking-radius);
        border: 1px solid var(--viking-border);
        background: var(--viking-surface);
        scrollbar-width: none;
      }
      .viking-carousel-viewport::-webkit-scrollbar {
        display: none;
      }
      .viking-carousel-viewport:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-carousel-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--viking-space-2);
        margin-top: var(--viking-space-1);
      }
      .viking-carousel-nav {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--viking-touch-target-comfort);
        min-height: var(--viking-touch-target-comfort);
        border: 1px solid var(--viking-border-strong);
        background: var(--viking-surface);
        color: var(--viking-text);
        border-radius: var(--viking-radius-pill);
        padding: var(--viking-space-1);
        cursor: pointer;
        transition: var(--viking-transition-interactive);
        -webkit-tap-highlight-color: transparent;
      }
      .viking-carousel-nav:hover:not(:disabled) {
        border-color: var(--viking-accent-strong);
        background: var(--viking-accent-soft);
        box-shadow: var(--viking-shadow-sm);
        transform: translateY(var(--viking-state-hover-lift));
      }
      .viking-carousel-nav:active:not(:disabled) {
        transform: translateY(0) scale(var(--viking-state-active-scale));
      }
      .viking-carousel-nav:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-carousel-nav:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .viking-carousel-dots {
        display: flex;
        gap: var(--viking-space-1);
      }
      .viking-carousel-dot {
        position: relative;
        width: var(--viking-space-1);
        height: var(--viking-space-1);
        border-radius: var(--viking-radius-pill);
        border: 1px solid var(--viking-border-strong);
        background: var(--viking-surface-alt);
        cursor: pointer;
        padding: 0;
        transition: var(--viking-transition-interactive);
        -webkit-tap-highlight-color: transparent;
      }
      .viking-carousel-dot::before {
        content: '';
        position: absolute;
        inset: 50%;
        width: var(--viking-touch-target-min);
        height: var(--viking-touch-target-min);
        transform: translate(-50%, -50%);
      }
      .viking-carousel-dot:hover:not(.viking-active) {
        border-color: var(--viking-accent-strong);
        background: var(--viking-accent-soft);
      }
      .viking-carousel-dot.viking-active {
        background: var(--viking-accent);
        border-color: var(--viking-accent);
        box-shadow: 0 0 0 2px var(--viking-accent-soft);
      }
      .viking-carousel-dot:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
    `,
  ],
})
export class VikingCarousel {
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  protected readonly slides = contentChildren(VikingCarouselSlide);
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
