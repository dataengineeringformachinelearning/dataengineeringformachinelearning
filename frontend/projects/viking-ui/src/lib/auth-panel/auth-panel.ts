import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { VikingButton } from '../button/button';
import { VikingSeparator } from '../separator/separator';

/**
 * viking-auth-panel — access portal / sign-in layout template.
 * Full-width stacked actions, Google + Apple OAuth row, WCAG-friendly structure.
 */
@Component({
  selector: 'viking-auth-panel',
  imports: [VikingButton, VikingSeparator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'viking-auth-panel-host' },
  template: `
    <section class="viking-auth-panel" aria-labelledby="viking-auth-title">
      <header class="viking-auth-header">
        @if (tag()) {
          <div class="viking-auth-tag-row">
            <span class="viking-auth-tag">{{ tag() }}</span>
          </div>
        }
        <h1 id="viking-auth-title" class="viking-auth-title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="viking-auth-subtitle">{{ subtitle() }}</p>
        }
      </header>

      <div class="viking-auth-body">
        <ng-content />
      </div>

      <ng-content select="[vikingAuthLinks]" />

      @if (showSocial()) {
        <viking-separator text="or" />
        <div class="viking-auth-social" role="group" aria-label="Social sign-in">
          <viking-button
            variant="outline"
            type="button"
            icon="google"
            [fullWidth]="true"
            [loading]="socialLoading()"
            [disabled]="socialLoading()"
            (pressed)="googleSignIn.emit()"
          >
            Sign In with Google
          </viking-button>
          <viking-button
            variant="outline"
            type="button"
            icon="apple"
            [fullWidth]="true"
            [loading]="socialLoading()"
            [disabled]="socialLoading()"
            (pressed)="appleSignIn.emit()"
          >
            Sign In with Apple
          </viking-button>
        </div>
      }

      <footer class="viking-auth-footer">
        <ng-content select="[vikingAuthFooter]" />
      </footer>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: 480px;
        margin-inline: auto;
        font-family: var(--viking-font-family);
      }
      .viking-auth-panel {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-3);
        width: 100%;
        padding: var(--viking-space-3);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-lg);
        box-shadow: var(--viking-shadow-md);
        position: relative;
        overflow: hidden;
      }
      .viking-auth-panel::before {
        content: '';
        position: absolute;
        inset: 0 0 auto;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          color-mix(in srgb, var(--viking-metallic-200) 22%, transparent),
          transparent
        );
        pointer-events: none;
      }
      .viking-auth-header {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
        margin-bottom: var(--viking-space-1);
      }
      .viking-auth-tag-row {
        display: flex;
        align-items: center;
      }
      .viking-auth-tag {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--viking-text-muted);
        padding: var(--viking-space-1) var(--viking-space-2);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-pill);
        background: var(--viking-surface);
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-auth-tag::before {
        content: '';
        width: var(--viking-space-1);
        height: var(--viking-space-1);
        border-radius: 50%;
        background: var(--viking-accent);
        flex-shrink: 0;
      }
      .viking-auth-title {
        margin: 0;
        font-size: var(--viking-font-size-xl);
        font-weight: 700;
        letter-spacing: var(--header-letter-spacing, -0.02em);
        color: var(--viking-text);
        line-height: var(--viking-line-height-tight);
      }
      .viking-auth-subtitle {
        margin: 0;
        font-size: var(--viking-font-size);
        line-height: 1.6;
        color: var(--viking-text-muted);
      }
      .viking-auth-body {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        width: 100%;
      }
      :host ::ng-deep .viking-auth-stack {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        width: 100%;
      }
      :host ::ng-deep .viking-auth-stack viking-callout {
        width: 100%;
      }
      :host ::ng-deep .viking-auth-stack .login-form,
      :host ::ng-deep .login-form {
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
      .viking-auth-footer {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-3);
        width: 100%;
        margin-top: var(--viking-space-4);
        padding-top: var(--viking-space-4);
        border-top: 1px solid var(--viking-border);
      }
      :host ::ng-deep [vikingAuthFooter] {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-3);
        width: 100%;
      }
      :host ::ng-deep [vikingAuthFooter] viking-button .viking-btn {
        min-width: 0;
      }
      :host ::ng-deep [vikingAuthLinks].viking-auth-links,
      :host ::ng-deep .viking-auth-links {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        width: 100%;
      }
      :host ::ng-deep viking-field {
        width: 100%;
      }
    `,
  ],
})
export class VikingAuthPanel {
  readonly tag = input('Access Portal');
  readonly title = input.required<string>();
  readonly subtitle = input('Secure entry to the DEML (DATA ENGINEERING FOR MACHINE LEARNING).');
  readonly showSocial = input(true);
  readonly socialLoading = input(false);

  readonly googleSignIn = output<void>();
  readonly appleSignIn = output<void>();
}
