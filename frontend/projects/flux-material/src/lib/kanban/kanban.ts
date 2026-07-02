import { ChangeDetectionStrategy, Component, model, output, signal } from '@angular/core';
import { FluxIcon } from '../icon/icon';
import { FluxBadge } from '../badge/badge';
import { FluxKanbanCard, FluxKanbanColumn, FluxKanbanMove } from '../core/types';

/**
 * flux-kanban — drag & drop board (https://fluxui.dev/components/kanban).
 * Native HTML5 drag and drop; emits `moved` and updates the `columns` model.
 */
@Component({
  selector: 'flux-kanban',
  imports: [FluxIcon, FluxBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flux-kanban" role="group" aria-label="Kanban board" tabindex="0">
      @for (column of columns(); track column.id) {
        <section
          class="flux-kanban-column"
          [attr.aria-label]="column.title"
          [class.flux-drop-target]="dropColumnId() === column.id"
          (dragover)="onDragOver($event, column.id)"
          (dragleave)="dropColumnId.set(null)"
          (drop)="onDrop($event, column.id)"
        >
          <header class="flux-kanban-header">
            <span class="flux-kanban-title">{{ column.title }}</span>
            <flux-badge size="sm">{{ column.cards.length }}</flux-badge>
          </header>
          <div class="flux-kanban-cards">
            @for (card of column.cards; track card.id) {
              <article
                class="flux-kanban-card"
                draggable="true"
                [class.flux-dragging]="draggingId() === card.id"
                (dragstart)="onDragStart(card, column.id)"
                (dragend)="resetDrag()"
              >
                <div class="flux-kanban-card-header">
                  <span class="flux-kanban-card-title">{{ card.title }}</span>
                  <flux-icon class="flux-kanban-grip" name="grip-vertical" [size]="16" />
                </div>
                @if (card.description) {
                  <p class="flux-kanban-card-text">{{ card.description }}</p>
                }
              </article>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .flux-kanban:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-kanban {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(234px, 1fr);
        gap: var(--flux-space-2);
        overflow-x: auto;
        padding-bottom: var(--flux-space-1);
        font-family: var(--flux-font-family);
      }
      .flux-kanban-column {
        background: var(--flux-surface-alt);
        border: 1px solid var(--flux-border);
        border-radius: var(--flux-radius);
        padding: var(--flux-space-1);
        transition: var(--flux-transition);
      }
      .flux-drop-target {
        border-color: var(--flux-accent);
        background: var(--flux-accent-soft);
      }
      .flux-kanban-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--flux-space-1);
        padding: var(--flux-space-1);
      }
      .flux-kanban-title {
        font-size: var(--flux-font-size);
        font-weight: 600;
        color: var(--flux-text);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .flux-kanban-cards {
        display: flex;
        flex-direction: column;
        gap: var(--flux-space-1);
        min-height: var(--flux-space-4);
      }
      .flux-kanban-card {
        background: var(--flux-surface);
        border: 1px solid var(--flux-border);
        border-radius: calc(var(--flux-radius) / 1.2);
        box-shadow: var(--flux-shadow-sm);
        padding: var(--flux-space-1) var(--flux-space-2);
        cursor: grab;
        transition: var(--flux-transition);
      }
      .flux-kanban-card:hover {
        border-color: var(--flux-accent-strong);
      }
      .flux-dragging {
        opacity: 0.45;
      }
      .flux-kanban-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--flux-space-1);
      }
      .flux-kanban-card-title {
        font-size: var(--flux-font-size);
        font-weight: 600;
        color: var(--flux-text);
      }
      .flux-kanban-grip {
        color: var(--flux-text-muted);
      }
      .flux-kanban-card-text {
        margin: 3px 0 0;
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        line-height: 1.45;
      }
    `,
  ],
})
export class FluxKanban {
  readonly columns = model<FluxKanbanColumn[]>([]);

  readonly moved = output<FluxKanbanMove>();

  protected readonly draggingId = signal<string | null>(null);
  protected readonly dropColumnId = signal<string | null>(null);

  private dragSource: { card: FluxKanbanCard; columnId: string } | null = null;

  protected onDragStart = (card: FluxKanbanCard, columnId: string): void => {
    this.dragSource = { card, columnId };
    this.draggingId.set(card.id);
  };

  protected onDragOver = (event: DragEvent, columnId: string): void => {
    event.preventDefault();
    this.dropColumnId.set(columnId);
  };

  protected onDrop = (event: DragEvent, toColumnId: string): void => {
    event.preventDefault();
    const source = this.dragSource;
    this.resetDrag();
    if (!source || source.columnId === toColumnId) {
      return;
    }
    this.columns.update(columns =>
      columns.map(column => {
        if (column.id === source.columnId) {
          return { ...column, cards: column.cards.filter(card => card.id !== source.card.id) };
        }
        if (column.id === toColumnId) {
          return { ...column, cards: [...column.cards, source.card] };
        }
        return column;
      }),
    );
    const target = this.columns().find(column => column.id === toColumnId);
    this.moved.emit({
      cardId: source.card.id,
      fromColumnId: source.columnId,
      toColumnId,
      toIndex: (target?.cards.length ?? 1) - 1,
    });
  };

  protected resetDrag = (): void => {
    this.draggingId.set(null);
    this.dropColumnId.set(null);
    this.dragSource = null;
  };
}
