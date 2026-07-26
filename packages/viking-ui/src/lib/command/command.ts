import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { captureReturnFocus, restoreFocus, trapTabKey } from "../../core/focus";
import { VikingIcon } from "../icon/icon";
import { VikingCommandItem } from "../../core/types";
import { vikingUid } from "../../core/uid";

/**
 * viking-command — command palette.
 * Toggle with the `open` model; emits `executed` when an item is chosen.
 */
@Component({
  selector: "viking-command",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(keydown.escape)": "dismiss()" },
  template: `
    @if (open()) {
      <button
        type="button"
        class="viking-command-backdrop"
        tabindex="-1"
        aria-label="Close command palette"
        (click)="dismiss()"
      ></button>
      <div
        #dialogRoot
        class="viking-command"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabindex="-1"
        (keydown)="onDialogKeydown($event)"
      >
        <div class="viking-command-search">
          <viking-icon name="search" [size]="20" aria-hidden="true" />
          <input
            #queryInput
            type="text"
            role="combobox"
            [placeholder]="placeholder()"
            [value]="query()"
            aria-label="Search commands"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            [attr.aria-expanded]="true"
            [attr.aria-controls]="listboxId"
            [attr.aria-activedescendant]="
              activeId() ? optionId(activeId()!) : null
            "
            (input)="onQuery($event)"
            (keydown)="onKeydown($event)"
          />
          <button
            type="button"
            class="viking-command-close"
            aria-label="Close command palette"
            (click)="dismiss()"
          >
            <viking-icon name="x" [size]="18" aria-hidden="true" />
          </button>
        </div>
        <div
          class="viking-command-list"
          role="listbox"
          [id]="listboxId"
          aria-label="Commands"
        >
          @for (group of groups(); track group.name) {
            <p class="viking-command-group" role="presentation">
              {{ group.name }}
            </p>
            @for (item of group.items; track item.id) {
              <button
                type="button"
                role="option"
                class="viking-command-item"
                [id]="optionId(item.id)"
                [class.viking-active]="item.id === activeId()"
                [attr.aria-selected]="item.id === activeId()"
                (click)="run(item)"
                (mouseenter)="activeId.set(item.id)"
              >
                @if (item.icon) {
                  <viking-icon [name]="item.icon" [size]="18" />
                }
                <span class="viking-command-label">{{ item.label }}</span>
                @if (item.kbd) {
                  <kbd>{{ item.kbd }}</kbd>
                }
              </button>
            }
          }
          @if (filtered().length === 0) {
            <p class="viking-command-empty">No results for “{{ query() }}”</p>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .viking-command-backdrop {
        position: fixed;
        inset: 0;
        border: none;
        background: var(--viking-overlay-backdrop, rgba(49, 57, 60, 0.55));
        backdrop-filter: blur(4px);
        z-index: var(--viking-z-overlay);
        cursor: default;
      }
      .viking-command {
        position: fixed;
        top: 12vh;
        left: 50%;
        transform: translateX(-50%);
        width: min(576px, calc(100vw - var(--viking-space-4)));
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-md);
        z-index: calc(var(--viking-z-overlay) + 1);
        font-family: var(--viking-font-family);
        overflow: hidden;
      }
      .viking-command-search {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        padding: var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border);
        color: var(--viking-text-muted);
        transition: var(--viking-transition-colors);
      }
      .viking-command-search:focus-within {
        border-bottom-color: var(--viking-accent);
        box-shadow: inset 0 -2px 0 var(--viking-accent-soft);
      }
      .viking-command-search input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
      }
      .viking-command-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        min-width: var(--viking-touch-target-min, 44px);
        min-height: var(--viking-touch-target-min, 44px);
        border: 1px solid transparent;
        border-radius: var(--viking-radius);
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: 0;
        transition: var(--viking-transition-interactive);
      }
      .viking-command-close:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
        border-color: var(--viking-border-subtle);
      }
      .viking-command-close:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      kbd {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border);
        border-radius: calc(var(--viking-radius) / 2);
        padding: 0 var(--viking-space-1);
        line-height: 1.4;
      }
      .viking-command-list {
        max-height: 342px;
        overflow: auto;
        padding: var(--viking-space-1);
      }
      .viking-command-group {
        margin: var(--viking-space-1) var(--viking-space-1)
          var(--viking-space-0-5);
        font-size: var(--viking-font-size);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--viking-text-muted);
      }
      .viking-command-item {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        width: 100%;
        min-height: var(--viking-control-height-sm);
        border: none;
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        padding: var(--viking-space-1) var(--viking-space-2);
        border-radius: var(--viking-radius-sm);
        cursor: pointer;
        text-align: left;
        transition: var(--viking-transition-interactive);
      }
      .viking-command-item:hover:not(.viking-active),
      .viking-command-item.viking-active {
        background: var(--viking-accent-soft);
      }
      .viking-command-item:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-command-item:active {
        transform: scale(var(--viking-state-active-scale));
      }
      .viking-command-label {
        flex: 1;
      }
      .viking-command-empty {
        margin: 0;
        padding: var(--viking-space-2);
        color: var(--viking-text-muted);
        font-size: var(--viking-font-size);
        text-align: center;
      }
    `,
  ],
})
export class VikingCommand {
  readonly items = input.required<VikingCommandItem[]>();
  readonly open = model<boolean>(false);
  readonly placeholder = input<string>("Type a command or search…");

  readonly executed = output<VikingCommandItem>();

  private readonly queryInput =
    viewChild<ElementRef<HTMLInputElement>>("queryInput");
  private readonly dialogRoot =
    viewChild<ElementRef<HTMLElement>>("dialogRoot");
  private readonly commandUid = vikingUid("viking-command");
  protected readonly listboxId = `${this.commandUid}-listbox`;
  private returnFocus: HTMLElement | null = null;

  protected readonly query = signal("");
  protected readonly activeId = signal<string>("");

  protected optionId = (id: string): string =>
    `${this.commandUid}-option-${id}`;

  constructor() {
    // Reset + focus only on closed → open edge (not on items() churn while open)
    let wasOpen = false;
    effect(() => {
      const isOpen = this.open();
      if (isOpen && !wasOpen) {
        this.returnFocus = captureReturnFocus();
        const firstId = untracked(() => this.items()[0]?.id ?? "");
        this.query.set("");
        this.activeId.set(firstId);
        queueMicrotask(() => this.queryInput()?.nativeElement.focus());
      } else if (!isOpen && wasOpen) {
        restoreFocus(this.returnFocus);
        this.returnFocus = null;
      }
      wasOpen = isOpen;
    });
  }

  protected dismiss = (): void => {
    this.open.set(false);
  };

  protected onDialogKeydown = (event: KeyboardEvent): void => {
    const root = this.dialogRoot()?.nativeElement;
    if (root) trapTabKey(event, root);
  };

  protected readonly filtered = computed(() => {
    const query = this.query().toLowerCase().trim();
    if (!query) {
      return this.items();
    }
    return this.items().filter((item) =>
      item.label.toLowerCase().includes(query),
    );
  });

  protected readonly groups = computed(() => {
    const map = new Map<string, VikingCommandItem[]>();
    for (const item of this.filtered()) {
      const group = item.group ?? "Commands";
      map.set(group, [...(map.get(group) ?? []), item]);
    }
    return [...map.entries()].map(([name, items]) => ({ name, items }));
  });

  protected onQuery = (event: Event): void => {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeId.set(this.filtered()[0]?.id ?? "");
  };

  protected run = (item: VikingCommandItem): void => {
    this.executed.emit(item);
    this.dismiss();
    this.query.set("");
  };

  protected onKeydown = (event: KeyboardEvent): void => {
    const items = this.filtered();
    const index = items.findIndex((item) => item.id === this.activeId());
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.activeId.set(items[Math.min(items.length - 1, index + 1)]?.id ?? "");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.activeId.set(items[Math.max(0, index - 1)]?.id ?? "");
    } else if (event.key === "Enter") {
      const active =
        items.find((item) => item.id === this.activeId()) ?? items[0];
      if (active) {
        event.preventDefault();
        this.run(active);
      }
    }
  };
}
