import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * flux-footer — site-wide footer chrome. Project directory columns and bottom row via slots.
 * Static apps (marketing, backend) use the same class names from flux-material.css.
 */
@Component({
  selector: 'flux-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'flux-footer-host' },
  template: `
    <footer class="flux-footer mega-footer">
      <div class="flux-footer-content footer-content">
        <ng-content select="[fluxFooterDirectory]" />
        <section class="flux-footer-bottom footer-bottom">
          <ng-content select="[fluxFooterBottom]" />
        </section>
      </div>
    </footer>
  `,
  styleUrl: './footer.scss',
})
export class FluxFooter {}
