import { NgTemplateOutlet } from "@angular/common";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  computed,
  contentChild,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { computeVirtualWindow, indicesForWindow } from "./virtual-window";

export type VikingVirtualListItemContext<T> = {
  $implicit: T;
  index: number;
};

/** Default item shape when callers do not specialize T. */
export type VikingVirtualListItem = {
  readonly id?: string | number;
};

/**
 * viking-virtual-list — fixed-height windowed list (zero CDK).
 * Use for unbounded queues/feeds; prefer content-visibility for masonry grids.
 *
 * ```html
 * <viking-virtual-list [items]="rows()" [itemHeight]="96" height="24rem">
 *   <ng-template let-row let-i="index">...</ng-template>
 * </viking-virtual-list>
 * ```
 */
@Component({
  selector: "viking-virtual-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: {
    class: "suite-virtual-list viking-virtual-list",
    "[attr.data-empty]": "items().length === 0 ? '' : null",
  },
  template: `
    <div
      #viewport
      class="suite-virtual-list__viewport viking-virtual-list__viewport"
      [style.height]="height()"
      [attr.aria-label]="label()"
      role="list"
      tabindex="0"
      (scroll)="onScroll()"
    >
      <div
        class="suite-virtual-list__spacer viking-virtual-list__spacer"
        [style.height.px]="totalHeight()"
      >
        <div
          class="suite-virtual-list__window viking-virtual-list__window"
          [style.transform]="'translate3d(0, ' + offsetY() + 'px, 0)'"
        >
          @for (index of visibleIndices(); track trackIndex(index)) {
            <div
              class="suite-virtual-list__item viking-virtual-list__item"
              [style.height.px]="itemHeight()"
              role="listitem"
              [attr.aria-setsize]="items().length"
              [attr.aria-posinset]="index + 1"
            >
              @if (itemTemplate(); as tpl) {
                <ng-container
                  [ngTemplateOutlet]="tpl"
                  [ngTemplateOutletContext]="{
                    $implicit: items()[index],
                    index,
                  }"
                />
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        width: 100%;
      }
      .viking-virtual-list__viewport {
        overflow: auto;
        overscroll-behavior: contain;
        contain: strict;
        width: 100%;
        min-height: 0;
        scrollbar-width: thin;
        scrollbar-color: var(--viking-accent-strong) var(--viking-surface-alt);
        outline: none;
      }
      .viking-virtual-list__viewport:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-virtual-list__spacer {
        position: relative;
        width: 100%;
      }
      .viking-virtual-list__window {
        will-change: transform;
        width: 100%;
      }
      .viking-virtual-list__item {
        box-sizing: border-box;
        width: 100%;
        overflow: hidden;
      }
    `,
  ],
})
export class VikingVirtualList<T = VikingVirtualListItem>
  implements AfterViewInit, OnDestroy
{
  readonly items = input<readonly T[]>([]);
  /** Fixed row height in CSS pixels — must match rendered item chrome. */
  readonly itemHeight = input(96);
  readonly height = input("24rem");
  readonly overscan = input(4);
  readonly label = input("Scrollable list");
  /** Optional stable id key on each item (falls back to index). */
  readonly trackBy = input<
    ((item: T, index: number) => string | number) | null
  >(null);

  protected readonly itemTemplate =
    contentChild<TemplateRef<VikingVirtualListItemContext<T>>>(TemplateRef);

  private readonly viewport =
    viewChild.required<ElementRef<HTMLElement>>("viewport");

  private readonly scrollTop = signal(0);
  private readonly viewportHeightPx = signal(0);
  private resizeObserver: ResizeObserver | null = null;
  private scrollRaf = 0;
  private measureRaf = 0;

  /** Private math snapshot — peel into flat computeds for the template. */
  private readonly windowMetrics = computed(() =>
    computeVirtualWindow({
      scrollTop: this.scrollTop(),
      viewportHeight: this.viewportHeightPx(),
      itemCount: this.items().length,
      itemHeight: this.itemHeight(),
      overscan: this.overscan(),
    }),
  );

  protected readonly totalHeight = computed(
    () => this.windowMetrics().totalHeight,
  );
  protected readonly offsetY = computed(() => this.windowMetrics().offsetY);
  protected readonly visibleIndices = computed(() => {
    const { start, end } = this.windowMetrics();
    return indicesForWindow(start, end);
  });

  ngAfterViewInit(): void {
    const el = this.viewport().nativeElement;
    this.scheduleMeasure(el);
    if (typeof ResizeObserver !== "undefined") {
      // contentRect avoids a forced clientHeight read inside the observer.
      this.resizeObserver = new ResizeObserver((entries) => {
        const height = entries[0]?.contentRect.height;
        if (height != null && height !== this.viewportHeightPx()) {
          this.viewportHeightPx.set(Math.round(height));
        }
      });
      this.resizeObserver.observe(el);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.scrollRaf) {
      cancelAnimationFrame(this.scrollRaf);
      this.scrollRaf = 0;
    }
    if (this.measureRaf) {
      cancelAnimationFrame(this.measureRaf);
      this.measureRaf = 0;
    }
  }

  protected onScroll(): void {
    if (this.scrollRaf) {
      return;
    }
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0;
      const next = this.viewport().nativeElement.scrollTop;
      if (next !== this.scrollTop()) {
        this.scrollTop.set(next);
      }
    });
  }

  protected trackIndex(index: number): string | number {
    const track = this.trackBy();
    const item = this.items()[index];
    return track && item !== undefined ? track(item, index) : index;
  }

  private scheduleMeasure(el: HTMLElement): void {
    if (this.measureRaf) {
      return;
    }
    this.measureRaf = requestAnimationFrame(() => {
      this.measureRaf = 0;
      // Batch layout reads in one frame, then write signals.
      const height = el.clientHeight;
      const top = el.scrollTop;
      if (height !== this.viewportHeightPx()) {
        this.viewportHeightPx.set(height);
      }
      if (top !== this.scrollTop()) {
        this.scrollTop.set(top);
      }
    });
  }
}
