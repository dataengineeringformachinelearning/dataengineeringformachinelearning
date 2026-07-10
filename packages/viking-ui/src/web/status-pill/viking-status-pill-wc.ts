import { attachShadowStyles } from "../core/base";
import {
  defineCustomElement,
  defineCustomElementAlias,
  escapeHtml,
  HTMLElementBase,
} from "../core/dom";
import { renderInlineIcon } from "../core/icons-inline";
import type { VikingWcTone } from "../core/types";

const TONES = new Set<VikingWcTone>([
  "accent",
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
  "muted",
]);

/**
 * Framework-agnostic Viking status pill.
 * Tag: `viking-status-pill` (legacy alias: `viking-status-pill-wc`)
 *
 * @attr tone - accent | secondary | success | warning | danger | info | muted
 * @attr icon - Optional icon name for leading glyph
 * @attr href - Optional navigation target
 * @attr compact - Reduced pill footprint
 * @attr dot - Shows a status dot
 * @attr removable - Renders a close control; emits `viking-pill-removed`
 */
export class VikingStatusPillWc extends HTMLElementBase {
  static readonly tag = "viking-status-pill";
  static readonly legacyTag = "viking-status-pill-wc";

  static get observedAttributes(): string[] {
    return [
      "tone",
      "icon",
      "href",
      "target",
      "compact",
      "dot",
      "removable",
      "aria-label",
    ];
  }

  private readonly shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    attachShadowStyles(this.shadow, VIKING_STATUS_PILL_STYLES);
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
    }
  }

  private get tone(): VikingWcTone {
    const raw = (this.getAttribute("tone") ?? "muted") as VikingWcTone;
    return TONES.has(raw) ? raw : "muted";
  }

  private get compact(): boolean {
    const compact = this.getAttribute("compact");
    return compact !== null && compact !== "false";
  }

  private get removable(): boolean {
    const removable = this.getAttribute("removable");
    return removable !== null && removable !== "false";
  }

  private get href(): string | null {
    return this.getAttribute("href");
  }

  private get icon(): string | null {
    return this.getAttribute("icon");
  }

  private get showDot(): boolean {
    const dot = this.getAttribute("dot");
    return dot !== null && dot !== "false";
  }

  private readonly onRemove = (): void => {
    this.dispatchEvent(
      new CustomEvent("viking-pill-removed", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private render(): void {
    const tone = this.tone;
    const compact = this.compact ? " status-pill--compact" : "";
    const icon = this.icon
      ? renderInlineIcon(this.icon, 14, "status-pill__icon")
      : "";
    const dot = this.showDot
      ? `<span class="status-pill__dot" aria-hidden="true"></span>`
      : "";
    const label = `<span class="status-pill__label" part="label"><slot></slot></span>`;
    const ariaLabel = escapeHtml(this.getAttribute("aria-label") ?? "");
    const href = this.href;
    const target = this.getAttribute("target");
    const rel = href && target === "_blank" ? ' rel="noopener noreferrer"' : "";

    if (href) {
      this.shadow.innerHTML = `
        <a
          class="status-pill status-pill-${tone}${compact}"
          part="control"
          href="${escapeHtml(href)}"
          ${target ? `target="${escapeHtml(target)}"${rel}` : ""}
          ${ariaLabel ? `aria-label="${ariaLabel}"` : ""}
        >
          ${dot}
          ${icon}
          ${label}
        </a>
      `;
      return;
    }

    this.shadow.innerHTML = `
      <span
        class="status-pill status-pill-${tone}${compact}"
        part="control"
        ${ariaLabel ? `role="status" aria-label="${ariaLabel}"` : ""}
      >
        ${dot}
        ${icon}
        ${label}
        ${
          this.removable
            ? '<button type="button" class="status-pill__remove" part="remove" aria-label="Remove"><span class="status-pill__remove-icon" aria-hidden="true">&times;</span></button>'
            : ""
        }
      </span>
    `;

    this.shadow
      .querySelector<HTMLButtonElement>(".status-pill__remove")
      ?.addEventListener("click", this.onRemove);
  }
}

const VIKING_STATUS_PILL_STYLES = `
:host {
  display: inline-flex;
}

.status-pill {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-surface-alt) 88%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-text-muted);
  --viking-status-pill-border: var(--viking-border-subtle);
  --viking-status-pill-shadow: var(--viking-shadow-xs);

  display: inline-flex;
  align-items: center;
  gap: var(--viking-space-0-5);
  padding: var(--viking-space-0-5) var(--viking-space-2);
  border-radius: var(--viking-radius-pill);
  border: 1px solid var(--viking-status-pill-border);
  background: var(--viking-status-pill-bg);
  color: var(--viking-status-pill-text);
  font-family: var(--viking-font-family);
  font-size: var(--viking-font-size-xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-caps);
  line-height: var(--viking-line-height-snug);
  white-space: nowrap;
  text-transform: uppercase;
  box-shadow: var(--viking-status-pill-shadow);
}

:host(:hover) .status-pill {
  text-decoration: none;
}

.status-pill--compact {
  padding: var(--viking-space-0-5);
  font-size: var(--viking-font-size-2xs);
}

.status-pill__label {
  display: inline-flex;
  align-items: center;
}

.status-pill__dot {
  width: var(--viking-space-1);
  height: var(--viking-space-1);
  border-radius: var(--viking-radius-full);
  background: currentColor;
  flex: 0 0 auto;
}

.status-pill__icon,
::slotted([data-viking-icon]) {
  width: var(--viking-space-3);
  height: var(--viking-space-3);
  color: currentColor;
  flex-shrink: 0;
}

.status-pill__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: currentColor;
  border-radius: var(--viking-radius-full);
  width: var(--viking-touch-target-min);
  height: var(--viking-touch-target-min);
  margin-right: calc(var(--viking-space-0-5) * -1);
  padding: 0;
  cursor: pointer;
}

.status-pill__remove:hover {
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.status-pill__remove:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.status-pill-accent {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-accent) 18%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-accent);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-accent) 52%, transparent);
}

.status-pill-secondary {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-accent-secondary) 16%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-accent-secondary);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-accent-secondary) 52%, transparent);
}

.status-pill-success {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-success) 16%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-success);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-success) 55%, transparent);
}

.status-pill-warning {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-warning) 16%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-warning);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-warning) 55%, transparent);
}

.status-pill-danger {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-danger) 14%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-danger-text);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-danger) 50%, transparent);
}

.status-pill-info {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-info) 14%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-info);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-info) 50%, transparent);
}

.status-pill-muted {
  --viking-status-pill-bg: var(--viking-surface);
  --viking-status-pill-text: var(--viking-text-muted);
  --viking-status-pill-border: var(--viking-border-subtle);
}

.status-pill a {
  color: inherit;
}

a.status-pill {
  text-decoration: none;
}
`;

export const registerVikingStatusPillWc = (): void => {
  defineCustomElement(VikingStatusPillWc.tag, VikingStatusPillWc);
  defineCustomElementAlias(VikingStatusPillWc.legacyTag, VikingStatusPillWc);
};

/** Register only the internal wrapper tag used by Angular components. */
export const registerVikingStatusPillWcElement = (): void => {
  defineCustomElementAlias(VikingStatusPillWc.legacyTag, VikingStatusPillWc);
};
