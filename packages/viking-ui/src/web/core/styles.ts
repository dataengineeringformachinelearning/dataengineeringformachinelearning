/**
 * Shadow DOM styles for Viking-UI Web Components.
 * All values reference --viking-* tokens inherited from the document :root.
 */

export const VIKING_BUTTON_STYLES = `
/* Host is a transparent layout shell — never paint button chrome on the host
   (that creates a visual/semantic "button in a button" with the inner control). */
:host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--viking-font-family);
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  min-height: 0;
  min-width: 0;
  color: inherit;
  cursor: default;
}

:host::before,
:host::after {
  display: none !important;
  content: none !important;
}

:host([full-width]) {
  display: flex;
  width: 100%;
}

:host([full-width]) .viking-btn {
  width: 100%;
  min-width: 0;
}

:host([compact]) .viking-btn {
  min-width: 0;
}

:host([square]) {
  flex: 0 0 auto;
}

.viking-btn {
  --viking-btn-depth-shadow:
    var(--viking-shadow-sm),
    inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 7%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--viking-black) 18%, transparent);
  --viking-btn-hover-shadow: var(--viking-shadow-hover);
  --viking-btn-press-shadow:
    inset 0 1px 3px color-mix(in srgb, var(--viking-black) 34%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--viking-white-pure) 3%, transparent),
    var(--viking-shadow-xs);

  font-family: inherit;
  font-size: var(--viking-font-size-ui, var(--viking-font-size-sm));
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-wide);
  line-height: var(--viking-line-height-snug);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-2);
  min-height: var(--viking-control-height);
  padding: var(--viking-space-0-5) var(--viking-control-padding-x);
  border-radius: var(--viking-button-radius, var(--viking-radius-lg));
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: var(--viking-transition-interactive);
  width: auto;
  min-width: var(--viking-btn-min-width, 120px);
  white-space: nowrap;
  position: relative;
  background-clip: padding-box;
  isolation: isolate;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: var(--viking-btn-depth-shadow);
}

.viking-btn::before {
  content: "";
  position: absolute;
  inset: 1px 1px auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--viking-metallic-100) 58%, transparent),
    transparent
  );
  pointer-events: none;
  opacity: 0.88;
  transition: var(--viking-transition-interactive);
}

.viking-btn:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
  z-index: 1;
}

.viking-btn:disabled,
.viking-btn[aria-busy='true'] {
  opacity: var(--viking-state-disabled-opacity);
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.viking-btn[aria-busy='true'] {
  cursor: wait;
}

.viking-btn[aria-busy='true']:not(.viking-btn-square) {
  min-width: var(
    --viking-btn-loading-min-width,
    var(--viking-btn-min-width, 120px)
  );
}

.viking-btn[aria-busy='true']::before,
.viking-btn[aria-busy='true'] .viking-btn-label {
  opacity: 0.78;
  transform: translateY(1px);
}

.viking-btn[aria-busy='true'] .viking-btn-spinner {
  opacity: 0.85;
}

.viking-btn::after {
  content: "";
  position: absolute;
  inset: auto 0 0 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(
      in srgb,
      var(--viking-metallic-100) 24%,
      transparent
    ),
    transparent
  );
  pointer-events: none;
  opacity: 0.45;
  transition: var(--viking-transition-interactive);
}

.viking-btn-sm {
  min-height: var(--viking-control-height-sm);
  padding: 0 var(--viking-space-2);
  font-size: var(--viking-font-size-xs);
  min-width: auto;
}

.viking-btn-xs {
  min-height: var(--viking-control-height-xs);
  padding: 0 var(--viking-space-2);
  font-size: var(--viking-font-size-xs);
  min-width: auto;
}

.viking-btn-square {
  display: inline-grid;
  place-items: center;
  width: var(--viking-control-height);
  min-width: var(--viking-control-height);
  max-width: var(--viking-control-height);
  height: var(--viking-control-height);
  min-height: var(--viking-control-height);
  padding: 0;
  line-height: 1;
}

.viking-btn-square.viking-btn-sm {
  width: var(--viking-control-height-sm);
  min-width: var(--viking-control-height-sm);
  max-width: var(--viking-control-height-sm);
  height: var(--viking-control-height-sm);
  min-height: var(--viking-control-height-sm);
}

.viking-btn-square.viking-btn-xs {
  width: var(--viking-control-height-xs);
  min-width: var(--viking-control-height-xs);
  max-width: var(--viking-control-height-xs);
  height: var(--viking-control-height-xs);
  min-height: var(--viking-control-height-xs);
}

.viking-btn-square .viking-btn-label {
  display: inline-grid;
  place-items: center;
  width: 100%;
  height: 100%;
  line-height: 1;
}

.viking-btn-square ::slotted(*) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  line-height: 1;
}

.viking-btn-square ::slotted(svg),
.viking-btn-square ::slotted([data-viking-icon]) {
  width: var(--viking-icon-size-md, 20px);
  height: var(--viking-icon-size-md, 20px);
}

::slotted(viking-icon),
::slotted(.viking-icon),
::slotted([data-viking-icon]) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--viking-icon-size-md);
  height: var(--viking-icon-size-md);
  line-height: 1;
  flex-shrink: 0;
  pointer-events: none;
  flex: 0 0 auto;
  margin-block: calc(var(--viking-space-0-5) * -1);
  align-self: center;
}

.viking-btn-outline {
  background: var(--viking-surface-recipe, var(--viking-surface));
  color: var(--viking-text);
  border-color: var(--viking-border-strong);
  box-shadow: var(--viking-btn-depth-shadow);
}

.viking-btn-outline:hover:not(:disabled):not([aria-busy='true']) {
  background: color-mix(in srgb, var(--viking-accent) 5%, var(--viking-surface-alt));
  border-color: color-mix(in srgb, var(--viking-accent) 45%, var(--viking-border-strong));
  box-shadow: var(--viking-btn-hover-shadow);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-outline:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  box-shadow: var(--viking-btn-press-shadow);
  border-color: var(--viking-border-strong);
}

.viking-btn-primary {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--viking-white-pure) 12%, transparent) 0%,
      transparent 42%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--viking-electric-300) 18%, transparent) 0%,
      transparent 55%
    ),
    var(--viking-accent);
  color: var(--viking-accent-content);
  border-color: color-mix(in srgb, var(--viking-accent) 82%, var(--viking-black));
  box-shadow:
    var(--viking-btn-depth-shadow),
    inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 12%, transparent);
}

.viking-btn-primary:hover:not(:disabled):not([aria-busy='true']) {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--viking-white-pure) 16%, transparent) 0%,
      transparent 44%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--viking-electric-200) 20%, transparent) 0%,
      transparent 58%
    ),
    var(--viking-accent-hover);
  border-color: var(--viking-accent-hover);
  box-shadow: var(--viking-btn-hover-shadow);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-primary:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  box-shadow: var(--viking-btn-press-shadow);
  border-color: color-mix(in srgb, var(--viking-accent) 82%, var(--viking-black));
}

.viking-btn-secondary {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--viking-white-pure) 11%, transparent) 0%,
      transparent 42%
    ),
    var(--viking-accent-secondary);
  color: var(--viking-accent-secondary-content);
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 82%, var(--viking-black));
  box-shadow:
    var(--viking-btn-depth-shadow),
    inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 10%, transparent);
}

.viking-btn-secondary:hover:not(:disabled):not([aria-busy='true']) {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--viking-white-pure) 14%, transparent) 0%,
      transparent 44%
    ),
    var(--viking-accent-secondary-hover);
  border-color: var(--viking-accent-secondary-hover);
  box-shadow: var(--viking-btn-hover-shadow);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-secondary:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  box-shadow: var(--viking-btn-press-shadow);
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 82%, var(--viking-black));
}

.viking-btn-filled {
  background: var(--viking-surface-recipe-muted, var(--viking-surface-alt));
  color: var(--viking-text);
  border-color: var(--viking-border);
  box-shadow: var(--viking-shadow-xs);
}

.viking-btn-filled:hover:not(:disabled):not([aria-busy='true']) {
  border-color: color-mix(in srgb, var(--viking-accent) 45%, var(--viking-border));
  background: color-mix(in srgb, var(--viking-accent) 8%, var(--viking-surface-alt));
  box-shadow: var(--viking-btn-hover-shadow);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-filled:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  box-shadow: var(--viking-btn-press-shadow);
  border-color: color-mix(in srgb, var(--viking-accent) 20%, var(--viking-border));
  background: color-mix(in srgb, var(--viking-surface-alt) 84%, var(--viking-accent));
}

.viking-btn-danger {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--viking-white-pure) 10%, transparent) 0%,
      transparent 42%
    ),
    var(--viking-danger);
  color: var(--viking-on-danger);
  border-color: color-mix(in srgb, var(--viking-danger) 85%, var(--viking-black));
  box-shadow:
    var(--viking-btn-depth-shadow),
    inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 10%, transparent);
}

.viking-btn-danger:hover:not(:disabled):not([aria-busy='true']) {
  background: color-mix(in srgb, var(--viking-danger) 88%, var(--viking-white));
  border-color: color-mix(in srgb, var(--viking-danger) 92%, var(--viking-white));
  box-shadow: var(--viking-btn-hover-shadow);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-danger:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  border-color: color-mix(in srgb, var(--viking-danger) 72%, var(--viking-black));
  background: color-mix(in srgb, var(--viking-danger) 84%, var(--viking-black));
  box-shadow: var(--viking-btn-press-shadow);
}

.viking-btn-ghost {
  background: transparent;
  color: var(--viking-text);
  min-width: auto;
  box-shadow: none;
  border-color: transparent;
}

.viking-btn-ghost:hover:not(:disabled):not([aria-busy='true']) {
  background: var(--viking-accent-soft);
  color: var(--viking-accent-strong);
  border-color: var(--viking-border-subtle);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 5%, transparent);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-ghost:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  background: var(--viking-accent-soft);
  color: var(--viking-accent-strong);
}

.viking-btn-subtle {
  background: transparent;
  color: var(--viking-text-muted);
  border-color: var(--viking-border-subtle);
  min-width: auto;
  box-shadow: none;
}

.viking-btn-subtle:hover:not(:disabled):not([aria-busy='true']) {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
  border-color: var(--viking-border-strong);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 5%, transparent);
}

.viking-btn-subtle:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  border-color: var(--viking-border);
  background: color-mix(in srgb, var(--viking-accent-soft) 70%, var(--viking-surface));
  box-shadow: inset 0 1px 2px color-mix(in srgb, var(--viking-black) 24%, transparent);
}

.viking-btn:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
}

.viking-btn-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  line-height: 1.2;
  min-height: var(--viking-icon-size-md);
  min-width: 0;
  text-align: center;
  white-space: nowrap;
}

.viking-btn-label ::slotted(*) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  line-height: 1;
}

.viking-btn-label ::slotted([data-viking-icon]),
.viking-btn-label ::slotted(svg),
.viking-btn-label ::slotted(viking-icon) {
  width: var(--viking-icon-size-md);
  height: var(--viking-icon-size-md);
}

.viking-btn-spinner {
  flex: 0 0 auto;
  width: var(--viking-icon-size-sm, 18px);
  height: var(--viking-icon-size-sm, 18px);
  aspect-ratio: 1;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--viking-radius-pill);
  animation: viking-spin 0.8s linear infinite;
  margin-inline-end: var(--viking-space-0-5);
}

@keyframes viking-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .viking-btn-spinner { animation-duration: 0.01ms; }
  .viking-btn { transition-duration: 0.01ms; }
}
`;

export const VIKING_INPUT_STYLES = `
:host {
  display: block;
  font-family: var(--viking-font-family);
}

.viking-input-shell {
  display: flex;
  align-items: center;
  gap: var(--viking-space-1);
  min-height: var(--viking-control-height);
  padding: 0 var(--viking-control-padding-x);
  font-family: inherit;
  font-size: var(--viking-font-size);
  color: var(--viking-text);
  background: var(--viking-surface-recipe-muted, var(--viking-surface-alt));
  border: 1px solid color-mix(in srgb, var(--viking-border-strong) 68%, var(--viking-border));
  border-radius: var(--viking-radius-md);
  box-shadow:
    var(--viking-shadow-xs),
    inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 4%, transparent);
  transition: var(--viking-transition-interactive);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.viking-input-shell:hover:not(.viking-disabled):not(.viking-loading) {
  border-color: color-mix(in srgb, var(--viking-accent) 35%, var(--viking-border-strong));
  box-shadow: var(--viking-shadow-sm);
}

.viking-input-shell:focus-within:not(.viking-loading) {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
  border-color: var(--viking-accent);
  box-shadow:
    var(--viking-shadow-sm),
    0 0 0 1px color-mix(in srgb, var(--viking-accent) 22%, transparent);
}

.viking-input-shell.viking-disabled,
.viking-input-shell.viking-loading {
  opacity: var(--viking-state-disabled-opacity);
}

.viking-input-shell.viking-loading {
  cursor: wait;
}

.viking-input-native {
  flex: 1;
  min-width: 0;
  width: 100%;
  border: none;
  outline: none !important;
  background: transparent;
  color: var(--viking-text);
  font-family: inherit;
  font-size: inherit;
  padding: 0;
}

.viking-input-native::placeholder {
  color: var(--viking-text-muted);
}

input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none !important;
  background: transparent;
  color: var(--viking-text);
  font-family: inherit;
  font-size: inherit;
  padding: 0;
}

input::placeholder {
  color: var(--viking-text-muted);
}

input:disabled {
  cursor: not-allowed;
}

.viking-input-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  padding: var(--viking-space-0-5);
  border-radius: var(--viking-radius-pill);
  transition: var(--viking-transition-interactive);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.viking-input-clear:hover {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
}

.viking-input-clear:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-input-spinner {
  width: 1rem;
  height: 1rem;
  aspect-ratio: 1;
  border: 2px solid var(--viking-text-muted);
  border-right-color: transparent;
  border-radius: var(--viking-radius-pill);
  animation: viking-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes viking-spin {
  to { transform: rotate(360deg); }
}
`;

export const VIKING_FIELD_STYLES = `
:host {
  display: block;
  font-family: var(--viking-font-family);
  color: var(--viking-text);
  min-width: 0;
}

:host([hidden]) {
  display: none;
}

:host([width='full']) {
  width: 100%;
}

:host([width='half']) {
  width: 100%;
  max-width: var(--viking-select-half-max-width, min(100%, 24rem));
}

.viking-field {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-2);
}

.viking-field-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--viking-space-2);
  margin-bottom: var(--viking-space-0-5);
}

.viking-field-label {
  display: inline-flex;
  align-items: center;
  gap: var(--viking-space-0-5);
  font-size: var(--viking-font-size-ui);
  font-weight: var(--viking-font-weight-bold);
  color: var(--viking-text);
  line-height: var(--viking-line-height-snug);
  cursor: pointer;
  margin: 0 0 var(--viking-space-1);
}

.viking-field-required {
  color: var(--viking-danger-text);
}

.viking-field-control {
  min-width: 0;
}

.viking-field-description,
.viking-field-error {
  margin: 0;
  font-size: var(--viking-font-size-xs);
  line-height: var(--viking-line-height-relaxed);
}

.viking-field-description {
  color: var(--viking-text-muted);
}

.viking-field-error {
  color: var(--viking-danger-text);
}
`;

export const VIKING_BADGE_STYLES = `
:host {
  display: inline-flex;
  align-items: center;
  gap: var(--viking-space-0-5);
  padding: var(--viking-space-0-5) var(--viking-space-1);
  font-family: var(--viking-font-family);
  font-size: var(--viking-font-size-xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-wide);
  line-height: var(--viking-line-height-snug);
  border-radius: var(--viking-radius-pill);
  border: 1px solid var(--viking-border);
  background: var(--viking-surface-alt);
  color: var(--viking-text);
  white-space: nowrap;
  transition: var(--viking-transition-interactive);
  box-shadow: var(--viking-shadow-xs);
}

:host([size='sm']) {
  padding: 0 var(--viking-space-1);
  font-size: var(--viking-font-size-2xs);
}

:host([tone='accent']) {
  background: var(--viking-accent);
  border-color: color-mix(in srgb, var(--viking-accent) 80%, var(--viking-black));
  color: var(--viking-accent-content);
  box-shadow: var(--viking-shadow-sm);
}

:host([tone='secondary']) {
  background: color-mix(in srgb, var(--viking-accent-secondary) 16%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 55%, transparent);
  color: var(--viking-accent-secondary);
}

:host([tone='success']) {
  background: color-mix(in srgb, var(--viking-success) 16%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-success) 55%, transparent);
  color: var(--viking-success);
}

:host([tone='warning']) {
  background: color-mix(in srgb, var(--viking-warning) 18%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-warning) 55%, transparent);
  color: var(--viking-warning);
}

:host([tone='danger']) {
  background: color-mix(in srgb, var(--viking-danger) 14%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-danger) 50%, transparent);
  color: var(--viking-danger-text);
}

:host([tone='info']) {
  background: color-mix(in srgb, var(--viking-info) 14%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-info) 50%, transparent);
  color: var(--viking-info);
}

:host([tone='muted']),
:host([tone='subtle']) {
  color: var(--viking-text-muted);
  background: var(--viking-surface);
  border-color: var(--viking-border-subtle);
}

.viking-wc-icon {
  flex-shrink: 0;
}

.viking-badge-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  padding: var(--viking-space-0-5);
  border-radius: var(--viking-radius-pill);
  transition: var(--viking-transition-interactive);
  margin-left: calc(var(--viking-space-0-5) * -1);
}

.viking-badge-remove:hover {
  background: color-mix(in srgb, currentColor 12%, transparent);
}

.viking-badge-remove:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}
`;

export const VIKING_CALLOUT_STYLES = `
:host {
  display: block;
  font-family: var(--viking-font-family);
}

:host([hidden]) {
  display: none;
}

.viking-callout {
  display: flex;
  align-items: flex-start;
  gap: var(--viking-space-2);
  padding: var(--viking-space-2);
  border-radius: var(--viking-radius-lg);
  border: 1px solid var(--viking-border);
  border-left-width: 3px;
  background: var(--viking-surface-alt);
  color: var(--viking-text);
  font-size: var(--viking-font-size-sm);
  box-shadow: var(--viking-shadow-sm);
}

.viking-callout-icon {
  flex-shrink: 0;
  margin-top: var(--viking-space-0-5);
  color: var(--viking-text-muted);
}

.viking-callout-body {
  flex: 1;
  min-width: 0;
}

.viking-callout-heading {
  margin: 0 0 var(--viking-space-0-5);
  font-size: var(--viking-font-size-ui);
  font-weight: var(--viking-font-weight-bold);
  color: var(--viking-text);
}

.viking-callout-text {
  margin: 0;
  color: var(--viking-text);
  line-height: var(--viking-line-height-relaxed);
}

.viking-callout-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  padding: var(--viking-space-0-5);
  border-radius: var(--viking-radius);
  transition: var(--viking-transition-interactive);
  flex-shrink: 0;
}

.viking-callout-close:hover {
  color: var(--viking-text);
  background: color-mix(in srgb, currentColor 8%, transparent);
}

.viking-callout-close:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-callout-accent {
  border-color: var(--viking-accent);
  border-left-color: var(--viking-accent);
  background: var(--viking-accent-soft);
}

.viking-callout-accent .viking-callout-icon {
  color: var(--viking-accent);
}

.viking-callout-secondary {
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 45%, transparent);
  border-left-color: var(--viking-accent-secondary);
  background: var(--viking-accent-secondary-soft);
}

.viking-callout-secondary .viking-callout-icon {
  color: var(--viking-accent-secondary);
}

.viking-callout-info {
  border-color: color-mix(in srgb, var(--viking-info) 45%, transparent);
  border-left-color: var(--viking-info);
  background: color-mix(in srgb, var(--viking-info) 10%, var(--viking-surface));
}

.viking-callout-info .viking-callout-icon {
  color: var(--viking-info);
}

.viking-callout-success {
  border-color: color-mix(in srgb, var(--viking-success) 45%, transparent);
  border-left-color: var(--viking-success);
  background: color-mix(in srgb, var(--viking-success) 10%, var(--viking-surface));
}

.viking-callout-success .viking-callout-icon {
  color: var(--viking-success);
}

.viking-callout-warning {
  border-color: color-mix(in srgb, var(--viking-warning) 45%, transparent);
  border-left-color: var(--viking-warning);
  background: color-mix(in srgb, var(--viking-warning) 12%, var(--viking-surface));
}

.viking-callout-warning .viking-callout-icon {
  color: var(--viking-warning);
}

.viking-callout-danger {
  border-color: var(--viking-danger);
  border-left-color: var(--viking-danger);
  background: color-mix(in srgb, var(--viking-crimson-600) 22%, var(--viking-surface));
  color: var(--viking-white);
}

.viking-callout-danger .viking-callout-icon {
  color: var(--viking-crimson-400);
}

.viking-callout-danger .viking-callout-text {
  color: var(--viking-white);
}
`;

export const VIKING_SELECT_STYLES = `
:host {
  display: block;
  font-family: var(--viking-font-family);
  min-width: 0;
}

:host([width='full']) {
  width: 100%;
}

:host([width='half']) {
  width: 100%;
  max-width: var(--viking-select-half-max-width, min(100%, 24rem));
}

.viking-field {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-1);
}

.viking-field-label {
  font-size: var(--viking-font-size-ui);
  font-weight: var(--viking-font-weight-bold);
  color: var(--viking-text);
}

.viking-field-description {
  margin: 0;
  font-size: var(--viking-font-size-xs);
  color: var(--viking-text-muted);
}

.viking-field-error {
  margin: 0;
  font-size: var(--viking-font-size-xs);
  color: var(--viking-danger);
}

.viking-select-native {
  width: 100%;
  min-height: var(--viking-control-height);
  padding: 0 var(--viking-space-2);
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius);
  background: var(--viking-surface);
  color: var(--viking-text);
  font-family: inherit;
  font-size: var(--viking-font-size);
  cursor: pointer;
  transition: var(--viking-transition-interactive);
  box-shadow: var(--viking-shadow-sm);
}

.viking-select-native:hover:not(:disabled) {
  border-color: var(--viking-accent-strong);
  box-shadow: var(--viking-shadow-md);
}

.viking-select-native:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-select-native:disabled {
  opacity: var(--viking-state-disabled-opacity);
  cursor: not-allowed;
}

.viking-select-native[aria-invalid='true'] {
  border-color: var(--viking-danger);
}
`;

export const VIKING_MODAL_STYLES = `
:host {
  display: contents;
}

.viking-modal-backdrop:not([open]) {
  display: none !important;
  pointer-events: none;
}

.viking-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--viking-z-overlay, 10001);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--viking-space-3);
  background: var(--viking-overlay-backdrop);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  animation: viking-backdrop-in var(--viking-duration-fast) var(--viking-ease-out);
}

.viking-modal-panel {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-2);
  width: min(522px, calc(100vw - var(--viking-space-4)));
  max-height: calc(100vh - var(--viking-space-6));
  padding: var(--viking-space-3);
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius-lg);
  background: var(--viking-surface);
  color: var(--viking-text);
  box-shadow: var(--viking-shadow-lg);
  font-family: var(--viking-font-family);
  position: relative;
  overflow: hidden;
  animation: viking-modal-in var(--viking-duration) var(--viking-ease-default);
}

.viking-modal-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--viking-metallic-200) 22%, transparent),
    transparent
  );
  pointer-events: none;
}

.viking-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--viking-space-2);
  padding-bottom: var(--viking-space-1);
  border-bottom: 1px solid var(--viking-border-subtle);
}

.viking-modal-heading {
  margin: 0;
  font-size: var(--viking-font-size-md);
  font-weight: var(--viking-font-weight-bold);
  letter-spacing: var(--viking-letter-spacing-tight);
  color: var(--viking-text);
  line-height: var(--viking-line-height-tight);
}

.viking-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: 1px solid transparent;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  border-radius: var(--viking-radius);
  transition: var(--viking-transition-interactive);
  flex-shrink: 0;
}

.viking-modal-close:hover {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
  border-color: var(--viking-border-subtle);
}

.viking-modal-close:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-modal-body {
  overflow-y: auto;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size);
  line-height: var(--viking-line-height-relaxed);
}

.viking-modal-footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--viking-space-2);
  justify-content: flex-end;
  padding-top: var(--viking-space-2);
  border-top: 1px solid var(--viking-border-subtle);
}

.viking-modal-footer:empty {
  display: none;
}

@keyframes viking-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes viking-modal-in {
  from {
    opacity: 0;
    transform: translateY(var(--viking-space-1)) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .viking-modal-backdrop,
  .viking-modal-panel {
    animation: none;
  }
}
`;

export const VIKING_SEARCH_PALETTE_STYLES = `
:host {
  display: contents;
}

.viking-search-palette-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--viking-z-overlay, 10001);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 10vh var(--viking-space-2) var(--viking-space-2);
  background: var(--viking-overlay-backdrop);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  animation: viking-backdrop-in var(--viking-duration-fast) var(--viking-ease-out);
}

.viking-search-palette-backdrop:not([open]) {
  display: none !important;
  pointer-events: none;
}

.viking-search-palette {
  display: flex;
  flex-direction: column;
  background: var(--viking-surface-raised, var(--viking-surface));
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius-lg);
  box-shadow: var(--viking-shadow-lg);
  overflow: hidden;
  max-width: 600px;
  width: min(100%, 600px);
  margin: 0 auto;
  font-family: var(--viking-font-family);
  color: var(--viking-text);
  animation: viking-modal-in var(--viking-duration) var(--viking-ease-default);
  position: relative;
  isolation: isolate;
}

.viking-search-palette::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--viking-metallic-200) 22%, transparent),
    transparent
  );
  pointer-events: none;
  z-index: 1;
}

.viking-search-palette-header {
  display: flex;
  align-items: center;
  padding: var(--viking-space-2);
  border-bottom: 1px solid var(--viking-border);
  gap: var(--viking-space-1);
  background: color-mix(in srgb, var(--viking-bg) 26%, var(--viking-surface-raised));
}

.viking-search-palette-header:focus-within {
  border-bottom-color: var(--viking-accent);
  box-shadow: inset 0 -2px 0 var(--viking-accent-soft);
}

.viking-search-palette-icon {
  color: var(--viking-text-muted);
  flex-shrink: 0;
}

.viking-search-palette-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: calc(var(--viking-font-size) * 1.05);
  color: var(--viking-text);
  font-family: inherit;
  min-width: 0;
}

.viking-search-palette-input::placeholder {
  color: var(--viking-text-muted);
}

.viking-search-palette-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  padding: var(--viking-space-0-5);
  border-radius: var(--viking-radius);
  transition: var(--viking-transition-interactive);
  flex-shrink: 0;
}

.viking-search-palette-close:hover {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
}

.viking-search-palette-close:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-search-palette-body {
  max-height: 50vh;
  overflow-y: auto;
  padding: var(--viking-space-2);
}

.viking-search-palette-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  padding: var(--viking-space-1) var(--viking-space-2);
  border-top: 1px solid var(--viking-border);
  font-size: calc(var(--viking-font-size) * 0.85);
  color: var(--viking-text-muted);
}

.viking-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: var(--viking-space-0-5) var(--viking-space-1);
  font-family: inherit;
  font-size: calc(var(--viking-font-size) * 0.75);
  border-radius: calc(var(--viking-radius) / 2);
  border: 1px solid var(--viking-border);
  background: var(--viking-surface-alt);
}

.viking-search-results {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-1);
}

.viking-search-group-label {
  margin: var(--viking-space-1) 0 var(--viking-space-0-5);
  padding: 0 var(--viking-space-1);
  font-size: var(--viking-font-size-2xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-transform: uppercase;
  color: var(--viking-text-muted);
}

.viking-search-result {
  display: flex;
  align-items: center;
  min-height: var(--viking-control-height-sm, 36px);
  padding: var(--viking-space-1) var(--viking-space-2);
  border-radius: var(--viking-radius);
  background: var(--viking-surface-alt);
  border: 1px solid var(--viking-border-subtle);
  cursor: pointer;
  transition: var(--viking-transition-interactive);
  gap: var(--viking-space-1);
  text-decoration: none;
  color: inherit;
}

.viking-search-result:hover,
.viking-search-result.is-selected {
  background: color-mix(in srgb, var(--viking-accent) 10%, var(--viking-surface-alt));
  border-color: color-mix(in srgb, var(--viking-accent) 42%, var(--viking-border-strong));
  box-shadow: var(--viking-shadow-sm);
}

.viking-search-result:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-search-result-title {
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-semibold);
  color: var(--viking-text);
}

.viking-search-result-snippet {
  font-size: var(--viking-font-size-xs);
  color: var(--viking-text-muted);
}

.viking-search-empty {
  padding: var(--viking-space-3);
  text-align: center;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-sm);
}

@keyframes viking-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes viking-modal-in {
  from {
    opacity: 0;
    transform: translateY(var(--viking-space-1)) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .viking-search-palette-backdrop,
  .viking-search-palette {
    animation: none;
  }
}
`;
