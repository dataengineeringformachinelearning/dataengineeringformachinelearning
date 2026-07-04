import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  model,
  viewChild,
} from '@angular/core';
import { VikingControl, provideVikingCva } from '../core/cva';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';

interface EditorAction {
  icon: VikingIconName;
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
 * viking-editor — lightweight rich text editor.
 * Zero-dependency contenteditable with a formatting toolbar.
 * Value is HTML. ControlValueAccessor-compatible.
 */
@Component({
  selector: 'viking-editor',
  imports: [VikingIcon],
  providers: [provideVikingCva(VikingEditor)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-editor">
      <div class="viking-editor-toolbar" role="toolbar" aria-label="Text formatting">
        @for (action of actions; track action.command) {
          <button
            type="button"
            class="viking-editor-btn"
            [attr.aria-label]="action.label"
            (mousedown)="$event.preventDefault()"
            (click)="exec(action.command)"
          >
            <viking-icon [name]="action.icon" [size]="18" />
          </button>
        }
      </div>
      <div
        #surface
        class="viking-editor-surface"
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
      .viking-editor {
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        box-shadow: var(--viking-shadow-sm);
        font-family: var(--viking-font-family);
        transition: var(--viking-transition);
      }
      .viking-editor:focus-within {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-editor-toolbar {
        display: flex;
        gap: 2px;
        padding: var(--viking-space-1);
        border-bottom: 1px solid var(--viking-border);
      }
      .viking-editor-btn {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: calc(var(--viking-space-1) / 1.5);
        border-radius: calc(var(--viking-radius) / 1.5);
        transition: var(--viking-transition);
      }
      .viking-editor-btn:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-editor-btn:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
      .viking-editor-surface {
        min-height: 126px;
        padding: var(--viking-space-2);
        color: var(--viking-text);
        font-size: var(--viking-font-size);
        line-height: 1.6;
        outline: none;
      }
      .viking-editor-surface:empty::before {
        content: attr(data-placeholder);
        color: var(--viking-text-muted);
        pointer-events: none;
      }
    `,
  ],
})
export class VikingEditor extends VikingControl<string> {
  private readonly surface = viewChild.required<ElementRef<HTMLElement>>('surface');
  private readonly document: Document;

  readonly value = model<string>('');
  readonly placeholder = input<string>('Start writing…');
  readonly label = input<string>('');

  protected readonly actions = ACTIONS;

  constructor(elementRef: ElementRef<HTMLElement>) {
    super();
    this.document = elementRef.nativeElement.ownerDocument;
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
