import type { FluxIconName } from './icons';

/** Semantic tones — every tone resolves to a THEME.md token. */
export type FluxTone = 'accent' | 'success' | 'warning' | 'danger' | 'muted';

export type FluxSize = 'base' | 'sm' | 'xs';

export interface FluxSelectOption<T = unknown> {
  label: string;
  value: T;
  disabled?: boolean;
}

export interface FluxCommandItem {
  id: string;
  label: string;
  group?: string;
  icon?: FluxIconName;
  kbd?: string;
}

export interface FluxKanbanCard {
  id: string;
  title: string;
  description?: string;
  tone?: FluxTone;
}

export interface FluxKanbanColumn {
  id: string;
  title: string;
  cards: FluxKanbanCard[];
}

export interface FluxKanbanMove {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  toIndex: number;
}

export interface FluxChartSeries {
  name: string;
  data: number[];
  tone?: FluxTone;
}

export type FluxChartKind = 'line' | 'bar' | 'donut';

export interface FluxDonutSegment {
  label: string;
  value: number;
  tone?: FluxTone;
}

export interface FluxToastOptions {
  heading?: string;
  text: string;
  tone?: FluxTone;
  /** Auto-dismiss duration in ms. 0 disables auto-dismiss. */
  duration?: number;
}

export interface FluxToastInstance extends Required<Omit<FluxToastOptions, 'heading'>> {
  id: number;
  heading: string;
}
