import type { VikingIconName } from "./icons";

/** Semantic tones — every tone resolves to a THEME.md token. */
export type VikingTone =
  | "accent"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

export type VikingSize = "base" | "sm" | "xs";

export interface VikingSelectOption<T = unknown> {
  label: string;
  value: T;
  disabled?: boolean;
}

export interface VikingCommandItem {
  id: string;
  label: string;
  group?: string;
  icon?: VikingIconName;
  kbd?: string;
}

export interface VikingKanbanCard {
  id: string;
  title: string;
  description?: string;
  tone?: VikingTone;
}

export interface VikingKanbanColumn {
  id: string;
  title: string;
  cards: VikingKanbanCard[];
}

export interface VikingKanbanMove {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  toIndex: number;
}

export interface VikingChartSeries {
  name: string;
  data: number[];
  tone?: VikingTone;
}

export type VikingChartKind =
  | "line"
  | "area"
  | "bar"
  | "grouped-bar"
  | "stacked-bar"
  | "sparkline"
  | "donut";

export type VikingChartCurve = "linear" | "smooth";

export interface VikingDonutSegment {
  label: string;
  value: number;
  tone?: VikingTone;
}

export interface VikingToastOptions {
  heading?: string;
  text: string;
  tone?: VikingTone;
  /** Auto-dismiss duration in ms. 0 disables auto-dismiss. */
  duration?: number;
}

export interface VikingToastInstance extends Required<
  Omit<VikingToastOptions, "heading">
> {
  id: number;
  heading: string;
}
