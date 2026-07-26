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

/** Values supported by viking-select / viking-radio-group. */
export type VikingOptionValue = string | number | boolean;

export interface VikingSelectOption<T extends VikingOptionValue = string> {
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

export type VikingToastAction = {
  readonly label: string;
  readonly onClick: () => void;
};

/** Importance for the priority toast stack (FORJD ADR-0020). */
export type VikingToastPriority = "low" | "normal" | "high" | "critical";

export interface VikingToastOptions {
  heading?: string;
  text: string;
  tone?: VikingTone;
  /** Importance — defaults from tone (success→low, danger→critical). */
  priority?: VikingToastPriority;
  /** Auto-dismiss duration in ms. 0 disables auto-dismiss. */
  duration?: number;
  /** Replace an in-flight toast with the same key. */
  dedupeKey?: string;
  /** Optional one-shot action (e.g. Undo). */
  action?: VikingToastAction;
}

export interface VikingToastInstance extends Required<
  Omit<VikingToastOptions, "heading" | "action" | "priority" | "dedupeKey">
> {
  id: number;
  heading: string;
  priority: VikingToastPriority;
  dedupeKey?: string;
  action?: VikingToastAction;
}
