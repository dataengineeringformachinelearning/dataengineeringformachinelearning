import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";

/**
 * viking-composer — message composer with attachments and send action
 *.
 */
@Component({
  selector: "viking-composer",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-composer">
      <textarea
        rows="1"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="disabled()"
        [attr.aria-label]="placeholder() || 'Message'"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
      ></textarea>
      <div class="viking-composer-actions">
        <div class="viking-composer-tools">
          @if (allowAttachments()) {
            <button
              type="button"
              class="viking-composer-tool"
              aria-label="Attach file"
              (click)="attach.emit()"
            >
              <viking-icon name="paperclip" [size]="20" />
            </button>
          }
          <ng-content />
        </div>
        <button
          type="button"
          class="viking-composer-send"
          aria-label="Send message"
          [disabled]="disabled() || !value().trim()"
          (click)="send()"
        >
          <viking-icon name="send" [size]="18" />
          <span>Send</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .viking-composer {
        display: flex;
        flex-direction: column;
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        transition: var(--viking-transition);
        font-family: var(--viking-font-family);
      }
      .viking-composer:focus-within {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      textarea {
        border: none;
        outline: none;
        resize: none;
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        line-height: 1.55;
        padding: var(--viking-space-2);
        min-height: var(--viking-space-5);
      }
      textarea::placeholder {
        color: var(--viking-text-muted);
      }
      .viking-composer-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-1);
        padding: var(--viking-space-1) var(--viking-space-2)
          var(--viking-space-1) var(--viking-space-1);
        border-top: 1px solid var(--viking-border);
      }
      .viking-composer-tools {
        display: flex;
        align-items: center;
        gap: calc(var(--viking-space-1) / 2);
      }
      .viking-composer-tool {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: var(--viking-space-1);
        border-radius: calc(var(--viking-radius) / 1.5);
        transition: var(--viking-transition);
      }
      .viking-composer-tool:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-composer-tool:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
      .viking-composer-send {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--viking-space-1) / 1.5);
        border: 1px solid var(--viking-accent);
        background: var(--viking-accent);
        color: var(--viking-accent-content);
        font-family: var(--viking-font-family);
        /* >= 18.67px bold qualifies as WCAG large text (3:1 on accent fill). */
        font-size: calc(var(--viking-font-size) * 1.05);
        font-weight: 700;
        padding: calc(var(--viking-space-1) / 1.5) var(--viking-space-2);
        border-radius: var(--viking-radius);
        cursor: pointer;
        transition: var(--viking-transition);
      }
      .viking-composer-send:hover:not(:disabled) {
        background: var(--viking-accent-strong);
        border-color: var(--viking-accent-strong);
      }
      .viking-composer-send:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-composer-send:disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
    `,
  ],
})
export class VikingComposer {
  readonly value = model<string>("");
  readonly placeholder = input<string>("Write a message…");
  readonly disabled = input<boolean>(false);
  readonly allowAttachments = input<boolean>(true);

  readonly sent = output<string>();
  readonly attach = output<void>();

  protected onInput = (event: Event): void => {
    const el = event.target as HTMLTextAreaElement;
    this.value.set(el.value);
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  protected onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.send();
    }
  };

  protected send = (): void => {
    const message = this.value().trim();
    if (message) {
      this.sent.emit(message);
      this.value.set("");
    }
  };
}
