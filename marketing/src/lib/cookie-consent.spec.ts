import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const layoutSource = fs.readFileSync(
  path.join(projectDir, 'src/layouts/Layout.astro'),
  'utf8',
);
const widgetSource = fs.readFileSync(
  path.join(projectDir, 'public/assets/widgets/cookie-consent.js'),
  'utf8',
);

type FakeElement = {
  async?: boolean;
  getAttribute(name: string): string | null;
  id: string;
  src: string;
  tagName: string;
};

function runWidget(preferences: { analytical: boolean; marketing: boolean }) {
  const elements = new Map<string, FakeElement>();
  const appended: FakeElement[] = [];
  const cookieWrites: string[] = [];

  const document = {
    get cookie() {
      return '_ga=stale; _ga_MH3M99CQ80=stale; _clck=stale; necessary=kept';
    },
    set cookie(value: string) {
      cookieWrites.push(value);
    },
    createElement(tagName: string): FakeElement {
      const element: FakeElement = {
        id: '',
        src: '',
        tagName,
        getAttribute(name: string) {
          return name === 'src' ? this.src : null;
        },
      };
      return element;
    },
    getElementById(id: string) {
      return elements.get(id) || null;
    },
    querySelectorAll() {
      return appended.filter((element) => element.tagName === 'script');
    },
    head: {
      appendChild(element: FakeElement) {
        appended.push(element);
        if (element.id) {
          elements.set(element.id, element);
        }
      },
    },
  };

  const localStorage = {
    getItem() {
      return JSON.stringify(preferences);
    },
    setItem() {},
  };
  const location = {
    hash: '',
    hostname: 'dataengineeringformachinelearning.com',
    pathname: '/',
    reload() {},
    search: '',
  };
  const window = {
    dispatchEvent() {},
    history: { replaceState() {} },
    location,
  } as Record<string, unknown>;
  window.window = window;

  vm.runInNewContext(widgetSource, {
    CustomEvent: class {
      type: string;
      options: { detail: unknown };

      constructor(type: string, options: { detail: unknown }) {
        this.type = type;
        this.options = options;
      }
    },
    Date,
    JSON,
    Set,
    URLSearchParams,
    console,
    document,
    localStorage,
    setTimeout,
    window,
  });

  return { appended, cookieWrites, window };
}

type InteractiveElement = {
  addEventListener(type: string, listener: () => void): void;
  classList: {
    add(...names: string[]): void;
    contains(name: string): boolean;
    remove(...names: string[]): void;
    toggle(name: string, force?: boolean): boolean;
  };
  className: string;
  click(): void;
  getAttribute(name: string): string | null;
  id: string;
  innerHTML: string;
  querySelector(selector: string): InteractiveElement | null;
  remove(): void;
  setAttribute(name: string, value: unknown): void;
  src: string;
  tagName: string;
  textContent: string;
};

function runInteractiveWidget(options: {
  initialPreferences?: { analytical: boolean; marketing: boolean } | null;
  search?: string;
  throwOnWrite?: boolean;
}) {
  const headElements = new Map<string, InteractiveElement>();
  const appendedScripts: InteractiveElement[] = [];
  const timers = new Map<number, () => void>();
  let nextTimerId = 1;
  let overlay: InteractiveElement | null = null;
  let stored =
    options.initialPreferences == null
      ? null
      : JSON.stringify(options.initialPreferences);
  let reloads = 0;

  function createElement(tagName: string): InteractiveElement {
    const attributes = new Map<string, string>();
    const listeners = new Map<string, () => void>();
    const classes = new Set<string>();
    const descendants = new Map<string, InteractiveElement>();
    let html = '';

    const element: InteractiveElement = {
      id: '',
      src: '',
      tagName,
      textContent: '',
      className: '',
      classList: {
        add(...names) {
          names.forEach((name) => classes.add(name));
        },
        contains(name) {
          return classes.has(name);
        },
        remove(...names) {
          names.forEach((name) => classes.delete(name));
        },
        toggle(name, force) {
          const enabled = force === undefined ? !classes.has(name) : force;
          if (enabled) classes.add(name);
          else classes.delete(name);
          return enabled;
        },
      },
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      click() {
        listeners.get('click')?.();
      },
      getAttribute(name) {
        if (name === 'src') return this.src || null;
        return attributes.get(name) || null;
      },
      querySelector(selector) {
        return selector.startsWith('#') ? descendants.get(selector.slice(1)) || null : null;
      },
      remove() {
        if (overlay === element) overlay = null;
      },
      setAttribute(name, value) {
        attributes.set(name, String(value));
      },
      get innerHTML() {
        return html;
      },
      set innerHTML(value: string) {
        html = value;
        descendants.clear();
        const ids = [...value.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
        for (const id of ids) {
          const child = createElement(id.includes('toggle') ? 'button' : 'div');
          child.id = id;
          if (id === 'deml-customize-btn') child.textContent = 'Cookie Settings';
          descendants.set(id, child);
        }
      },
    };
    return element;
  }

  const document = {
    title: 'Cookie test',
    cookie: '',
    activeElement: null as InteractiveElement | null,
    createElement,
    addEventListener() {},
    removeEventListener() {},
    getElementById(id: string) {
      return headElements.get(id) || null;
    },
    querySelectorAll(selector: string) {
      return selector === 'script[src]' ? appendedScripts : [];
    },
    head: {
      appendChild(element: InteractiveElement) {
        if (element.id) headElements.set(element.id, element);
        if (element.tagName === 'script') appendedScripts.push(element);
      },
    },
    body: {
      style: { overflow: '' },
      appendChild(element: InteractiveElement) {
        overlay = element;
      },
    },
  };

  const localStorage = {
    getItem() {
      return stored;
    },
    setItem(_key: string, value: string) {
      if (options.throwOnWrite) {
        throw new DOMException('Storage unavailable', 'SecurityError');
      }
      stored = value;
    },
  };
  const location = {
    hash: '',
    hostname: 'dataengineeringformachinelearning.com',
    pathname: '/',
    reload() {
      reloads += 1;
    },
    search: options.search || '',
  };
  const window = {
    dispatchEvent() {},
    history: { replaceState() {} },
    location,
  } as Record<string, unknown>;
  window.window = window;

  vm.runInNewContext(widgetSource, {
    CustomEvent: class {
      type: string;
      options: { detail: unknown };

      constructor(type: string, options: { detail: unknown }) {
        this.type = type;
        this.options = options;
      }
    },
    DOMException,
    Date,
    JSON,
    Set,
    URLSearchParams,
    console: { error() {} },
    document,
    localStorage,
    clearTimeout(timerId: number) {
      timers.delete(timerId);
    },
    setTimeout(callback: () => void) {
      const timerId = nextTimerId++;
      timers.set(timerId, callback);
      return timerId;
    },
    window,
  });

  return {
    appendedScripts,
    getOverlay: () => overlay,
    getReloads: () => reloads,
    getStored: () => stored,
    runTimers() {
      for (const [timerId, callback] of [...timers]) {
        timers.delete(timerId);
        callback();
      }
    },
    timerCount: () => timers.size,
    window,
  };
}

describe('marketing cookie consent', () => {
  it('keeps third-party analytics out of the unconditional page layout', () => {
    assert.doesNotMatch(layoutSource, /googletagmanager\.com\/gtag\/js/);
    assert.doesNotMatch(layoutSource, /clarity\.ms\/tag/);
    assert.match(layoutSource, /cookie-consent\.js/);
  });

  it('does not load trackers without analytical consent and clears stale cookies', () => {
    const result = runWidget({ analytical: false, marketing: false });

    assert.equal(result.appended.length, 0);
    assert.ok(result.cookieWrites.some((cookie) => cookie.startsWith('_ga=')));
    assert.ok(result.cookieWrites.some((cookie) => cookie.startsWith('_clck=')));
    assert.ok(result.cookieWrites.every((cookie) => !cookie.startsWith('necessary=')));
  });

  it('loads each analytics provider exactly once for saved consent', () => {
    const result = runWidget({ analytical: true, marketing: false });
    const sources = result.appended.map((element) => element.src);

    assert.equal(
      sources.filter((source) => source.includes('googletagmanager.com/gtag/js')).length,
      1,
    );
    assert.equal(
      sources.filter((source) => source.includes('clarity.ms/tag/')).length,
      1,
    );
    assert.equal(result.cookieWrites.length, 0);

    const clarity = result.window.clarity as
      | (Function & { q?: ArrayLike<unknown>[] })
      | undefined;
    const consentCall = clarity?.q?.find((args) => args[0] === 'consentv2') as
      | [string, { ad_Storage: string; analytics_Storage: string }]
      | undefined;
    assert.equal(consentCall?.[1].analytics_Storage, 'granted');
    assert.equal(consentCall?.[1].ad_Storage, 'denied');
  });

  it('keeps query-driven settings expanded and cancels the delayed auto-show', () => {
    const result = runInteractiveWidget({
      initialPreferences: null,
      search: '?cookieSettings=1',
    });
    const overlay = result.getOverlay();

    assert.ok(overlay);
    assert.equal(result.timerCount(), 0);
    assert.equal(
      overlay.querySelector('#deml-cookie-form')?.classList.contains('open'),
      true,
    );
    assert.equal(overlay.querySelector('#deml-customize-btn')?.textContent, 'Hide Options');

    overlay.querySelector('#deml-accept-btn')?.click();
    result.runTimers();

    assert.equal(result.getOverlay(), null);
    assert.equal(result.timerCount(), 0);
  });

  it('fails closed but dismisses the dialog when preference storage is unavailable', () => {
    const result = runInteractiveWidget({
      initialPreferences: null,
      throwOnWrite: true,
    });
    result.runTimers();
    const overlay = result.getOverlay();
    assert.ok(overlay);

    overlay.querySelector('#deml-reject-btn')?.click();

    assert.equal(result.getOverlay(), null);
    assert.equal(result.appendedScripts.length, 0);
    assert.equal(result.getReloads(), 0);
    assert.equal(result.getStored(), null);

    const widgets = result.window.DemlWidgets as { openCookieSettings(): void };
    widgets.openCookieSettings();
    assert.ok(result.getOverlay()?.querySelector('#deml-close-btn'));
  });
});
