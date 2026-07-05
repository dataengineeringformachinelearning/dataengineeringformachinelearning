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
    name: "size",
    type: "VikingSize",
    default: "'base'",
    description:
      "Control density: xs | sm | base. Maps to tokenized heights and padding.",
  },
  {
    name: "disabled",
    type: "boolean",
    default: "false",
    description:
      "Disables interaction and applies muted styling. Always pair with aria-disabled on WC.",
  },
  {
    name: "tone",
    type: "VikingTone",
    default: "'default'",
    description:
      "Semantic color: default | accent | success | warning | danger | info. Never use color alone for status.",
  },
];

export const FIELD_API: ComponentApi = {
  inputs: [
    { name: "label", type: "string", description: "Visible field label text." },
    {
      name: "description",
      type: "string",
      description: "Helper text below the control.",
    },
    {
      name: "error",
      type: "string",
      description:
        'Validation message; triggers invalid styling and role="alert".',
    },
    {
      name: "required",
      type: "boolean",
      default: "false",
      description: "Shows required indicator on label.",
    },
  ],
};

export const BUTTON_API: ComponentApi = {
  inputs: [
    {
      name: "variant",
      type: "VikingButtonVariant",
      default: "'outline'",
      description:
        "Visual style: primary | secondary | outline | danger | ghost | subtle | filled.",
    },
    {
      name: "size",
      type: "VikingSize",
      default: "'base'",
      description: "xs | sm | base.",
    },
    {
      name: "type",
      type: "'button' | 'submit'",
      default: "'button'",
      description: "Native button type when not rendered as a link.",
    },
    {
      name: "icon",
      type: "VikingIconName | null",
      description: "Leading icon from the Viking icon registry.",
    },
    {
      name: "iconTrailing",
      type: "VikingIconName | null",
      description: "Trailing icon.",
    },
    {
      name: "disabled",
      type: "boolean",
      default: "false",
      description: "Prevents interaction.",
    },
    {
      name: "loading",
      type: "boolean",
      default: "false",
      description: "Shows spinner and sets aria-busy.",
    },
    {
      name: "fullWidth",
      type: "boolean",
      default: "false",
      description: "Stretches to container width.",
    },
    {
      name: "compact",
      type: "boolean",
      default: "false",
      description: "Reduced padding for dense toolbars.",
    },
    {
      name: "href",
      type: "string | null",
      description: "When set, renders as an anchor instead of button.",
    },
    {
      name: "kbd",
      type: "string | null",
      description: "Keyboard shortcut hint badge (e.g. ⌘K).",
    },
  ],
  outputs: [
    {
      name: "pressed",
      type: "MouseEvent",
      description: "Emits when the button is activated.",
    },
  ],
  attributes: [
    {
      name: "variant",
      type: "string",
      default: "outline",
      description: "Same as Angular input.",
    },
    {
      name: "size",
      type: "xs | sm",
      description: "Compact sizes; omit for base.",
    },
    { name: "disabled", type: "boolean", description: "Boolean attribute." },
    { name: "loading", type: "boolean", description: "Boolean attribute." },
    {
      name: "full-width",
      type: "boolean",
      description: "Kebab-case on Web Component.",
    },
    { name: "compact", type: "boolean", description: "Boolean attribute." },
    { name: "href", type: "string", description: "Link destination." },
  ],
  events: [
    {
      name: "viking-press",
      type: "CustomEvent<MouseEvent>",
      description: "Fired on click when not disabled.",
    },
  ],
  cssClasses: [
    {
      name: "viking-btn",
      type: "class",
      description: "Base button class for static HTML.",
    },
    {
      name: "viking-btn-primary",
      type: "class",
      description: "Primary action variant.",
    },
    {
      name: "viking-btn-secondary",
      type: "class",
      description: "Secondary emphasis.",
    },
    {
      name: "viking-btn-outline",
      type: "class",
      description: "Bordered neutral variant.",
    },
    {
      name: "viking-btn-danger",
      type: "class",
      description: "Destructive action.",
    },
    {
      name: "viking-btn-compact",
      type: "class",
      description: "Reduced padding.",
    },
    { name: "viking-btn-full", type: "class", description: "Full width." },
  ],
};

export const INPUT_API: ComponentApi = {
  inputs: [
    {
      name: "type",
      type: "string",
      default: "'text'",
      description: "Native input type attribute.",
    },
    { name: "placeholder", type: "string", description: "Placeholder text." },
    {
      name: "disabled",
      type: "boolean",
      default: "false",
      description: "Disables the control.",
    },
    {
      name: "readonly",
      type: "boolean",
      default: "false",
      description: "Read-only state.",
    },
    {
      name: "clearable",
      type: "boolean",
      default: "false",
      description: "Shows clear button when value is present.",
    },
  ],
  attributes: [
    { name: "placeholder", type: "string", description: "Placeholder text." },
    {
      name: "type",
      type: "string",
      default: "text",
      description: "Input type.",
    },
    { name: "clearable", type: "boolean", description: "Boolean attribute." },
    { name: "disabled", type: "boolean", description: "Boolean attribute." },
    { name: "name", type: "string", description: "Form field name." },
  ],
  cssClasses: [
    {
      name: "viking-input-shell",
      type: "class",
      description: "Wrapper with machined border and focus ring.",
    },
    {
      name: "viking-input-native",
      type: "class",
      description: "Native input element inside shell.",
    },
  ],
};

export const BADGE_API: ComponentApi = {
  inputs: [
    {
      name: "tone",
      type: "VikingTone",
      default: "'default'",
      description: "Semantic color tone.",
    },
    {
      name: "size",
      type: "VikingSize",
      default: "'base'",
      description: "xs | sm | base.",
    },
    {
      name: "icon",
      type: "VikingIconName | null",
      description: "Leading status icon.",
    },
    {
      name: "removable",
      type: "boolean",
      default: "false",
      description: "Shows remove button; emits removed.",
    },
  ],
  outputs: [
    {
      name: "removed",
      type: "void",
      description: "Emits when remove button is clicked.",
    },
  ],
  attributes: [
    {
      name: "tone",
      type: "accent | secondary | success | warning | danger | info | muted",
      description: "Semantic tone on Web Component.",
    },
    { name: "size", type: "sm", description: "Compact badge density." },
    { name: "icon", type: "string", description: "Viking icon registry name." },
    { name: "removable", type: "boolean", description: "Boolean attribute." },
  ],
  events: [
    {
      name: "viking-removed",
      type: "CustomEvent<void>",
      description: "Fired when remove is clicked.",
    },
  ],
  cssClasses: [
    {
      name: "viking-badge",
      type: "class",
      description: "Default badge styling in static CSS.",
    },
    {
      name: "viking-badge-accent",
      type: "class",
      description: "Accent tone modifier.",
    },
    {
      name: "viking-badge-success",
      type: "class",
      description: "Success tone modifier.",
    },
    {
      name: "viking-badge-warning",
      type: "class",
      description: "Warning tone modifier.",
    },
    {
      name: "viking-badge-danger",
      type: "class",
      description: "Danger tone modifier.",
    },
  ],
};

export const CARD_API: ComponentApi = {
  inputs: [
    {
      name: "compact",
      type: "boolean",
      default: "false",
      description: "Reduced padding via viking-card-compact.",
    },
    {
      name: "interactive",
      type: "boolean",
      default: "false",
      description: "Hover lift for clickable cards.",
    },
  ],
  attributes: [
    {
      name: "compact",
      type: "boolean",
      description: "Applies viking-card-compact on light DOM host.",
    },
    {
      name: "interactive",
      type: "boolean",
      description: "Hover lift modifier.",
    },
    {
      name: "title",
      type: "string",
      description: "Accessible region label when set.",
    },
  ],
  cssClasses: [
    {
      name: "viking-card",
      type: "class",
      description: "Machined surface panel with inset hairline.",
    },
    {
      name: "viking-card-compact",
      type: "class",
      description: "Compact padding modifier.",
    },
    {
      name: "viking-card-header",
      type: "class",
      description: "Structured header region.",
    },
    {
      name: "viking-metric-card",
      type: "class",
      description: "KPI metric surface variant.",
    },
  ],
};

export const CALLOUT_API: ComponentApi = {
  inputs: [
    {
      name: "tone",
      type: "VikingTone",
      default: "'info'",
      description: "info | warning | success | danger.",
    },
    {
      name: "icon",
      type: "VikingIconName",
      description: "Leading icon — required for a11y when tone conveys status.",
    },
    { name: "title", type: "string", description: "Bold callout heading." },
  ],
  attributes: [
    {
      name: "tone",
      type: "VikingTone",
      default: "info",
      description: "Semantic tone.",
    },
    {
      name: "heading",
      type: "string",
      description: "Bold callout title (Web Component).",
    },
    {
      name: "icon",
      type: "string",
      description: "Override icon from Viking registry.",
    },
    {
      name: "dismissible",
      type: "boolean",
      description: "Shows dismiss control.",
    },
  ],
  events: [
    {
      name: "viking-close",
      type: "CustomEvent<void>",
      description: "Fired when callout is dismissed.",
    },
  ],
  cssClasses: [
    {
      name: "showcase-callout",
      type: "class",
      description: "Base callout container.",
    },
    {
      name: "showcase-callout-info",
      type: "class",
      description: "Informational tone.",
    },
    {
      name: "showcase-callout-warning",
      type: "class",
      description: "Warning tone.",
    },
  ],
};

export const CHART_API: ComponentApi = {
  inputs: [
    {
      name: "kind",
      type: "VikingChartKind",
      default: "'line'",
      description: "line | area | bar | donut | sparkline.",
    },
    {
      name: "data",
      type: "number[] | VikingChartSeries[]",
      description: "Series data points.",
    },
    {
      name: "tone",
      type: "string",
      default: "'primary'",
      description: "Maps to --viking-series-* tokens.",
    },
    {
      name: "height",
      type: "number",
      default: "120",
      description: "SVG viewport height in px (token-aligned).",
    },
    {
      name: "curve",
      type: "VikingChartCurve",
      default: "'smooth'",
      description: "linear | smooth | step.",
    },
  ],
};

export const MODAL_API: ComponentApi = {
  inputs: [
    {
      name: "open",
      type: "boolean",
      default: "false",
      description: "Controls visibility.",
    },
    {
      name: "title",
      type: "string",
      description: "Dialog title for aria-labelledby.",
    },
    {
      name: "size",
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      description: "Dialog width preset.",
    },
    {
      name: "dismissible",
      type: "boolean",
      default: "true",
      description: "Allow Escape and overlay click to close.",
    },
  ],
  outputs: [
    {
      name: "openChange",
      type: "boolean",
      description: "Two-way binding for open state.",
    },
    {
      name: "closed",
      type: "void",
      description: "Emits after close animation.",
    },
  ],
  attributes: [
    { name: "open", type: "boolean", description: "Shows the native dialog." },
    {
      name: "title",
      type: "string",
      description: "Dialog title / aria-label.",
    },
    {
      name: "dismissible",
      type: "boolean",
      default: "true",
      description: "Escape + backdrop dismiss.",
    },
  ],
  events: [
    {
      name: "viking-close",
      type: "CustomEvent<void>",
      description: "Fired when dialog closes.",
    },
  ],
};

export const SELECT_API: ComponentApi = {
  attributes: [
    { name: "label", type: "string", description: "Visible field label." },
    {
      name: "name",
      type: "string",
      description: "Form field name (ElementInternals).",
    },
    { name: "value", type: "string", description: "Selected option value." },
    {
      name: "placeholder",
      type: "string",
      description: "Placeholder option when empty.",
    },
    {
      name: "description",
      type: "string",
      description: "Helper text below control.",
    },
    {
      name: "error",
      type: "string",
      description: "Validation message; sets aria-invalid.",
    },
    {
      name: "width",
      type: "full | half",
      default: "half",
      description: "Field width preset.",
    },
    { name: "disabled", type: "boolean", description: "Disables the control." },
    { name: "required", type: "boolean", description: "Required field." },
  ],
  events: [
    {
      name: "viking-change",
      type: "CustomEvent<{ value: string }>",
      description: "Fired when selection changes.",
    },
  ],
  cssClasses: [
    {
      name: "viking-select-native",
      type: "class",
      description: "Static HTML native select styling.",
    },
  ],
};

export const SEARCH_PALETTE_API: ComponentApi = {
  inputs: [
    {
      name: "open",
      type: "boolean",
      default: "false",
      description: "Two-way model — shows the command palette overlay.",
    },
    {
      name: "query",
      type: "string",
      default: "''",
      description: "Two-way model — current search query.",
    },
    {
      name: "placeholder",
      type: "string",
      default: "'Search...'",
      description: "Search input placeholder.",
    },
    {
      name: "context",
      type: "SiteDrakkarContext",
      default: "'app'",
      description: "Suite wrapper only — app | marketing | backend | docs.",
    },
    {
      name: "urls",
      type: "SiteUrls",
      description:
        "Suite wrapper only — override default suite URLs for buildSuiteSearchItems().",
    },
    {
      name: "bindShortcut",
      type: "boolean",
      default: "true",
      description: "Suite wrapper only — bind ⌘K / Ctrl+K globally.",
    },
  ],
  outputs: [
    {
      name: "paletteKeydown",
      type: "KeyboardEvent",
      description:
        "Angular primitive — keyboard events from the results body (arrow/Enter navigation).",
    },
  ],
  attributes: [
    {
      name: "open",
      type: "boolean",
      description: "Shows the command palette overlay.",
    },
    {
      name: "global-shortcut",
      type: "boolean",
      description: "Bind ⌘K / Ctrl+K to toggle open/close.",
    },
    {
      name: "placeholder",
      type: "string",
      description: "Search input placeholder.",
    },
    {
      name: "items",
      type: "JSON",
      description:
        "Array of { title, href, snippet?, group?, keywords?, action? }.",
    },
  ],
  events: [
    {
      name: "viking-close",
      type: "CustomEvent<void>",
      description: "Palette closed.",
    },
    {
      name: "viking-query",
      type: "CustomEvent<{ query: string }>",
      description: "Search query changed.",
    },
    {
      name: "viking-select",
      type: "CustomEvent<{ item: object }>",
      description: "Result activated (before navigation).",
    },
  ],
  cssClasses: [
    {
      name: "viking-search-palette",
      type: "class",
      description: "Modal panel shell — machined border + inset hairline.",
    },
    {
      name: "viking-search-palette-header",
      type: "class",
      description: "Search input row with focus accent underline.",
    },
    {
      name: "viking-search-palette-body",
      type: "class",
      description: "Scrollable results region.",
    },
    {
      name: "viking-search-palette-footer",
      type: "class",
      description: "Keyboard shortcut hints row.",
    },
    {
      name: "viking-search-result",
      type: "class",
      description: "Selectable result row; add .is-selected for active state.",
    },
    {
      name: "viking-search-result-title",
      type: "class",
      description: "Primary result label.",
    },
    {
      name: "viking-search-result-snippet",
      type: "class",
      description: "Secondary muted description.",
    },
    {
      name: "viking-search-group-label",
      type: "class",
      description: "Uppercase group heading above result clusters.",
    },
    {
      name: "viking-search-empty",
      type: "class",
      description: "Empty / no-results state container.",
    },
  ],
};

export const SUITE_SEARCH_PALETTE_API: ComponentApi = {
  inputs: [
    {
      name: "context",
      type: "SiteDrakkarContext",
      default: "auto",
      description:
        "Surface: app | marketing | backend | docs — auto-detected from data-deml-context or hostname when omitted.",
    },
    {
      name: "urls",
      type: "SiteUrls",
      description: "Angular wrapper — override default suite URLs.",
    },
    {
      name: "placeholder",
      type: "string",
      default: "'Search documentation, dashboard, settings…'",
      description: "Search input placeholder.",
    },
    {
      name: "bindShortcut",
      type: "boolean",
      default: "true",
      description: "Angular wrapper — bind ⌘K / Ctrl+K globally.",
    },
  ],
  attributes: [
    {
      name: "context",
      type: "string",
      description: "Surface: app | marketing | backend | docs.",
    },
    {
      name: "app-url",
      type: "string",
      description: "Override deml.app origin.",
    },
    {
      name: "marketing-url",
      type: "string",
      description: "Override marketing site origin.",
    },
    {
      name: "backend-url",
      type: "string",
      description: "Override backend API origin.",
    },
    {
      name: "global-shortcut",
      type: "boolean",
      default: "true",
      description: "Bind ⌘K / Ctrl+K to toggle open/close.",
    },
    {
      name: "placeholder",
      type: "string",
      description: "Search input placeholder.",
    },
  ],
  methods: [
    {
      name: "openPalette()",
      description: "Programmatically open the command palette.",
    },
    {
      name: "closePalette()",
      description: "Programmatically close the command palette.",
    },
  ],
  cssClasses: SEARCH_PALETTE_API.cssClasses,
};

export const CARD_TITLE_API: ComponentApi = {
  inputs: [
    {
      name: "icon",
      type: "VikingIconName",
      description: "Leading icon rendered inside viking-icon-badge.",
    },
    {
      name: "tone",
      type: "VikingIconBadgeTone",
      default: "'default'",
      description: "Badge tone: default | success | warning | danger | info.",
    },
    {
      name: "level",
      type: "1 | 2 | 3 | 4",
      default: "2",
      description: "Heading aria-level for viking-heading.",
    },
    {
      name: "size",
      type: "'sm' | 'base' | 'lg' | 'xl'",
      default: "'xl'",
      description: "Heading size preset.",
    },
    {
      name: "iconSize",
      type: "number",
      default: "20",
      description: "Icon badge pixel size.",
    },
  ],
  cssClasses: [
    {
      name: "viking-card-title",
      type: "class",
      description:
        "Flex row with icon badge + heading — use inside viking-card-header.",
    },
  ],
};

export const COMMAND_API: ComponentApi = {
  inputs: [
    {
      name: "items",
      type: "VikingCommandItem[]",
      description: "Grouped command entries with optional icon and kbd hint.",
    },
    {
      name: "open",
      type: "boolean",
      default: "false",
      description: "Controls palette visibility.",
    },
    {
      name: "placeholder",
      type: "string",
      default: "'Type a command or search…'",
      description: "Search field placeholder.",
    },
  ],
  outputs: [
    {
      name: "openChange",
      type: "boolean",
      description: "Two-way binding for open state.",
    },
    {
      name: "executed",
      type: "VikingCommandItem",
      description: "Emits when a command is chosen.",
    },
  ],
};

export const SWITCH_API: ComponentApi = {
  inputs: [
    {
      name: "checked",
      type: "boolean",
      default: "false",
      description: "Toggle state.",
    },
    {
      name: "disabled",
      type: "boolean",
      default: "false",
      description: "Disables interaction.",
    },
    { name: "label", type: "string", description: "Accessible label text." },
  ],
  outputs: [
    { name: "checkedChange", type: "boolean", description: "Emits on toggle." },
  ],
};

export const TOAST_API: ComponentApi = {
  inputs: [
    { name: "message", type: "string", description: "Toast body text." },
    {
      name: "tone",
      type: "VikingTone",
      default: "'default'",
      description: "Semantic tone for icon + border.",
    },
    {
      name: "duration",
      type: "number",
      default: "5000",
      description: "Auto-dismiss ms; 0 for persistent.",
    },
  ],
};

export const ICON_API: ComponentApi = {
  inputs: [
    {
      name: "name",
      type: "VikingIconName",
      description: "Icon from the zero-dep SVG registry.",
    },
    {
      name: "size",
      type: "number | VikingIconSizePreset",
      default: "22",
      description: "Pixel size or preset: xs | sm | md | lg.",
    },
    {
      name: "color",
      type: "VikingIconColorToken",
      description: "Semantic color token alias.",
    },
    {
      name: "spin",
      type: "boolean",
      default: "false",
      description: "Rotation animation for loaders.",
    },
  ],
};

export const COMPONENT_API_MAP: Record<string, ComponentApi> = {
  button: BUTTON_API,
  input: INPUT_API,
  badge: BADGE_API,
  card: CARD_API,
  "card-title": CARD_TITLE_API,
  "field-stack": FIELD_API,
  callout: CALLOUT_API,
  chart: CHART_API,
  modal: MODAL_API,
  select: SELECT_API,
  "search-palette": SEARCH_PALETTE_API,
  "suite-search-palette": SUITE_SEARCH_PALETTE_API,
  command: COMMAND_API,
  switch: SWITCH_API,
  toast: TOAST_API,
  icon: ICON_API,
};

export const getComponentApi = (id: string): ComponentApi | undefined =>
  COMPONENT_API_MAP[id];
