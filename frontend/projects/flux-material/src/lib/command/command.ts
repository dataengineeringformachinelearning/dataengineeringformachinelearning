import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FluxIcon } from '../icon/icon';
import { FluxCommandItem } from '../core/types';

/**
 * flux-command — command palette (https://fluxui.dev/components/command).
 * Toggle with the `open` model; emits `executed` when an item is chosen.
 */
@Component({
  selector: 'flux-command',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'open.set(false)' },
  template: `
    @if (open()) {
      <button
        type="button"
        class="flux-command-backdrop"
        aria-label="Close command palette"
        (click)="open.set(false)"
      ></button>
      <div class="flux-command" role="dialog" aria-label="Command palette">
        <div class="flux-command-search">
          <flux-icon name="search" [size]="20" />
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
        <div class="flux-command-list" role="listbox">
          @for (group of groups(); track group.name) {
            <p class="flux-command-group">{{ group.name }}</p>
            @for (item of group.items; track item.id) {
              <button
                type="button"
                role="option"
                class="flux-command-item"
                [class.flux-active]="item.id === activeId()"
                [attr.aria-selected]="item.id === activeId()"
                (click)="run(item)"
                (mouseenter)="activeId.set(item.id)"
              >
                @if (item.icon) {
                  <flux-icon [name]="item.icon" [size]="18" />
                }
                <span class="flux-command-label">{{ item.label }}</span>
                @if (item.kbd) {
                  <kbd>{{ item.kbd }}</kbd>
                }
              </button>
            }
          }
          @if (filtered().length === 0) {
            <p class="flux-command-empty">No results for “{{ query() }}”</p>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .flux-command-backdrop {
        position: fixed;
        inset: 0;
        border: none;
        background: var(--flux-overlay-backdrop, rgba(49, 57, 60, 0.55));
        backdrop-filter: blur(4px);
        z-index: var(--flux-z-overlay);
        cursor: default;
      }
      .flux-command {
        position: fixed;
        top: 12vh;
        left: 50%;
        transform: translateX(-50%);
        width: min(576px, calc(100vw - var(--flux-space-4)));
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-md);
        z-index: calc(var(--flux-z-overlay) + 1);
        font-family: var(--flux-font-family);
        overflow: hidden;
      }
      .flux-command-search {
        display: flex;
        align-items: center;
        gap: var(--flux-space-1);
        padding: var(--flux-space-2);
        border-bottom: 1px solid var(--flux-border);
        color: var(--flux-text-muted);
      }
      .flux-command-search input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
      }
      kbd {
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        background: var(--flux-surface-alt);
        border: 1px solid var(--flux-border);
        border-radius: calc(var(--flux-radius) / 2);
        padding: 0 var(--flux-space-1);
        line-height: 1.4;
      }
      .flux-command-list {
        max-height: 342px;
        overflow: auto;
        padding: var(--flux-space-1);
      }
      .flux-command-group {
        margin: var(--flux-space-1) var(--flux-space-1) 3px;
        font-size: var(--flux-font-size);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--flux-text-muted);
      }
      .flux-command-item {
        display: flex;
        align-items: center;
        gap: var(--flux-space-1);
        width: 100%;
        border: none;
        background: transparent;
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        padding: var(--flux-space-1);
        border-radius: calc(var(--flux-radius) / 1.5);
        cursor: pointer;
        text-align: left;
      }
      .flux-command-item.flux-active {
        background: var(--flux-accent-soft);
      }
      .flux-command-label {
        flex: 1;
      }
      .flux-command-empty {
        margin: 0;
        padding: var(--flux-space-2);
        color: var(--flux-text-muted);
        font-size: var(--flux-font-size);
        text-align: center;
      }
    `,
  ],
})
export class FluxCommand {
  readonly items = input.required<FluxCommandItem[]>();
  readonly open = model<boolean>(false);
  readonly placeholder = input<string>('Type a command or search…');

  readonly executed = output<FluxCommandItem>();

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
    const map = new Map<string, FluxCommandItem[]>();
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

  protected run = (item: FluxCommandItem): void => {
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
