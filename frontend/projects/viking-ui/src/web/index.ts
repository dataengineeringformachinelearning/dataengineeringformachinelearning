import { registerVikingBadgeWc } from './badge/viking-badge-wc';
import { registerVikingButtonWc } from './button/viking-button-wc';
import { registerVikingCalloutWc } from './callout/viking-callout-wc';
import { registerVikingCardWc } from './card/viking-card-wc';
import { registerVikingInputWc } from './input/viking-input-wc';
import { registerVikingModalWc } from './modal/viking-modal-wc';
import { registerVikingSearchPaletteWc } from './search-palette/viking-search-palette-wc';
import { registerVikingSelectWc } from './select/viking-select-wc';
import { registerVikingThemeToggleWc } from './theme-toggle/viking-theme-toggle-wc';

export { VikingBadgeWc, registerVikingBadgeWc } from './badge/viking-badge-wc';
export { VikingButtonWc, registerVikingButtonWc } from './button/viking-button-wc';
export { VikingCalloutWc, registerVikingCalloutWc } from './callout/viking-callout-wc';
export { VikingCardWc, registerVikingCardWc } from './card/viking-card-wc';
export { VikingInputWc, registerVikingInputWc } from './input/viking-input-wc';
export { VikingModalWc, registerVikingModalWc } from './modal/viking-modal-wc';
export {
  VikingSearchPaletteWc,
  registerVikingSearchPaletteWc,
  type VikingSearchPaletteItem,
} from './search-palette/viking-search-palette-wc';
export { VikingSelectWc, registerVikingSelectWc } from './select/viking-select-wc';
export {
  VikingThemeToggleWc,
  registerVikingThemeToggleWc,
} from './theme-toggle/viking-theme-toggle-wc';
export type { VikingWcTone } from './core/types';

/** Register all Viking-UI Web Components. Safe to call multiple times. */
export const registerVikingElements = (): void => {
  registerVikingButtonWc();
  registerVikingInputWc();
  registerVikingBadgeWc();
  registerVikingCalloutWc();
  registerVikingCardWc();
  registerVikingSelectWc();
  registerVikingModalWc();
  registerVikingSearchPaletteWc();
  registerVikingThemeToggleWc();
};

// Auto-register when loaded as a script bundle (Astro, Django, static HTML).
if (typeof globalThis !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerVikingElements);
  } else {
    registerVikingElements();
  }
}
