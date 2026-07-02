import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingCommandItem } from '../core/types';

/**
 * viking-command — command palette (https://fluxui.dev/components/command).
 * Toggle with the `open` model; emits `executed` when an item is chosen.
 */
@Component({
  selector: 'viking-command',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'open.set(false)' },
  template: `
    @if (open()) {
      <button
        type="button"
        class="viking-command-backdrop"
        aria-label="Close command palette"
        (click)="open.set(false)"
      ></button>
      <div class="viking-command" role="dialog" aria-label="Command palette">
        <div class="viking-command-search">
          <viking-icon name="search" [size]="20" />
          <input
            type="text"
            [placeholder]="placeholder()"
            [value]="query()"
            aria-label="Search commands"
            (input)="onQuery($event)"
            (keydown)="onKeydown($event)"
          />
          <kbd>esc</kbd>
        </div>
        <div class="viking-command-list" role="listbox">
          @for (group of groups(); track group.name) {
            <p class="viking-command-group">{{ group.name }}</p>
            @for (item of group.items; track item.id) {
              <button
                type="button"
                role="option"
                class="viking-command-item"
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
        margin: var(--viking-space-1) var(--viking-space-1) 3px;
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
        border: none;
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        padding: var(--viking-space-1);
        border-radius: calc(var(--viking-radius) / 1.5);
        cursor: pointer;
        text-align: left;
      }
      .viking-command-item.viking-active {
        background: var(--viking-accent-soft);
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
  readonly placeholder = input<string>('Type a command or search…');

  readonly executed = output<VikingCommandItem>();

  protected readonly query = signal('');
  protected readonly activeId = signal<string>('');

  protected readonly filtered = computed(() => {
    const query = this.query().toLowerCase().trim();
    if (!query) {
      return this.items();
    }
    return this.items().filter(item => item.label.toLowerCase().includes(query));
  });

  protected readonly groups = computed(() => {
    const map = new Map<string, VikingCommandItem[]>();
    for (const item of this.filtered()) {
      const group = item.group ?? 'Commands';
      map.set(group, [...(map.get(group) ?? []), item]);
    }
    return [...map.entries()].map(([name, items]) => ({ name, items }));
  });

  protected onQuery = (event: Event): void => {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeId.set(this.filtered()[0]?.id ?? '');
  };

  protected run = (item: VikingCommandItem): void => {
    this.executed.emit(item);
    this.open.set(false);
    this.query.set('');
  };

  protected onKeydown = (event: KeyboardEvent): void => {
    const items = this.filtered();
    const index = items.findIndex(item => item.id === this.activeId());
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeId.set(items[Math.min(items.length - 1, index + 1)]?.id ?? '');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeId.set(items[Math.max(0, index - 1)]?.id ?? '');
    } else if (event.key === 'Enter') {
      const active = items.find(item => item.id === this.activeId()) ?? items[0];
      if (active) {
        event.preventDefault();
        this.run(active);
      }
    }
  };
}
