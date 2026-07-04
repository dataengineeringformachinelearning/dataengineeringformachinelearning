/** Shared Web Component item types. */
export type VikingSearchPaletteItem = {
  title: string;
  href: string;
  snippet?: string;
  group?: string;
};

export type VikingWcTone =
  | 'accent'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'subtle';
