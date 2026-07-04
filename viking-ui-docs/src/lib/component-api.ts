/** Shared API reference types for documented showcase components. */

export type ApiProperty = {
  name: string;
  type: string;
  default?: string;
  description: string;
};

export type ComponentApi = {
  /** Angular signal inputs */
  inputs?: ApiProperty[];
  /** Angular signal outputs */
  outputs?: ApiProperty[];
  /** Web Component / HTML attributes */
  attributes?: ApiProperty[];
  /** CSS class hooks for static surfaces */
  cssClasses?: ApiProperty[];
  /** Events dispatched by Web Components */
  events?: ApiProperty[];
};

/** Consistent API patterns applied across all Viking-UI components. */
export const API_CONVENTIONS: ApiProperty[] = [
  {
    name: 'size',
    type: 'VikingSize',
    default: "'base'",
    description: 'Control density: xs | sm | base. Maps to tokenized heights and padding.',
  },
  {
    name: 'disabled',
    type: 'boolean',
    default: 'false',
    description: 'Disables interaction and applies muted styling. Always pair with aria-disabled on WC.',
  },
  {
    name: 'tone',
    type: 'VikingTone',
    default: "'default'",
    description: 'Semantic color: default | accent | success | warning | danger | info. Never use color alone for status.',
  },
];

export const FIELD_API: ComponentApi = {
  inputs: [
    { name: 'label', type: 'string', description: 'Visible field label text.' },
    { name: 'description', type: 'string', description: 'Helper text below the control.' },
    { name: 'error', type: 'string', description: 'Validation message; triggers invalid styling and role="alert".' },
    { name: 'required', type: 'boolean', default: 'false', description: 'Shows required indicator on label.' },
  ],
};

export const BUTTON_API: ComponentApi = {
  inputs: [
    { name: 'variant', type: 'VikingButtonVariant', default: "'outline'", description: 'Visual style: primary | secondary | outline | danger | ghost | subtle | filled.' },
    { name: 'size', type: 'VikingSize', default: "'base'", description: 'xs | sm | base.' },
    { name: 'type', type: "'button' | 'submit'", default: "'button'", description: 'Native button type when not rendered as a link.' },
    { name: 'icon', type: 'VikingIconName | null', description: 'Leading icon from the Viking icon registry.' },
    { name: 'iconTrailing', type: 'VikingIconName | null', description: 'Trailing icon.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Prevents interaction.' },
    { name: 'loading', type: 'boolean', default: 'false', description: 'Shows spinner and sets aria-busy.' },
    { name: 'fullWidth', type: 'boolean', default: 'false', description: 'Stretches to container width.' },
    { name: 'compact', type: 'boolean', default: 'false', description: 'Reduced padding for dense toolbars.' },
    { name: 'href', type: 'string | null', description: 'When set, renders as an anchor instead of button.' },
    { name: 'kbd', type: 'string | null', description: 'Keyboard shortcut hint badge (e.g. ⌘K).' },
  ],
  outputs: [{ name: 'pressed', type: 'MouseEvent', description: 'Emits when the button is activated.' }],
  attributes: [
    { name: 'variant', type: 'string', default: 'outline', description: 'Same as Angular input.' },
    { name: 'size', type: 'xs | sm', description: 'Compact sizes; omit for base.' },
    { name: 'disabled', type: 'boolean', description: 'Boolean attribute.' },
    { name: 'loading', type: 'boolean', description: 'Boolean attribute.' },
    { name: 'full-width', type: 'boolean', description: 'Kebab-case on Web Component.' },
    { name: 'compact', type: 'boolean', description: 'Boolean attribute.' },
    { name: 'href', type: 'string', description: 'Link destination.' },
  ],
  events: [{ name: 'viking-press', type: 'CustomEvent<MouseEvent>', description: 'Fired on click when not disabled.' }],
  cssClasses: [
    { name: 'viking-btn', type: 'class', description: 'Base button class for static HTML.' },
    { name: 'viking-btn-primary', type: 'class', description: 'Primary action variant.' },
    { name: 'viking-btn-secondary', type: 'class', description: 'Secondary emphasis.' },
    { name: 'viking-btn-outline', type: 'class', description: 'Bordered neutral variant.' },
    { name: 'viking-btn-danger', type: 'class', description: 'Destructive action.' },
    { name: 'viking-btn-compact', type: 'class', description: 'Reduced padding.' },
    { name: 'viking-btn-full', type: 'class', description: 'Full width.' },
  ],
};

export const INPUT_API: ComponentApi = {
  inputs: [
    { name: 'type', type: 'string', default: "'text'", description: 'Native input type attribute.' },
    { name: 'placeholder', type: 'string', description: 'Placeholder text.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the control.' },
    { name: 'readonly', type: 'boolean', default: 'false', description: 'Read-only state.' },
    { name: 'clearable', type: 'boolean', default: 'false', description: 'Shows clear button when value is present.' },
  ],
  attributes: [
    { name: 'placeholder', type: 'string', description: 'Placeholder text.' },
    { name: 'type', type: 'string', default: 'text', description: 'Input type.' },
    { name: 'clearable', type: 'boolean', description: 'Boolean attribute.' },
    { name: 'disabled', type: 'boolean', description: 'Boolean attribute.' },
    { name: 'name', type: 'string', description: 'Form field name.' },
  ],
  cssClasses: [
    { name: 'viking-input-shell', type: 'class', description: 'Wrapper with machined border and focus ring.' },
    { name: 'viking-input-native', type: 'class', description: 'Native input element inside shell.' },
  ],
};

export const BADGE_API: ComponentApi = {
  inputs: [
    { name: 'tone', type: 'VikingTone', default: "'default'", description: 'Semantic color tone.' },
    { name: 'size', type: 'VikingSize', default: "'base'", description: 'xs | sm | base.' },
    { name: 'icon', type: 'VikingIconName | null', description: 'Leading status icon.' },
    { name: 'removable', type: 'boolean', default: 'false', description: 'Shows remove button; emits removed.' },
  ],
  outputs: [{ name: 'removed', type: 'void', description: 'Emits when remove button is clicked.' }],
  cssClasses: [
    { name: 'showcase-badge', type: 'class', description: 'Default badge styling in static CSS.' },
    { name: 'showcase-badge-accent', type: 'class', description: 'Accent tone modifier.' },
    { name: 'showcase-badge-success', type: 'class', description: 'Success tone modifier.' },
    { name: 'showcase-badge-warning', type: 'class', description: 'Warning tone modifier.' },
    { name: 'showcase-badge-danger', type: 'class', description: 'Danger tone modifier.' },
  ],
};

export const CARD_API: ComponentApi = {
  inputs: [
    { name: 'compact', type: 'boolean', default: 'false', description: 'Reduced padding via viking-card-compact.' },
    { name: 'interactive', type: 'boolean', default: 'false', description: 'Hover lift for clickable cards.' },
  ],
  cssClasses: [
    { name: 'viking-card', type: 'class', description: 'Machined surface panel with inset hairline.' },
    { name: 'viking-card-compact', type: 'class', description: 'Compact padding modifier.' },
    { name: 'viking-card-header', type: 'class', description: 'Structured header region.' },
    { name: 'viking-metric-card', type: 'class', description: 'KPI metric surface variant.' },
  ],
};

export const CALLOUT_API: ComponentApi = {
  inputs: [
    { name: 'tone', type: 'VikingTone', default: "'info'", description: 'info | warning | success | danger.' },
    { name: 'icon', type: 'VikingIconName', description: 'Leading icon — required for a11y when tone conveys status.' },
    { name: 'title', type: 'string', description: 'Bold callout heading.' },
  ],
  cssClasses: [
    { name: 'showcase-callout', type: 'class', description: 'Base callout container.' },
    { name: 'showcase-callout-info', type: 'class', description: 'Informational tone.' },
    { name: 'showcase-callout-warning', type: 'class', description: 'Warning tone.' },
  ],
};

export const CHART_API: ComponentApi = {
  inputs: [
    { name: 'kind', type: 'VikingChartKind', default: "'line'", description: 'line | area | bar | donut | sparkline.' },
    { name: 'data', type: 'number[] | VikingChartSeries[]', description: 'Series data points.' },
    { name: 'tone', type: 'string', default: "'primary'", description: 'Maps to --viking-series-* tokens.' },
    { name: 'height', type: 'number', default: '120', description: 'SVG viewport height in px (token-aligned).' },
    { name: 'curve', type: 'VikingChartCurve', default: "'smooth'", description: 'linear | smooth | step.' },
  ],
};

export const MODAL_API: ComponentApi = {
  inputs: [
    { name: 'open', type: 'boolean', default: 'false', description: 'Controls visibility.' },
    { name: 'title', type: 'string', description: 'Dialog title for aria-labelledby.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Dialog width preset.' },
    { name: 'dismissible', type: 'boolean', default: 'true', description: 'Allow Escape and overlay click to close.' },
  ],
  outputs: [
    { name: 'openChange', type: 'boolean', description: 'Two-way binding for open state.' },
    { name: 'closed', type: 'void', description: 'Emits after close animation.' },
  ],
};

export const SWITCH_API: ComponentApi = {
  inputs: [
    { name: 'checked', type: 'boolean', default: 'false', description: 'Toggle state.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables interaction.' },
    { name: 'label', type: 'string', description: 'Accessible label text.' },
  ],
  outputs: [{ name: 'checkedChange', type: 'boolean', description: 'Emits on toggle.' }],
};

export const TOAST_API: ComponentApi = {
  inputs: [
    { name: 'message', type: 'string', description: 'Toast body text.' },
    { name: 'tone', type: 'VikingTone', default: "'default'", description: 'Semantic tone for icon + border.' },
    { name: 'duration', type: 'number', default: '5000', description: 'Auto-dismiss ms; 0 for persistent.' },
  ],
};

export const ICON_API: ComponentApi = {
  inputs: [
    { name: 'name', type: 'VikingIconName', description: 'Icon from the zero-dep SVG registry.' },
    { name: 'size', type: 'number | VikingIconSizePreset', default: '22', description: 'Pixel size or preset: xs | sm | md | lg.' },
    { name: 'color', type: 'VikingIconColorToken', description: 'Semantic color token alias.' },
    { name: 'spin', type: 'boolean', default: 'false', description: 'Rotation animation for loaders.' },
  ],
};

export const COMPONENT_API_MAP: Record<string, ComponentApi> = {
  button: BUTTON_API,
  input: INPUT_API,
  badge: BADGE_API,
  card: CARD_API,
  'field-stack': FIELD_API,
  callout: CALLOUT_API,
  chart: CHART_API,
  modal: MODAL_API,
  switch: SWITCH_API,
  toast: TOAST_API,
  icon: ICON_API,
};

export const getComponentApi = (id: string): ComponentApi | undefined => COMPONENT_API_MAP[id];
