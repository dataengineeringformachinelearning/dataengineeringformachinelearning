import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

/**
 * viking-heading — consistent heading sizes.
 */
@Component({
  selector: "viking-heading",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "heading",
    "[attr.aria-level]": "ariaLevel()",
    "[class]": "hostClass()",
  },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--viking-font-family);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-text);
        letter-spacing: var(--viking-letter-spacing-tight);
        font-size: var(--viking-font-size);
        line-height: var(--viking-line-height-tight);
        margin: 0 0 var(--viking-space-3) 0;
      }
      :host(.viking-heading-sm) {
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-medium);
        margin-bottom: var(--viking-space-2);
      }
      :host(.viking-heading-lg) {
        font-size: var(--viking-font-size-lg);
        font-weight: var(--viking-font-weight-semibold);
        margin-bottom: var(--viking-space-4);
      }
      :host(.viking-heading-xl) {
        font-size: var(--viking-font-size-xl);
        font-weight: var(--viking-font-weight-bold);
        letter-spacing: var(--viking-letter-spacing-tight);
        margin-bottom: var(--viking-space-4);
      }
    `,
  ],
})
export class VikingHeading {
  readonly size = input<"sm" | "base" | "lg" | "xl">("base");
  readonly level = input<1 | 2 | 3 | 4>(3);

  protected readonly ariaLevel = computed(() => this.level());
  protected readonly hostClass = computed(
    () => `viking-heading-${this.size()}`,
  );
}
