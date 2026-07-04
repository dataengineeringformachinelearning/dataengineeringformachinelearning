import { registerVikingBadgeWc } from './badge/viking-badge-wc';
import { registerVikingButtonWc } from './button/viking-button-wc';
import { registerVikingInputWc } from './input/viking-input-wc';
import { registerVikingThemeToggleWc } from './theme-toggle/viking-theme-toggle-wc';

export { VikingBadgeWc, registerVikingBadgeWc } from './badge/viking-badge-wc';
export { VikingButtonWc, registerVikingButtonWc } from './button/viking-button-wc';
export { VikingInputWc, registerVikingInputWc } from './input/viking-input-wc';
export {
  VikingThemeToggleWc,
  registerVikingThemeToggleWc,
} from './theme-toggle/viking-theme-toggle-wc';

/** Register all Viking-UI Web Components. Safe to call multiple times. */
export const registerVikingElements = (): void => {
  registerVikingButtonWc();
  registerVikingInputWc();
  registerVikingBadgeWc();
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
