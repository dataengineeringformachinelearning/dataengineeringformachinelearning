import { HTMLElementBase } from "./dom";

export type VikingAttrOptions<T> = {
  parser?: (value: string | null) => T;
  default?: T;
};

/**
 * VikingReactiveElement — lightweight reactivity for vanilla Web Components.
 *
 * Zero framework runtime. Batches attribute/prop-driven updates with
 * `queueMicrotask`, stays SSR-safe via {@link HTMLElementBase}, and keeps
 * `observedAttributes` / `attributeChangedCallback` as the attribute source of truth.
 *
 * Opt-in for multi-attribute hosts (footer, suite chrome). Simple badges/buttons
 * may keep extending {@link HTMLElementBase} directly.
 */
export abstract class VikingReactiveElement<
  TProps extends Record<string, unknown> = Record<string, unknown>,
> extends HTMLElementBase {
  private _props: Partial<TProps> = {};
  private _updateScheduled = false;

  connectedCallback(): void {
    this.scheduleRender();
  }

  attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) {
      return;
    }
    if (this.isConnected) {
      this.scheduleRender();
    }
  }

  /**
   * Read a host attribute with optional typed parsing.
   * Attributes remain the source of truth for declarative HTML.
   */
  protected attr<K extends string>(key: K): string | null;
  protected attr<T>(
    key: string,
    options: VikingAttrOptions<T> & { default: T },
  ): T;
  protected attr<T>(key: string, options: VikingAttrOptions<T>): T | undefined;
  protected attr<T>(
    key: string,
    options?: VikingAttrOptions<T>,
  ): T | string | null | undefined {
    const raw = this.getAttribute(key);
    if (options?.parser) {
      if (raw == null && options.default !== undefined) {
        return options.default;
      }
      return options.parser(raw);
    }
    if (raw == null) {
      return options?.default !== undefined
        ? (String(options.default) as T)
        : null;
    }
    return raw;
  }

  /** Internal reactive property (not reflected unless subclass reflects it). */
  protected setProp<K extends keyof TProps>(key: K, value: TProps[K]): void {
    if (Object.is(this._props[key], value)) {
      return;
    }
    this._props[key] = value;
    if (this.isConnected) {
      this.scheduleRender();
    }
  }

  protected getProp<K extends keyof TProps>(key: K): TProps[K] | undefined {
    return this._props[key];
  }

  /** Public alias for subclasses / tests that need an explicit re-render. */
  protected requestUpdate(): void {
    this.scheduleRender();
  }

  /** Coalesce multiple attribute/prop changes into one microtask render. */
  protected scheduleRender(): void {
    if (this._updateScheduled) {
      return;
    }
    this._updateScheduled = true;
    queueMicrotask(() => {
      this._updateScheduled = false;
      if (!this.isConnected) {
        return;
      }
      this.render();
    });
  }

  /** Subclass paints light or shadow DOM. */
  protected abstract render(): void;
}
