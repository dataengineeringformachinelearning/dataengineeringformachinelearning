import { ChangeDetectionStrategy, Component, model, output, signal } from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingBadge } from '../badge/badge';
import { VikingKanbanCard, VikingKanbanColumn, VikingKanbanMove } from '../core/types';

/**
 * viking-kanban — drag & drop board.
 * Native HTML5 drag and drop; emits `moved` and updates the `columns` model.
 */
@Component({
  selector: 'viking-kanban',
  imports: [VikingIcon, VikingBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-kanban" role="group" aria-label="Kanban board" tabindex="0">
      @for (column of columns(); track column.id) {
        <section
          class="viking-kanban-column"
          [attr.aria-label]="column.title"
          [class.viking-drop-target]="dropColumnId() === column.id"
          (dragover)="onDragOver($event, column.id)"
          (dragleave)="dropColumnId.set(null)"
          (drop)="onDrop($event, column.id)"
        >
          <header class="viking-kanban-header">
            <span class="viking-kanban-title">{{ column.title }}</span>
            <viking-badge size="sm">{{ column.cards.length }}</viking-badge>
          </header>
          <div class="viking-kanban-cards">
            @for (card of column.cards; track card.id) {
              <article
                class="viking-kanban-card"
                draggable="true"
                [class.viking-dragging]="draggingId() === card.id"
                (dragstart)="onDragStart(card, column.id)"
                (dragend)="resetDrag()"
              >
                <div class="viking-kanban-card-header">
                  <span class="viking-kanban-card-title">{{ card.title }}</span>
                  <viking-icon class="viking-kanban-grip" name="grip-vertical" [size]="16" />
                </div>
                @if (card.description) {
                  <p class="viking-kanban-card-text">{{ card.description }}</p>
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
      .viking-kanban:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-kanban {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(234px, 1fr);
        gap: var(--viking-space-2);
        overflow-x: auto;
        padding-bottom: var(--viking-space-1);
        font-family: var(--viking-font-family);
      }
      .viking-kanban-column {
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        padding: var(--viking-space-1);
        transition: var(--viking-transition);
      }
      .viking-drop-target {
        border-color: var(--viking-accent);
        background: var(--viking-accent-soft);
      }
      .viking-kanban-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-1);
        padding: var(--viking-space-1);
      }
      .viking-kanban-title {
        font-size: var(--viking-font-size);
        font-weight: 600;
        color: var(--viking-text);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .viking-kanban-cards {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
        min-height: var(--viking-space-4);
      }
      .viking-kanban-card {
        background: var(--viking-surface);
        border: 1px solid var(--viking-border);
        border-radius: calc(var(--viking-radius) / 1.2);
        box-shadow: var(--viking-shadow-sm);
        padding: var(--viking-space-1) var(--viking-space-2);
        cursor: grab;
        transition: var(--viking-transition);
      }
      .viking-kanban-card:hover {
        border-color: var(--viking-accent-strong);
      }
      .viking-dragging {
        opacity: 0.45;
      }
      .viking-kanban-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-1);
      }
      .viking-kanban-card-title {
        font-size: var(--viking-font-size);
        font-weight: 600;
        color: var(--viking-text);
      }
      .viking-kanban-grip {
        color: var(--viking-text-muted);
      }
      .viking-kanban-card-text {
        margin: 3px 0 0;
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        line-height: 1.45;
      }
    `,
  ],
})
export class VikingKanban {
  readonly columns = model<VikingKanbanColumn[]>([]);

  readonly moved = output<VikingKanbanMove>();

  protected readonly draggingId = signal<string | null>(null);
  protected readonly dropColumnId = signal<string | null>(null);

  private dragSource: { card: VikingKanbanCard; columnId: string } | null = null;

  protected onDragStart = (card: VikingKanbanCard, columnId: string): void => {
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
