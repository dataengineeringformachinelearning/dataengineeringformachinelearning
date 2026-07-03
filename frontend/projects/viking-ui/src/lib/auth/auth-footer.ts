import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VikingSeparator } from '../separator/separator';

/**
 * viking-auth-footer — stacked primary/cancel actions for auth panels.
 */
@Component({
  selector: 'viking-auth-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VikingSeparator],
  template: `
    <footer class="viking-auth-footer">
      <viking-separator />
      <div class="viking-auth-footer-actions">
        <ng-content />
      </div>
    </footer>
  `,
  styles: [
    `
      .viking-auth-footer {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        width: 100%;
        padding-top: var(--viking-space-2);
      }
      .viking-auth-footer-actions {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        width: 100%;
      }
      .viking-auth-footer-actions ::ng-deep viking-button {
        display: flex;
        width: 100%;
      }
      .viking-auth-footer-actions ::ng-deep .viking-btn {
        width: 100%;
        justify-content: center;
      }
    `,
  ],
})
export class VikingAuthFooter {}
