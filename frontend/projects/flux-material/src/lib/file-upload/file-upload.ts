import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FluxIcon } from '../icon/icon';

/**
 * flux-file-upload — drag & drop file zone (https://fluxui.dev/components/file-upload).
 */
@Component({
  selector: 'flux-file-upload',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      class="flux-upload-zone"
      [class.flux-dragover]="dragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="dragOver.set(false)"
      (drop)="onDrop($event)"
    >
      <input
        type="file"
        [accept]="accept()"
        [multiple]="multiple()"
        [disabled]="disabled()"
        [attr.aria-label]="heading()"
        (change)="onSelect($event)"
      />
      <flux-icon name="upload" [size]="27" />
      <span class="flux-upload-heading">{{ heading() }}</span>
      <span class="flux-upload-hint">{{ hint() }}</span>
    </label>
    @if (fileList().length > 0) {
      <ul class="flux-upload-list">
        @for (file of fileList(); track file.name) {
          <li class="flux-upload-file">
            <flux-icon name="file" [size]="18" />
            <span class="flux-upload-name">{{ file.name }}</span>
            <span class="flux-upload-size">{{ formatSize(file.size) }}</span>
            <button
              type="button"
              class="flux-upload-remove"
              [attr.aria-label]="'Remove ' + file.name"
              (click)="removeFile(file)"
            >
              <flux-icon name="x" [size]="16" />
            </button>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--flux-font-family);
      }
      .flux-upload-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--flux-space-1);
        padding: var(--flux-space-4) var(--flux-space-2);
        border: 2px dashed var(--flux-border-strong);
        border-radius: var(--flux-radius);
        background: var(--flux-surface);
        color: var(--flux-text-muted);
        cursor: pointer;
        transition: var(--flux-transition);
        text-align: center;
      }
      .flux-upload-zone:hover,
      .flux-dragover {
        border-color: var(--flux-accent);
        background: var(--flux-accent-soft);
        color: var(--flux-accent);
      }
      .flux-upload-zone:focus-within {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      input {
        position: absolute;
        opacity: 0;
        width: 1px;
        height: 1px;
      }
      .flux-upload-heading {
        font-size: var(--flux-font-size);
        font-weight: 600;
        color: var(--flux-text);
      }
      .flux-upload-hint {
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
      }
      .flux-upload-list {
        list-style: none;
        margin: var(--flux-space-1) 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--flux-space-1) / 2);
      }
      .flux-upload-file {
        display: flex;
        align-items: center;
        gap: var(--flux-space-1);
        padding: var(--flux-space-1);
        border: 1px solid var(--flux-border);
        border-radius: var(--flux-radius);
        background: var(--flux-surface);
        font-size: var(--flux-font-size);
        color: var(--flux-text);
      }
      .flux-upload-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .flux-upload-size {
        color: var(--flux-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .flux-upload-remove {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--flux-text-muted);
        cursor: pointer;
        padding: 3px;
        border-radius: var(--flux-radius-pill);
      }
      .flux-upload-remove:hover {
        color: var(--flux-danger);
      }
      .flux-upload-remove:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class FluxFileUpload {
  readonly heading = input<string>('Drop files here or click to browse');
  readonly hint = input<string>('');
  readonly accept = input<string>('');
  readonly multiple = input<boolean>(true);
  readonly disabled = input<boolean>(false);

  readonly filesChanged = output<File[]>();

  protected readonly dragOver = signal(false);
  protected readonly fileList = signal<File[]>([]);

  protected onDragOver = (event: DragEvent): void => {
    event.preventDefault();
    this.dragOver.set(true);
  };

  protected onDrop = (event: DragEvent): void => {
    event.preventDefault();
    this.dragOver.set(false);
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  };

  protected onSelect = (event: Event): void => {
    this.addFiles(Array.from((event.target as HTMLInputElement).files ?? []));
  };

  protected removeFile = (file: File): void => {
    this.fileList.update(list => list.filter(item => item !== file));
    this.filesChanged.emit(this.fileList());
  };

  protected formatSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  private addFiles(files: File[]): void {
    if (files.length === 0) {
      return;
    }
    this.fileList.update(list => (this.multiple() ? [...list, ...files] : files.slice(0, 1)));
    this.filesChanged.emit(this.fileList());
  }
}
