import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FluxIcon } from '../icon/icon';

/**
 * flux-composer — message composer with attachments and send action
 * (https://fluxui.dev/components/composer).
 */
@Component({
  selector: 'flux-composer',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flux-composer">
      <textarea
        rows="1"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="disabled()"
        [attr.aria-label]="placeholder() || 'Message'"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
      ></textarea>
      <div class="flux-composer-actions">
        <div class="flux-composer-tools">
          @if (allowAttachments()) {
            <button
              type="button"
              class="flux-composer-tool"
              aria-label="Attach file"
              (click)="attach.emit()"
            >
              <flux-icon name="paperclip" [size]="20" />
            </button>
          }
          <ng-content />
        </div>
        <button
          type="button"
          class="flux-composer-send"
          aria-label="Send message"
          [disabled]="disabled() || !value().trim()"
          (click)="send()"
        >
          <flux-icon name="send" [size]="18" />
          <span>Send</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .flux-composer {
        display: flex;
        flex-direction: column;
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-sm);
        transition: var(--flux-transition);
        font-family: var(--flux-font-family);
      }
      .flux-composer:focus-within {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      textarea {
        border: none;
        outline: none;
        resize: none;
        background: transparent;
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        line-height: 1.55;
        padding: var(--flux-space-2);
        min-height: var(--flux-space-5);
      }
      textarea::placeholder {
        color: var(--flux-text-muted);
      }
      .flux-composer-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--flux-space-1);
        padding: var(--flux-space-1) var(--flux-space-2) var(--flux-space-1) var(--flux-space-1);
        border-top: 1px solid var(--flux-border);
      }
      .flux-composer-tools {
        display: flex;
        align-items: center;
        gap: calc(var(--flux-space-1) / 2);
      }
      .flux-composer-tool {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--flux-text-muted);
        cursor: pointer;
        padding: var(--flux-space-1);
        border-radius: calc(var(--flux-radius) / 1.5);
        transition: var(--flux-transition);
      }
      .flux-composer-tool:hover {
        color: var(--flux-text);
        background: var(--flux-accent-soft);
      }
      .flux-composer-tool:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
      .flux-composer-send {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--flux-space-1) / 1.5);
        border: 1px solid var(--flux-accent);
        background: var(--flux-accent);
        color: var(--flux-accent-content);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        font-weight: 600;
        padding: calc(var(--flux-space-1) / 1.5) var(--flux-space-2);
        border-radius: var(--flux-radius);
        cursor: pointer;
        transition: var(--flux-transition);
      }
      .flux-composer-send:hover:not(:disabled) {
        background: var(--flux-accent-strong);
        border-color: var(--flux-accent-strong);
      }
      .flux-composer-send:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-composer-send:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    `,
  ],
})
export class FluxComposer {
  readonly value = model<string>('');
  readonly placeholder = input<string>('Write a message…');
  readonly disabled = input<boolean>(false);
  readonly allowAttachments = input<boolean>(true);

  readonly sent = output<string>();
  readonly attach = output<void>();

  protected onInput = (event: Event): void => {
    const el = event.target as HTMLTextAreaElement;
    this.value.set(el.value);
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  protected onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.send();
    }
  };

  protected send = (): void => {
    const message = this.value().trim();
    if (message) {
      this.sent.emit(message);
      this.value.set('');
    }
  };
}
