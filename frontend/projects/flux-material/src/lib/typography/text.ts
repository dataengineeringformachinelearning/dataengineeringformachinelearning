import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * flux-text — body text with semantic variants (https://fluxui.dev/components/text).
 */
@Component({
  selector: 'flux-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        line-height: 1.65;
        color: var(--flux-text);
      }
      :host(.flux-text-inline) {
        display: inline;
      }
      :host(.flux-text-muted) {
        color: var(--flux-text-muted);
      }
      :host(.flux-text-strong) {
        font-weight: 600;
      }
      :host(.flux-text-accent) {
        color: var(--flux-accent);
        font-weight: 500;
      }
    `,
  ],
})
export class FluxText {
  readonly variant = input<'default' | 'muted' | 'strong' | 'accent'>('default');
  readonly inline = input<boolean>(false);

  protected readonly hostClass = computed(() => ({
    [`flux-text-${this.variant()}`]: this.variant() !== 'default',
    'flux-text-inline': this.inline(),
  }));
}
