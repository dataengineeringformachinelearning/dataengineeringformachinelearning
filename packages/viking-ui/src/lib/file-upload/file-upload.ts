import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";

/**
 * viking-file-upload — drag & drop file zone.
 */
@Component({
  selector: "viking-file-upload",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      class="viking-upload-zone"
      [class.viking-dragover]="dragOver()"
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
      <viking-icon name="upload" [size]="27" />
      <span class="viking-upload-heading">{{ heading() }}</span>
      <span class="viking-upload-hint">{{ hint() }}</span>
    </label>
    @if (fileList().length > 0) {
      <ul class="viking-upload-list">
        @for (file of fileList(); track file.name) {
          <li class="viking-upload-file">
            <viking-icon name="file" [size]="18" />
            <span class="viking-upload-name">{{ file.name }}</span>
            <span class="viking-upload-size">{{ formatSize(file.size) }}</span>
            <button
              type="button"
              class="viking-upload-remove"
              [attr.aria-label]="'Remove ' + file.name"
              (click)="removeFile(file)"
            >
              <viking-icon name="x" [size]="16" />
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
        font-family: var(--viking-font-family);
      }
      .viking-upload-zone {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--viking-space-1);
        padding: var(--viking-space-4) var(--viking-space-2);
        border: 2px dashed var(--viking-border-strong);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        color: var(--viking-text-muted);
        cursor: pointer;
        transition: var(--viking-transition);
        text-align: center;
      }
      .viking-upload-zone:hover,
      .viking-dragover {
        border-color: var(--viking-accent);
        background: var(--viking-accent-soft);
        color: var(--viking-accent);
      }
      .viking-upload-zone:focus-within {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      /* The native input fills the drop zone so clicks and focus land on it. */
      input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .viking-upload-heading {
        font-size: var(--viking-font-size);
        font-weight: 600;
        color: var(--viking-text);
      }
      .viking-upload-hint {
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
      }
      .viking-upload-list {
        list-style: none;
        margin: var(--viking-space-1) 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--viking-space-1) / 2);
      }
      .viking-upload-file {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        padding: var(--viking-space-1);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        font-size: var(--viking-font-size);
        color: var(--viking-text);
      }
      .viking-upload-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .viking-upload-size {
        color: var(--viking-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .viking-upload-remove {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: var(--viking-space-0-5);
        border-radius: var(--viking-radius-pill);
      }
      .viking-upload-remove:hover {
        color: var(--viking-danger);
      }
      .viking-upload-remove:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class VikingFileUpload {
  readonly heading = input<string>("Drop files here or click to browse");
  readonly hint = input<string>("");
  readonly accept = input<string>("");
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
    this.fileList.update((list) => list.filter((item) => item !== file));
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
    this.fileList.update((list) =>
      this.multiple() ? [...list, ...files] : files.slice(0, 1),
    );
    this.filesChanged.emit(this.fileList());
  }
}
