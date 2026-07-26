import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  output,
  viewChild,
} from "@angular/core";
import { captureReturnFocus, restoreFocus, trapTabKey } from "../../core/focus";
import { VikingIcon } from "../icon/icon";
import { VikingKbd } from "../kbd/kbd";

/**
 * viking-search-palette — command-palette style search overlay (Product Hunt / Algolia inspired).
 * Project custom result lists into the body slot; ⌘K / Ctrl+K wired by host app static widget.
 */
@Component({
  selector: "viking-search-palette",
  imports: [VikingIcon, VikingKbd],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(keydown.escape)": "close()" },
  template: `
    @if (open()) {
      <div
        class="viking-search-palette-backdrop"
        role="presentation"
        tabindex="-1"
        (click)="close()"
        (keydown.escape)="close()"
      >
        <div
          #dialogRoot
          class="viking-search-palette"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown)="onDialogKeydown($event)"
        >
          <div class="viking-search-palette-header">
            <viking-icon name="search" [size]="24" />
            <input
              #queryInput
              type="text"
              class="viking-search-palette-input"
              [placeholder]="placeholder()"
              [value]="query()"
              [attr.aria-label]="placeholder()"
              (input)="onQueryInput($event)"
            />
            <button
              type="button"
              class="viking-search-palette-close"
              aria-label="Close search"
              (click)="close()"
            >
              <viking-icon name="x" [size]="20" />
            </button>
          </div>
          <div
            class="viking-search-palette-body"
            tabindex="-1"
            (keydown)="paletteKeydown.emit($event)"
          >
            <ng-content />
          </div>
          <footer class="viking-search-palette-footer">
            <ng-content select="[vikingSearchPaletteFooter]" />
            <span class="viking-search-palette-shortcut">
              <viking-kbd>{{ modKey }}</viking-kbd
              ><viking-kbd>K</viking-kbd> / <viking-kbd>/</viking-kbd> open ·
              <viking-kbd>↑</viking-kbd><viking-kbd>↓</viking-kbd> navigate ·
              <viking-kbd>Enter</viking-kbd> open ·
              <viking-kbd>Esc</viking-kbd> close ·
              <viking-kbd>?</viking-kbd> all shortcuts
            </span>
          </footer>
        </div>
      </div>
    }
  `,
  styleUrl: "./search-palette.scss",
})
export class VikingSearchPalette {
  readonly open = model<boolean>(false);
  readonly query = model<string>("");
  readonly placeholder = input<string>("Search...");
  readonly paletteKeydown = output<KeyboardEvent>();

  private readonly queryInput =
    viewChild<ElementRef<HTMLInputElement>>("queryInput");
  private readonly dialogRoot =
    viewChild<ElementRef<HTMLElement>>("dialogRoot");
  private returnFocus: HTMLElement | null = null;

  constructor() {
    let wasOpen = false;
    effect(() => {
      const isOpen = this.open();
      if (isOpen && !wasOpen) {
        this.returnFocus = captureReturnFocus();
        queueMicrotask(() => this.queryInput()?.nativeElement.focus());
      } else if (!isOpen && wasOpen) {
        restoreFocus(this.returnFocus);
        this.returnFocus = null;
      }
      wasOpen = isOpen;
    });
  }

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onDialogKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    const root = this.dialogRoot()?.nativeElement;
    if (root) trapTabKey(event, root);
    this.paletteKeydown.emit(event);
  }

  protected close(): void {
    this.open.set(false);
  }

  /** Platform modifier label — stable for component lifetime. */
  protected readonly modKey =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/i.test(navigator.platform)
      ? "⌘"
      : "Ctrl";
}
