import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { VikingButton } from '../button/button';
import { VikingSeparator } from '../separator/separator';

/**
 * viking-auth-panel — social sign-in row with fixed-aspect brand icons.
 */
@Component({
  selector: 'viking-auth-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VikingButton, VikingSeparator],
  template: `
    <div class="viking-auth-panel">
      <ng-content />
      @if (showSocial()) {
        <viking-separator text="or" />
        <div class="viking-auth-social">
          <viking-button
            variant="outline"
            type="button"
            class="viking-auth-social-btn"
            [loading]="loading()"
            [disabled]="loading()"
            (pressed)="googleSignIn.emit()"
          >
            <svg
              class="viking-auth-brand-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M12 11h9.5A9 9 0 1 0 12 21v-4"
              />
            </svg>
            Sign In with Google
          </viking-button>
          <viking-button
            variant="outline"
            type="button"
            class="viking-auth-social-btn"
            [loading]="loading()"
            [disabled]="loading()"
            (pressed)="appleSignIn.emit()"
          >
            <svg
              class="viking-auth-brand-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M16.5 10.5c-.1-2.2 1.7-3.3 1.8-3.4-1-.7-2.5-1.2-4-1.1-1.7.1-3.2 1-4.1 1-1 0-2.5-.9-4.1-1-2-.1-3.8 1.2-4.8 3-2.1 3.6-.5 8.9 1.5 11.8 1 1.5 2.2 3.1 3.8 3 1.5-.1 2.1-1 3.9-1s2.4 1 3.9 1c1.6.1 2.7-1.6 3.7-3.1 1.2-1.7 1.7-3.4 1.7-3.5-.1 0-3.4-1.3-3.4-5.2zM14.5 4.5c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.6.8-3.4 1.8-.8.9-1.4 2.2-1.2 3.6 1.3.1 2.6-.7 3.4-1.6z"
              />
            </svg>
            Sign In with Apple
          </viking-button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .viking-auth-panel {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        width: 100%;
      }
      .viking-auth-social {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        width: 100%;
      }
      .viking-auth-social-btn {
        display: flex;
        width: 100%;
      }
      .viking-auth-social-btn ::ng-deep .viking-btn {
        width: 100%;
        justify-content: center;
      }
      .viking-auth-brand-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        display: block;
      }
    `,
  ],
})
export class VikingAuthPanel {
  readonly showSocial = input<boolean>(true);
  readonly loading = input<boolean>(false);

  readonly googleSignIn = output<void>();
  readonly appleSignIn = output<void>();
}
