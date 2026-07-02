import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';

interface EditorAction {
  icon: FluxIconName;
  command: string;
  label: string;
}

const ACTIONS: EditorAction[] = [
  { icon: 'bold', command: 'bold', label: 'Bold' },
  { icon: 'italic', command: 'italic', label: 'Italic' },
  { icon: 'underline', command: 'underline', label: 'Underline' },
  { icon: 'list', command: 'insertUnorderedList', label: 'Bulleted list' },
  { icon: 'list-ordered', command: 'insertOrderedList', label: 'Numbered list' },
];

/**
 * flux-editor — lightweight rich text editor (https://fluxui.dev/components/editor).
 * Zero-dependency contenteditable with a formatting toolbar.
 * Value is HTML. ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-editor',
  imports: [FluxIcon],
  providers: [provideFluxCva(FluxEditor)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flux-editor">
      <div class="flux-editor-toolbar" role="toolbar" aria-label="Text formatting">
        @for (action of actions; track action.command) {
          <button
            type="button"
            class="flux-editor-btn"
            [attr.aria-label]="action.label"
            (mousedown)="$event.preventDefault()"
            (click)="exec(action.command)"
          >
            <flux-icon [name]="action.icon" [size]="18" />
          </button>
        }
      </div>
      <div
        #surface
        class="flux-editor-surface"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        [attr.aria-label]="label() || 'Rich text editor'"
        [attr.data-placeholder]="placeholder()"
        (input)="onInput()"
        (blur)="onTouched()"
      ></div>
    </div>
  `,
  styles: [
    `
      .flux-editor {
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        background: var(--flux-surface);
        box-shadow: var(--flux-shadow-sm);
        font-family: var(--flux-font-family);
        transition: var(--flux-transition);
      }
      .flux-editor:focus-within {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-editor-toolbar {
        display: flex;
        gap: 2px;
        padding: var(--flux-space-1);
        border-bottom: 1px solid var(--flux-border);
      }
      .flux-editor-btn {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--flux-text-muted);
        cursor: pointer;
        padding: calc(var(--flux-space-1) / 1.5);
        border-radius: calc(var(--flux-radius) / 1.5);
        transition: var(--flux-transition);
      }
      .flux-editor-btn:hover {
        color: var(--flux-text);
        background: var(--flux-accent-soft);
      }
      .flux-editor-btn:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
      .flux-editor-surface {
        min-height: 126px;
        padding: var(--flux-space-2);
        color: var(--flux-text);
        font-size: var(--flux-font-size);
        line-height: 1.6;
        outline: none;
      }
      .flux-editor-surface:empty::before {
        content: attr(data-placeholder);
        color: var(--flux-text-muted);
        pointer-events: none;
      }
    `,
  ],
})
export class FluxEditor extends FluxControl<string> {
  private readonly surface = viewChild.required<ElementRef<HTMLElement>>('surface');
  private readonly document =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.ownerDocument;

  readonly value = model<string>('');
  readonly placeholder = input<string>('Start writing…');
  readonly label = input<string>('');

  protected readonly actions = ACTIONS;

  constructor() {
    super();
    afterNextRender(() => {
      if (this.value()) {
        this.surface().nativeElement.innerHTML = this.value();
      }
    });
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
    const surface = this.surface?.();
    if (surface) {
      surface.nativeElement.innerHTML = value ?? '';
    }
  }

  protected exec = (command: string): void => {
    this.surface().nativeElement.focus();
    // execCommand is deprecated but remains the only zero-dependency way to
    // apply inline formatting to a contenteditable selection.
    this.document.execCommand(command, false);
    this.onInput();
  };

  protected onInput = (): void => {
    const html = this.surface().nativeElement.innerHTML;
    this.value.set(html);
    this.onChange(html);
  };
}
