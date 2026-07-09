import { registerVikingBadgeWc } from "./badge/viking-badge-wc";
import { registerVikingButtonWc } from "./button/viking-button-wc";
import { registerVikingCalloutWc } from "./callout/viking-callout-wc";
import { registerVikingCardWc } from "./card/viking-card-wc";
import { registerVikingFieldWc } from "./field/viking-field-wc";
import { registerVikingInputWc } from "./input/viking-input-wc";
import { registerVikingModalWc } from "./modal/viking-modal-wc";
import { registerVikingSearchPaletteWc } from "./search-palette/viking-search-palette-wc";
import { registerVikingStatusCardWc } from "./status-card/viking-status-card-wc";
import { registerVikingStatusPillWc } from "./status-pill/viking-status-pill-wc";
import {
  registerVikingSiteFooterWc,
  VikingSiteFooterWc,
} from "./site-footer/viking-site-footer-wc";
import {
  registerVikingSiteNavbarWc,
  VikingSiteNavbarWc,
} from "./site-navbar/viking-site-navbar-wc";
import { registerVikingSuiteHeaderWc } from "./suite-header/viking-suite-header-wc";
import { registerVikingSuiteSearchPaletteWc } from "./suite-search-palette/viking-suite-search-palette-wc";
import { registerVikingSelectWc } from "./select/viking-select-wc";
import { registerVikingThemeToggleWc } from "./theme-toggle/viking-theme-toggle-wc";

export { VikingBadgeWc, registerVikingBadgeWc } from "./badge/viking-badge-wc";
export {
  VikingButtonWc,
  registerVikingButtonWc,
} from "./button/viking-button-wc";
export {
  VikingCalloutWc,
  registerVikingCalloutWc,
} from "./callout/viking-callout-wc";
export { VikingCardWc, registerVikingCardWc } from "./card/viking-card-wc";
export { VikingFieldWc, registerVikingFieldWc } from "./field/viking-field-wc";
export { VikingInputWc, registerVikingInputWc } from "./input/viking-input-wc";
export { VikingModalWc, registerVikingModalWc } from "./modal/viking-modal-wc";
export {
  VikingSearchPaletteWc,
  registerVikingSearchPaletteWc,
  type VikingSearchPaletteItem,
} from "./search-palette/viking-search-palette-wc";
export {
  VikingStatusCardWc,
  registerVikingStatusCardWc,
} from "./status-card/viking-status-card-wc";
export {
  VikingStatusPillWc,
  registerVikingStatusPillWc,
} from "./status-pill/viking-status-pill-wc";
export {
  VikingSuiteSearchPaletteWc,
  registerVikingSuiteSearchPaletteWc,
} from "./suite-search-palette/viking-suite-search-palette-wc";
export {
  VikingSuiteHeaderWc,
  registerVikingSuiteHeaderWc,
} from "./suite-header/viking-suite-header-wc";
export {
  VikingSiteFooterWc,
  registerVikingSiteFooterWc,
} from "./site-footer/viking-site-footer-wc";
export {
  VikingSiteNavbarWc,
  registerVikingSiteNavbarWc,
} from "./site-navbar/viking-site-navbar-wc";
export {
  VikingSelectWc,
  registerVikingSelectWc,
} from "./select/viking-select-wc";
export {
  VikingThemeToggleWc,
  registerVikingThemeToggleWc,
} from "./theme-toggle/viking-theme-toggle-wc";
export type { VikingWcTone } from "./core/types";
export { VikingReactiveElement, type VikingAttrOptions } from "./core/reactive";
export {
  parseBoolean,
  parseJson,
  parseNumber,
  parseSelect,
} from "./core/parsers";
export {
  searchAlgoliaPages,
  ALGOLIA_DEFAULT_INDEXES,
  type AlgoliaHitItem,
  type AlgoliaConfig,
} from "./core/algolia-search";

/** Register all Viking-UI Web Components. Safe to call multiple times. */
export const registerVikingElements = (): void => {
  registerVikingButtonWc();
  registerVikingFieldWc();
  registerVikingInputWc();
  registerVikingBadgeWc();
  registerVikingCalloutWc();
  registerVikingCardWc();
  registerVikingSelectWc();
  registerVikingModalWc();
  registerVikingSearchPaletteWc();
  registerVikingStatusCardWc();
  registerVikingStatusPillWc();
  registerVikingSuiteHeaderWc();
  registerVikingSuiteSearchPaletteWc();
  registerVikingSiteNavbarWc();
  registerVikingSiteFooterWc();
  registerVikingThemeToggleWc();
};
