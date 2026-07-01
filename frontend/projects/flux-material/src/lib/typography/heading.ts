import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * flux-heading — consistent heading sizes (https://fluxui.dev/components/heading).
 */
@Component({
  selector: 'flux-heading',
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
        font-family: var(--flux-font-family);
        font-weight: 600;
        color: var(--flux-text);
        letter-spacing: var(--header-letter-spacing, -0.02em);
        font-size: var(--flux-font-size);
        line-height: 1.25;
      }
      :host(.flux-heading-lg) {
        font-size: var(--flux-font-size-lg);
      }
      :host(.flux-heading-xl) {
        font-size: var(--flux-font-size-xl);
        font-weight: 700;
      }
    `,
  ],
})
export class FluxHeading {
  readonly size = input<'base' | 'lg' | 'xl'>('base');
  readonly level = input<1 | 2 | 3 | 4>(3);

  protected readonly ariaLevel = computed(() => this.level());
  protected readonly hostClass = computed(() => `flux-heading-${this.size()}`);
}
