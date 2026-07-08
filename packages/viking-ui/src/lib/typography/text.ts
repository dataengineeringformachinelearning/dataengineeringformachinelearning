import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

/**
 * viking-text — body text with semantic variants.
 */
@Component({
  selector: "viking-text",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        line-height: var(--viking-line-height-relaxed);
        color: var(--viking-text);
        margin-bottom: var(
          --viking-space-half
        ); /* Improved paragraph spacing */
      }
      :host(.viking-text-inline) {
        display: inline;
      }
      :host(.viking-text-muted) {
        color: var(--viking-text-muted);
      }
      :host(.viking-text-strong) {
        font-weight: 600;
      }
      :host(.viking-text-accent) {
        color: var(--viking-accent);
        font-weight: 500;
      }
    `,
  ],
})
export class VikingText {
  readonly variant = input<"default" | "muted" | "strong" | "accent">(
    "default",
  );
  readonly inline = input<boolean>(false);

  protected readonly hostClass = computed(() => ({
    [`viking-text-${this.variant()}`]: this.variant() !== "default",
    "viking-text-inline": this.inline(),
  }));
}
