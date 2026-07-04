import type { VikingSearchPaletteItem } from './core/types';

/** Custom events dispatched by Viking-UI Web Components. */
export type VikingWcChangeDetail = { value: string };
export type VikingWcQueryDetail = { query: string };
export type VikingWcSelectDetail = { item: VikingSearchPaletteItem };

declare global {
  interface HTMLElementTagNameMap {
    'viking-badge-wc': import('./badge/viking-badge-wc').VikingBadgeWc;
    'viking-button-wc': import('./button/viking-button-wc').VikingButtonWc;
    'viking-callout-wc': import('./callout/viking-callout-wc').VikingCalloutWc;
    'viking-card-wc': import('./card/viking-card-wc').VikingCardWc;
    'viking-input-wc': import('./input/viking-input-wc').VikingInputWc;
    'viking-modal-wc': import('./modal/viking-modal-wc').VikingModalWc;
    'viking-search-palette-wc': import('./search-palette/viking-search-palette-wc').VikingSearchPaletteWc;
    'viking-select-wc': import('./select/viking-select-wc').VikingSelectWc;
    'viking-theme-toggle-wc': import('./theme-toggle/viking-theme-toggle-wc').VikingThemeToggleWc;
  }
}

export {};
