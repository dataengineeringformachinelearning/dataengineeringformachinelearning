/**
 * Suite focus helpers — keyboard navigation + restore after overlays.
 * Pure DOM utilities; safe to call from Angular effects / event handlers.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** True when the element can receive keyboard focus. */
export function isFocusable(el: Element | null | undefined): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (
    el.hasAttribute("disabled") ||
    el.getAttribute("aria-disabled") === "true"
  ) {
    return false;
  }
  if (el.closest("[inert], [hidden], [aria-hidden='true']")) return false;
  const style = globalThis.getComputedStyle?.(el);
  if (style && (style.visibility === "hidden" || style.display === "none")) {
    return false;
  }
  return el.matches(FOCUSABLE_SELECTOR);
}

/** Focusable descendants in document order (excludes the container itself). */
export function getFocusableElements(root: ParentNode): HTMLElement[] {
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return nodes.filter((el) => isFocusable(el));
}

/** Move focus to the first focusable descendant, or the container if focusable. */
export function focusFirst(
  root: HTMLElement,
  options: FocusOptions = { preventScroll: true },
): HTMLElement | null {
  const candidates = getFocusableElements(root);
  const target = candidates[0] ?? (isFocusable(root) ? root : null);
  target?.focus(options);
  return target;
}

/** Capture the element that should regain focus when an overlay closes. */
export function captureReturnFocus(
  active: Element | null = typeof document !== "undefined"
    ? document.activeElement
    : null,
): HTMLElement | null {
  return active instanceof HTMLElement ? active : null;
}

/** Restore focus after dismiss; no-op if the node is gone or not focusable. */
export function restoreFocus(
  el: HTMLElement | null | undefined,
  options: FocusOptions = { preventScroll: true },
): void {
  if (!el || !el.isConnected) return;
  try {
    el.focus(options);
  } catch {
    /* ignore detached / non-focusable hosts */
  }
}

export type RovingKey =
  | "ArrowRight"
  | "ArrowLeft"
  | "ArrowDown"
  | "ArrowUp"
  | "Home"
  | "End";

/**
 * Roving tabindex index math for tablists / menubars.
 * Returns the next index, or null if the key is not a navigation key.
 */
export function nextRovingIndex(
  key: string,
  currentIndex: number,
  length: number,
  options: { vertical?: boolean; wrap?: boolean } = {},
): number | null {
  if (length <= 0) return null;
  const wrap = options.wrap !== false;
  const vertical = options.vertical === true;
  let next = currentIndex;

  switch (key) {
    case "ArrowRight":
      if (vertical) return null;
      next = currentIndex + 1;
      break;
    case "ArrowLeft":
      if (vertical) return null;
      next = currentIndex - 1;
      break;
    case "ArrowDown":
      if (!vertical) return null;
      next = currentIndex + 1;
      break;
    case "ArrowUp":
      if (!vertical) return null;
      next = currentIndex - 1;
      break;
    case "Home":
      return 0;
    case "End":
      return length - 1;
    default:
      return null;
  }

  if (wrap) {
    return (next + length) % length;
  }
  return Math.max(0, Math.min(length - 1, next));
}

/**
 * Horizontal menubar / tablist key handler helper.
 * When orientation is "both", arrows work in either axis (FORJD tabs).
 */
export function nextRovingIndexBothAxes(
  key: string,
  currentIndex: number,
  length: number,
): number | null {
  if (length <= 0) return null;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (currentIndex + 1) % length;
    case "ArrowLeft":
    case "ArrowUp":
      return (currentIndex - 1 + length) % length;
    case "Home":
      return 0;
    case "End":
      return length - 1;
    default:
      return null;
  }
}

/** Horizontal menubar / nav list. */
export function nextRovingIndexHorizontal(
  key: string,
  currentIndex: number,
  length: number,
): number | null {
  return nextRovingIndex(key, currentIndex, length, { vertical: false });
}

/**
 * Trap Tab / Shift+Tab inside an overlay root (WCAG 2.4.3 + focus retention).
 * Prefer native <dialog>.showModal() when available; this is a defensive fallback.
 */
export function trapTabKey(event: KeyboardEvent, root: HTMLElement): void {
  if (event.key !== "Tab") return;
  const items = getFocusableElements(root);
  if (items.length === 0) {
    event.preventDefault();
    root.focus({ preventScroll: true });
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active =
    typeof document !== "undefined" ? document.activeElement : null;
  if (event.shiftKey) {
    if (active === first || !root.contains(active)) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    }
    return;
  }
  if (active === last || !root.contains(active)) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
}
