import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * viking-heading — consistent heading sizes.
 */
@Component({
  selector: 'viking-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'heading',
    '[attr.aria-level]': 'ariaLevel()',
    '[class]': 'hostClass()',
  },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--viking-font-family);
        font-weight: 600;
        color: var(--viking-text);
        letter-spacing: var(--header-letter-spacing, -0.02em);
        font-size: var(--viking-font-size-ui);
        line-height: 1.25;
      }
      :host(.viking-heading-sm) {
        font-size: var(--viking-font-size-sm);
      }
      :host(.viking-heading-lg) {
        font-size: var(--viking-font-size);
      }
      :host(.viking-heading-xl) {
        font-size: var(--viking-font-size-lg);
        font-weight: 700;
      }
    `,
  ],
})
export class VikingHeading {
  readonly size = input<'sm' | 'base' | 'lg' | 'xl'>('base');
  readonly level = input<1 | 2 | 3 | 4>(3);

  protected readonly ariaLevel = computed(() => this.level());
  protected readonly hostClass = computed(() => `viking-heading-${this.size()}`);
}
