import {
  defineCustomElement,
  defineCustomElementAlias,
  escapeHtml,
  HTMLElementBase,
} from "../core/dom";
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
 * Framework-agnostic status page card with title/subtitle, optional status chip,
 * and optional action slot.
 * Tag: `viking-status-card` (legacy alias: `viking-status-card-wc`)
 *
 * @attr title - Card heading
 * @attr subtitle - Supporting body text
 * @attr status - Optional status chip label
 * @attr status-tone - accent | secondary | success | warning | danger | info | muted
 * @attr status-clickable - Wrap status in anchor style token (visual-only)
 * @attr href - Optional outbound/intra-app card link
 * @attr compact - Reduce padding and spacing
 * @attr loading - Reserved loading state class
 */
export class VikingStatusCardWc extends HTMLElementBase {
  static readonly tag = "viking-status-card";
  static readonly legacyTag = "viking-status-card-wc";

  static get observedAttributes(): string[] {
    return [
      "title",
      "subtitle",
      "status",
      "status-tone",
      "status-dot",
      "href",
      "target",
      "compact",
      "loading",
      "interactive",
      "aria-label",
    ];
  }

  private readonly shadow = this.attachShadow({ mode: "open" });

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
    }
  }

  private get compact(): boolean {
    const compact = this.getAttribute("compact");
    return compact !== null && compact !== "false";
  }

  private get loading(): boolean {
    const loading = this.getAttribute("loading");
    return loading !== null && loading !== "false";
  }

  private get interactive(): boolean {
    const interactive = this.getAttribute("interactive");
    return interactive !== null && interactive !== "false";
  }

  private get href(): string | null {
    return this.getAttribute("href");
  }

  private get target(): string | null {
    return this.getAttribute("target");
  }

  private get statusTone(): VikingWcTone {
    const raw = (this.getAttribute("status-tone") ?? "muted") as VikingWcTone;
    return TONES.has(raw) ? raw : "muted";
  }

  private get statusDot(): boolean {
    const statusDot = this.getAttribute("status-dot");
    return statusDot !== null && statusDot !== "false";
  }

  private get cardTitle(): string {
    return this.getAttribute("title") ?? "";
  }

  private get subtitle(): string {
    return this.getAttribute("subtitle") ?? "";
  }

  private get status(): string {
    return this.getAttribute("status") ?? "";
  }

  private render(): void {
    const hasStatus = this.status.length > 0;
    const title = this.cardTitle;
    const subtitle = this.subtitle;
    const compactClass = this.compact ? " status-card--compact" : "";
    const loadingClass = this.loading ? " status-card--loading" : "";
    const interactiveClass = this.interactive
      ? " status-card--interactive"
      : "";
    const wrapperClass = `status-card${compactClass}${loadingClass}${interactiveClass}`;
    const rel = this.target === "_blank" ? ' rel="noopener noreferrer"' : "";
    const statusDot = this.statusDot
      ? '<span class="status-card__status-dot" aria-hidden="true"></span>'
      : "";
    const statusChip = hasStatus
      ? `<span class="status-card__status status-card__status-${this.statusTone}" part="status">${statusDot}<span>${escapeHtml(this.status)}</span></span>`
      : "";
    const safeHref = this.href ? escapeHtml(this.href) : "";
    const safeLabel = escapeHtml(this.getAttribute("aria-label") ?? "");

    const wrapperTag = safeHref ? "a" : "div";

    const header = `
      <header class="status-card__header">
        <div class="status-card__title-wrap">
          ${
            title
              ? `<h3 class="status-card__title" part="title">${escapeHtml(title)}</h3>`
              : ""
          }
          ${
            subtitle
              ? `<p class="status-card__subtitle" part="subtitle">${escapeHtml(subtitle)}</p>`
              : ""
          }
        </div>
        ${
          hasStatus || statusDot
            ? `<div class="status-card__status-wrap">${statusChip}</div>`
            : ""
        }
      </header>
    `;

    this.shadow.innerHTML = `
      <style>
        ${VIKING_STATUS_CARD_STYLES}
      </style>
      <${wrapperTag}
        class="${wrapperClass}"
        part="card"
        ${safeHref ? `href="${safeHref}"` : ""}
        ${this.target ? `target="${escapeHtml(this.target)}"` : ""}
        ${safeHref ? rel : ""}
        ${safeLabel ? `aria-label="${safeLabel}"` : ""}
      >
        ${header}
        <section class="status-card__body">
          <slot></slot>
        </section>
      </${wrapperTag}>
    `;
  }
}

const VIKING_STATUS_CARD_STYLES = `
:host {
  display: block;
}

:host([compact]) .status-card,
:host .status-card--compact {
  padding: var(--viking-card-padding-compact);
  gap: var(--viking-space-2);
}

.status-card {
  display: grid;
  gap: var(--viking-space-4);
  width: 100%;
  padding: var(--viking-card-padding);
  border-radius: var(--viking-radius-lg);
  border: 1px solid var(--viking-border);
  background: var(--viking-surface);
  color: var(--viking-text);
  box-sizing: border-box;
  transition: var(--viking-transition-interactive);
  text-decoration: none;
}

.status-card--interactive {
  cursor: pointer;
}

.status-card--interactive:hover {
  border-color: var(--viking-accent-strong);
  box-shadow: var(--viking-shadow-sm);
  transform: translateY(calc(var(--viking-state-hover-lift) * -1));
}

.status-card--loading {
  pointer-events: none;
  opacity: var(--viking-state-disabled-opacity);
}

.status-card__header {
  display: flex;
  justify-content: space-between;
  gap: var(--viking-space-3);
  align-items: flex-start;
  min-width: 0;
  padding-bottom: var(--viking-space-2);
  margin-bottom: var(--viking-space-2);
  border-bottom: 1px solid var(--viking-border);
}

.status-card__title-wrap {
  display: grid;
  gap: var(--viking-space-1);
  min-width: 0;
}

.status-card__title {
  margin: 0;
  font-size: var(--viking-font-size-xl);
  font-weight: var(--viking-font-weight-bold);
  letter-spacing: var(--viking-letter-spacing-tight);
  line-height: var(--viking-line-height-tight);
}

.status-card__subtitle {
  margin: 0;
  max-width: 60ch;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-sm);
  line-height: var(--viking-line-height-relaxed);
}

.status-card__status-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
}

.status-card__status {
  display: inline-flex;
  align-items: center;
  gap: var(--viking-space-1);
  max-width: fit-content;
  padding: calc(var(--viking-space-half) - 1px) var(--viking-space-1);
  border-radius: var(--viking-radius-pill);
  border: 1px solid var(--viking-border-subtle);
  background: color-mix(in srgb, var(--viking-surface) 92%, transparent);
  color: var(--viking-text-muted);
  text-transform: capitalize;
  font-size: var(--viking-font-size-xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-wide);
}

.status-card__status-dot {
  width: var(--viking-space-1);
  height: var(--viking-space-1);
  border-radius: var(--viking-radius-full);
  background: currentColor;
  flex: 0 0 auto;
}

.status-card__status-success {
  background: color-mix(in srgb, var(--viking-success) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-success) 40%, transparent);
  color: var(--viking-success);
}

.status-card__status-warning {
  background: color-mix(in srgb, var(--viking-warning) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-warning) 40%, transparent);
  color: var(--viking-warning);
}

.status-card__status-danger {
  background: color-mix(in srgb, var(--viking-danger) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-danger) 45%, transparent);
  color: var(--viking-danger-text);
}

.status-card__status-accent {
  background: color-mix(in srgb, var(--viking-accent) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-accent) 40%, transparent);
  color: var(--viking-accent);
}

.status-card__status-secondary {
  background: color-mix(in srgb, var(--viking-accent-secondary) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 40%, transparent);
  color: var(--viking-accent-secondary);
}

.status-card__status-info {
  background: color-mix(in srgb, var(--viking-info) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-info) 40%, transparent);
  color: var(--viking-info);
}

.status-card__status-muted {
  background: var(--viking-surface);
  border-color: var(--viking-border-subtle);
  color: var(--viking-text-muted);
}

.status-card__body {
  display: grid;
  gap: var(--viking-space-3);
  min-width: 0;
  width: 100%;
}

.status-card__body > * {
  width: 100%;
  min-width: 0;
}
`;

export const registerVikingStatusCardWc = (): void => {
  defineCustomElement(VikingStatusCardWc.tag, VikingStatusCardWc);
  defineCustomElementAlias(VikingStatusCardWc.legacyTag, VikingStatusCardWc);
};
