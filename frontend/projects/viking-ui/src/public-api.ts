/*
 * @dataengineeringformachinelearning/viking-ui — public API surface.
 * Viking-UI: DEML clinical design system for Angular (THEME.md palette only).
 */

// Core
export * from './lib/core/types';
export type { VikingChartCurve, VikingChartKind, VikingDonutSegment } from './lib/core/types';
export {
  VIKING_ICON_NAMES,
  VIKING_ICON_PATHS,
  VIKING_ICON_VIEWBOXES,
  MATERIAL_ICON_ALIASES,
  resolveVikingIcon,
  vikingIconViewBox,
} from './lib/core/icons';
export type { VikingIconName } from './lib/core/icons';
export { VikingControl, provideVikingCva } from './lib/core/cva';

// Components (alphabetical)
export * from './lib/site-chrome/site-chrome.config';
export * from './lib/site-chrome/site-navbar';
export * from './lib/site-chrome/site-footer';
export * from './lib/app-header/app-header';
export * from './lib/app-sidebar/app-sidebar';
export * from './lib/accordion/accordion';
export * from './lib/auth-panel/auth-panel';
export * from './lib/autocomplete/autocomplete';
export * from './lib/avatar/avatar';
export * from './lib/badge/badge';
export * from './lib/bar/bar';
export * from './lib/brand/brand';
export * from './lib/breadcrumbs/breadcrumbs';
export * from './lib/button/button';
export * from './lib/button/button-group';
export * from './lib/calendar/calendar';
export * from './lib/callout/callout';
export * from './lib/card/card';
export * from './lib/carousel/carousel';
export * from './lib/chart/chart';
export * from './lib/checkbox/checkbox';
export * from './lib/color-picker/color-picker';
export * from './lib/command/command';
export * from './lib/composer/composer';
export * from './lib/context/context';
export * from './lib/date-picker/date-picker';
export * from './lib/dropdown/dropdown';
export * from './lib/editor/editor';
export * from './lib/fab/fab';
export * from './lib/field/field';
export * from './lib/footer/footer';
export * from './lib/file-upload/file-upload';
export * from './lib/gauge-arc/gauge-arc';
export * from './lib/hud-panel/hud-panel';
export * from './lib/icon/icon';
export * from './lib/input/input';
export * from './lib/kanban/kanban';
export * from './lib/kbd/kbd';
export * from './lib/label/label';
export * from './lib/metric-card/metric-card';
export * from './lib/menubar/menubar';
export * from './lib/modal/modal';
export * from './lib/native-select/native-select';
export * from './lib/navigation-menu/navigation-menu';
export type { VikingNavItem } from './lib/navigation-menu/navigation-menu';
export * from './lib/navbar/navbar';
export * from './lib/otp-input/otp-input';
export * from './lib/page-header/page-header';
export * from './lib/pagination/pagination';
export * from './lib/pillbox/pillbox';
export * from './lib/popover/popover';
export * from './lib/profile/profile';
export * from './lib/progress/progress';
export * from './lib/radio/radio';
export * from './lib/ring-gauge/ring-gauge';
export * from './lib/search-palette/search-palette';
export * from './lib/select/select';
export * from './lib/separator/separator';
export * from './lib/scroll-area/scroll-area';
export * from './lib/sheet/sheet';
export * from './lib/skeleton/skeleton';
export * from './lib/spinner/spinner';
export * from './lib/slider/slider';
export * from './lib/switch/switch';
export * from './lib/table/table';
export * from './lib/tabs/tab';
export * from './lib/tabs/tab-panel';
export * from './lib/tabs/tabs';
export * from './lib/textarea/textarea';
export * from './lib/toggle/toggle';
export * from './lib/toggle/toggle-group';
export * from './lib/time-picker/time-picker';
export * from './lib/timeline/timeline';
export * from './lib/toast/toast';
export * from './lib/uptime-bar/uptime-bar';
export * from './lib/whitepaper-cta/whitepaper-cta';
export type { VikingUptimeStatus } from './lib/uptime-bar/uptime-bar';
export * from './lib/tooltip/tooltip';
export * from './lib/typography/heading';
export * from './lib/typography/text';
