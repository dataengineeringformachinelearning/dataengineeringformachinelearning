import {
  attachShadowStyles,
  readBoolAttr,
  closeModalDialog,
  showModalDialog,
} from "../core/base";
import {
  defineCustomElement,
  defineCustomElementAlias,
  escapeHtml,
  HTMLElementBase,
  modKeyLabel,
  vikingWcUid,
} from "../core/dom";
import { renderInlineIcon } from "../core/icons-inline";
import { VIKING_SEARCH_PALETTE_STYLES } from "../core/styles";
import type { VikingSearchPaletteItem } from "../core/types";

export type { VikingSearchPaletteItem };

const parseItems = (el: HTMLElement): VikingSearchPaletteItem[] => {
  const raw = el.getAttribute("items");
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as VikingSearchPaletteItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const matchesQuery = (
  item: VikingSearchPaletteItem,
  query: string,
): boolean => {
  const haystack = [
    item.title,
    item.snippet ?? "",
    item.group ?? "",
    item.href,
    ...(item.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
};

const filterItems = (
  items: VikingSearchPaletteItem[],
  query: string,
): VikingSearchPaletteItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }
  return items.filter((item) => matchesQuery(item, q));
};

const groupItems = (
  items: VikingSearchPaletteItem[],
): { group: string | null; items: VikingSearchPaletteItem[] }[] => {
  const groups = new Map<string | null, VikingSearchPaletteItem[]>();
  items.forEach((item) => {
    const key = item.group ?? null;
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  });
  return Array.from(groups.entries()).map(([group, grouped]) => ({
    group,
    items: grouped,
  }));
};

/**
 * Framework-agnostic command palette / search overlay Web Component.
 * Tag: `viking-command-palette`
 * Aliases: `viking-search-palette`, `viking-search-palette-wc`
 *
 * @attr open - When present, shows the palette
 * @attr global-shortcut - Bind ⌘K / Ctrl+K to open
 * @attr placeholder - Search input placeholder
 * @attr items - JSON array of `{ title, href, snippet?, group? }`
 *
 * @method openPalette() - Programmatically open
 * @method closePalette() - Programmatically close
 *
 * @event viking-close - Palette closed
 * @event viking-query - `{ detail: { query: string } }` on input
 * @event viking-select - `{ detail: { item } }` when a result is activated
 *
 * @example
 * <viking-command-palette
 *   global-shortcut
 *   items='[{"title":"Components","href":"/components","group":"Docs"}]'
 * ></viking-command-palette>
 */
export class VikingSearchPaletteWc extends HTMLElementBase {
  static readonly tag = "viking-command-palette";
  static readonly searchTag = "viking-search-palette";
  static readonly legacyTag = "viking-search-palette-wc";

  static get observedAttributes(): string[] {
    return ["open", "placeholder", "items", "global-shortcut"];
  }

  private readonly shadow: ShadowRoot;
  private dialogEl: HTMLDialogElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private resultsEl: HTMLDivElement | null = null;
  private globalKeyHandler: ((event: KeyboardEvent) => void) | null = null;
  private readonly resultsId = vikingWcUid("viking-search-results");
  private readonly inputId = vikingWcUid("viking-search-input");
  private query = "";
  private activeIndex = 0;
  private flatResults: VikingSearchPaletteItem[] = [];

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    attachShadowStyles(this.shadow, VIKING_SEARCH_PALETTE_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.removeAttribute("open");
    this.syncOpen();
    this.bindGlobalShortcut();
    this.dialogEl?.addEventListener("close", this.onClose);
    this.dialogEl?.addEventListener("click", this.onBackdropClick);
    this.inputEl?.addEventListener("input", this.onInput);
    this.inputEl?.addEventListener("keydown", this.onInputKeydown);
  }

  disconnectedCallback(): void {
    this.dialogEl?.removeEventListener("close", this.onClose);
    this.dialogEl?.removeEventListener("click", this.onBackdropClick);
    this.inputEl?.removeEventListener("input", this.onInput);
    this.inputEl?.removeEventListener("keydown", this.onInputKeydown);
    this.unbindGlobalShortcut();
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) {
      return;
    }
    if (name === "open") {
      this.syncOpen();
    }
    if (name === "global-shortcut") {
      this.unbindGlobalShortcut();
      this.bindGlobalShortcut();
    }
    if (name === "items" || name === "placeholder") {
      if (name === "placeholder" && this.inputEl) {
        const placeholder =
          this.getAttribute("placeholder") ??
          "Search documentation, dashboard, API…";
        this.inputEl.placeholder = placeholder;
        this.inputEl.setAttribute("aria-label", placeholder);
      } else {
        this.renderResults();
      }
    }
  }

  /** Opens the command palette. */
  openPalette(): void {
    this.setAttribute("open", "");
    this.syncOpen();
  }

  /** Closes the command palette. */
  closePalette(): void {
    this.removeAttribute("open");
    closeModalDialog(this.dialogEl);
  }

  /** Sets the query string and re-renders filtered results. */
  search(query: string): void {
    this.query = query;
    if (this.inputEl) {
      this.inputEl.value = query;
    }
    this.activeIndex = 0;
    this.renderResults();
    this.dispatchEvent(
      new CustomEvent("viking-query", {
        bubbles: true,
        composed: true,
        detail: { query: this.query },
      }),
    );
  }

  private readonly onClose = (): void => {
    this.removeAttribute("open");
    this.query = "";
    this.activeIndex = 0;
    if (this.inputEl) {
      this.inputEl.value = "";
    }
    this.dispatchEvent(
      new CustomEvent("viking-close", { bubbles: true, composed: true }),
    );
  };

  private readonly onBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.dialogEl) {
      this.closePalette();
    }
  };

  private readonly onInput = (event: Event): void => {
    this.query =
      (event.target as HTMLInputElement).value ?? this.inputEl?.value ?? "";
    this.activeIndex = 0;
    this.renderResults();
    this.dispatchEvent(
      new CustomEvent("viking-query", {
        bubbles: true,
        composed: true,
        detail: { query: this.query },
      }),
    );
  };

  private readonly onInputKeydown = (event: KeyboardEvent): void => {
    if (this.flatResults.length === 0) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closePalette();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.activeIndex = Math.min(
        this.flatResults.length - 1,
        this.activeIndex + 1,
      );
      this.renderResults();
      this.scrollActiveIntoView();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.activeIndex = Math.max(0, this.activeIndex - 1);
      this.renderResults();
      this.scrollActiveIntoView();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const item = this.flatResults[this.activeIndex];
      if (item) {
        this.activateItem(item);
      }
    }
  };

  private bindGlobalShortcut(): void {
    if (!readBoolAttr(this, "global-shortcut")) {
      return;
    }
    this.globalKeyHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (this.hasAttribute("open")) {
          this.closePalette();
        } else {
          this.openPalette();
        }
      }
    };
    document.addEventListener("keydown", this.globalKeyHandler);
  }

  private unbindGlobalShortcut(): void {
    if (this.globalKeyHandler) {
      document.removeEventListener("keydown", this.globalKeyHandler);
      this.globalKeyHandler = null;
    }
  }

  private syncOpen(): void {
    if (!this.dialogEl) {
      return;
    }
    const shouldOpen = this.hasAttribute("open");
    if (shouldOpen && !this.dialogEl.open) {
      this.dialogEl.removeAttribute("aria-hidden");
      showModalDialog(this.dialogEl);
      this.activeIndex = 0;
      this.renderResults();
      queueMicrotask(() => this.inputEl?.focus());
    } else if (!shouldOpen && this.dialogEl.open) {
      closeModalDialog(this.dialogEl);
      this.dialogEl.setAttribute("aria-hidden", "true");
    } else if (!shouldOpen) {
      this.dialogEl.setAttribute("aria-hidden", "true");
    }
  }

  private scrollActiveIntoView(): void {
    const active = this.resultsEl?.querySelector(
      ".viking-search-result.is-selected",
    );
    active?.scrollIntoView({ block: "nearest" });
  }

  private activateItem(item: VikingSearchPaletteItem): void {
    this.dispatchEvent(
      new CustomEvent("viking-select", {
        bubbles: true,
        composed: true,
        detail: { item },
      }),
    );
    this.closePalette();

    if (item.action === "cookie-settings") {
      const widgets = (
        globalThis as { DemlWidgets?: { openCookieSettings?: () => void } }
      ).DemlWidgets;
      widgets?.openCookieSettings?.();
      return;
    }

    if (item.action === "bug-report") {
      const widgets = (
        globalThis as { DemlWidgets?: { openBugReport?: () => void } }
      ).DemlWidgets;
      if (widgets?.openBugReport) {
        widgets.openBugReport();
        return;
      }
    }

    if (item.href && item.href !== "#") {
      // Absolute cross-origin links and same-origin routes both navigate.
      try {
        const target = new URL(item.href, window.location.href);
        if (target.origin === window.location.origin) {
          window.location.assign(
            `${target.pathname}${target.search}${target.hash}`,
          );
        } else {
          window.location.assign(target.href);
        }
      } catch {
        window.location.assign(item.href);
      }
    }
  }

  private renderResults(): void {
    if (!this.resultsEl) {
      return;
    }

    const items = parseItems(this);
    const q = this.query.trim().toLowerCase();
    const filtered = filterItems(items, q);
    this.flatResults = filtered;

    if (filtered.length === 0) {
      const q = this.query.trim();
      this.resultsEl.innerHTML = `<p class="viking-search-empty" role="status">${q ? "No results found" : "Start typing to search…"}</p>`;
      this.inputEl?.removeAttribute("aria-activedescendant");
      return;
    }

    if (this.activeIndex >= filtered.length) {
      this.activeIndex = filtered.length - 1;
    }

    let resultIndex = 0;
    const grouped = groupItems(filtered);

    const markup = grouped
      .map(({ group, items: groupItemsList }) => {
        const groupLabel = group
          ? `<p class="viking-search-group-label" role="presentation">${escapeHtml(group)}</p>`
          : "";
        const rows = groupItemsList
          .map((item) => {
            const id = `${this.resultsId}-result-${resultIndex}`;
            const selected = resultIndex === this.activeIndex;
            resultIndex += 1;
            return `
              <a
                id="${id}"
                class="viking-search-result${selected ? " is-selected" : ""}"
                role="option"
                aria-selected="${selected}"
                href="${escapeHtml(item.href)}"
                part="result"
                data-index="${resultIndex - 1}"
              >
                <div>
                  <div class="viking-search-result-title">${escapeHtml(item.title)}</div>
                  ${item.snippet ? `<div class="viking-search-result-snippet">${escapeHtml(item.snippet)}</div>` : ""}
                </div>
              </a>`;
          })
          .join("");
        return `${groupLabel}${rows}`;
      })
      .join("");

    this.resultsEl.innerHTML = `<div class="viking-search-results" id="${this.resultsId}" role="listbox" aria-label="Search results">${markup}</div>`;

    const activeId = `${this.resultsId}-result-${this.activeIndex}`;
    this.inputEl?.setAttribute("aria-activedescendant", activeId);
    this.inputEl?.setAttribute("role", "combobox");
    this.inputEl?.setAttribute("aria-expanded", "true");
    this.inputEl?.setAttribute("aria-controls", this.resultsId);

    this.resultsEl.querySelectorAll(".viking-search-result").forEach((node) => {
      node.addEventListener("click", (event) => {
        const mouse = event as MouseEvent;
        // Allow new-tab / middle-click via native <a href>.
        if (
          mouse.metaKey ||
          mouse.ctrlKey ||
          mouse.shiftKey ||
          mouse.button === 1
        ) {
          this.closePalette();
          return;
        }
        event.preventDefault();
        const index = Number((node as HTMLElement).dataset["index"] ?? 0);
        const item = this.flatResults[index];
        if (item) {
          this.activateItem(item);
        }
      });
      node.addEventListener("mouseenter", () => {
        const index = Number((node as HTMLElement).dataset["index"] ?? 0);
        if (index === this.activeIndex) {
          return;
        }
        this.activeIndex = index;
        this.resultsEl
          ?.querySelectorAll(".viking-search-result")
          .forEach((row, i) => {
            const selected = i === index;
            row.classList.toggle("is-selected", selected);
            row.setAttribute("aria-selected", selected ? "true" : "false");
          });
        const activeId = `${this.resultsId}-result-${index}`;
        this.inputEl?.setAttribute("aria-activedescendant", activeId);
      });
    });
  }

  private render(): void {
    const placeholder =
      this.getAttribute("placeholder") ??
      "Search documentation, dashboard, API…";
    const mod = modKeyLabel();

    this.shadow.innerHTML = `
      <dialog class="viking-search-palette-backdrop" aria-label="Search" aria-hidden="true">
        <div class="viking-search-palette" part="panel" role="document">
          <div class="viking-search-palette-header" part="header">
            <span class="viking-search-palette-icon" aria-hidden="true">${renderInlineIcon("search", 24)}</span>
            <input
              id="${this.inputId}"
              type="search"
              class="viking-search-palette-input"
              part="input"
              placeholder="${escapeHtml(placeholder)}"
              aria-label="${escapeHtml(placeholder)}"
              aria-autocomplete="list"
              autocomplete="off"
              spellcheck="false"
            />
            <button type="button" class="viking-search-palette-close" part="close" aria-label="Close search">${renderInlineIcon("x", 20)}</button>
          </div>
          <div class="viking-search-palette-body" part="body">
            <slot></slot>
            <div class="viking-search-results-host"></div>
          </div>
          <footer class="viking-search-palette-footer" part="footer">
            <span class="viking-kbd">${mod}</span><span class="viking-kbd">K</span> toggle ·
            <span class="viking-kbd">↑</span><span class="viking-kbd">↓</span> navigate ·
            <span class="viking-kbd">Enter</span> open ·
            <span class="viking-kbd">Esc</span> close
          </footer>
        </div>
      </dialog>
    `;

    this.dialogEl = this.shadow.querySelector("dialog");
    this.inputEl = this.shadow.querySelector("input");
    this.resultsEl = this.shadow.querySelector(".viking-search-results-host");

    this.shadow
      .querySelector(".viking-search-palette-close")
      ?.addEventListener("click", () => this.closePalette());

    this.dialogEl?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closePalette();
      }
    });
  }
}

export const registerVikingSearchPaletteWc = (): void => {
  defineCustomElement(VikingSearchPaletteWc.tag, VikingSearchPaletteWc);
  defineCustomElementAlias(
    VikingSearchPaletteWc.searchTag,
    VikingSearchPaletteWc,
  );
  defineCustomElementAlias(
    VikingSearchPaletteWc.legacyTag,
    VikingSearchPaletteWc,
  );
};
