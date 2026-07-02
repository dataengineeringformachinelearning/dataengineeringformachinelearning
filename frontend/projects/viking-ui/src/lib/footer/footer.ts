import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * viking-footer — site-wide footer chrome. Project directory columns and bottom row via slots.
 * Static apps (marketing, backend) use the same class names from viking-ui.css.
 */
@Component({
  selector: 'viking-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'viking-footer-host' },
  template: `
    <footer class="viking-footer mega-footer">
      <div class="viking-footer-content footer-content">
        <ng-content select="[fluxFooterDirectory]" />
        <section class="viking-footer-bottom footer-bottom">
          <ng-content select="[fluxFooterBottom]" />
        </section>
      </div>
    </footer>
  `,
  styleUrl: './footer.scss',
})
export class VikingFooter {}
