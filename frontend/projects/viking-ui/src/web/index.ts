import { registerVikingButtonWc } from './button/viking-button-wc';
import { registerVikingInputWc } from './input/viking-input-wc';

export { VikingButtonWc, registerVikingButtonWc } from './button/viking-button-wc';
export { VikingInputWc, registerVikingInputWc } from './input/viking-input-wc';

/** Register all Viking-UI Web Components. Safe to call multiple times. */
export const registerVikingElements = (): void => {
  registerVikingButtonWc();
  registerVikingInputWc();
};

// Auto-register when loaded as a script bundle (Astro, Django, static HTML).
if (typeof globalThis !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerVikingElements);
  } else {
    registerVikingElements();
  }
}
