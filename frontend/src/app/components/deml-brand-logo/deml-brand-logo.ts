import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Official DEML brand mark — Material Icons `analytics` ligature (not flux SVG). */
@Component({
  selector: 'deml-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
  },
  template: `<span class="material-icons deml-brand-logo-glyph" [class]="hostClass()">analytics</span>`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        line-height: 1;
        vertical-align: middle;
      }
      .deml-brand-logo-glyph {
        font-family: 'Material Icons';
        font-weight: normal;
        font-style: normal;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        display: inline-block;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        -webkit-font-smoothing: antialiased;
      }
    `,
  ],
})
export class DemlBrandLogo {
  readonly hostClass = input<string>('brand-icon navbar-logo glowing-icon-sm');
}
