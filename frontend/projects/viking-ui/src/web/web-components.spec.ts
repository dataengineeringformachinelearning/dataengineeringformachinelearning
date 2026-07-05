import { beforeEach, describe, expect, it } from 'vitest';
import {
  registerVikingBadgeWc,
  registerVikingCalloutWc,
  registerVikingModalWc,
  registerVikingSearchPaletteWc,
  registerVikingSelectWc,
  registerVikingSuiteSearchPaletteWc,
} from './index';

const registerAll = (): void => {
  registerVikingBadgeWc();
  registerVikingCalloutWc();
  registerVikingSelectWc();
  registerVikingModalWc();
  registerVikingSearchPaletteWc();
  registerVikingSuiteSearchPaletteWc();
};

describe('Viking Web Components v2', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    registerAll();
  });

  it('renders badge tones and emits viking-removed', () => {
    const badge = document.createElement('viking-badge-wc');
    badge.setAttribute('tone', 'success');
    badge.setAttribute('icon', 'check');
    badge.setAttribute('removable', '');
    badge.textContent = 'Healthy';
    document.body.append(badge);

    expect(badge.shadowRoot?.querySelector('svg')).toBeTruthy();

    let removed = false;
    badge.addEventListener('viking-removed', () => {
      removed = true;
    });
    badge.shadowRoot?.querySelector<HTMLButtonElement>('.viking-badge-remove')?.click();
    expect(removed).toBe(true);
  });

  it('dismisses callout and sets hidden attribute', () => {
    const callout = document.createElement('viking-callout-wc');
    callout.setAttribute('tone', 'info');
    callout.setAttribute('heading', 'Notice');
    callout.setAttribute('dismissible', '');
    callout.textContent = 'Body copy';
    document.body.append(callout);

    callout.shadowRoot?.querySelector<HTMLButtonElement>('.viking-callout-close')?.click();
    expect(callout.hasAttribute('hidden')).toBe(true);
  });

  it('mirrors option children and emits viking-change', () => {
    const select = document.createElement('viking-select-wc');
    select.setAttribute('label', 'Retention');
    select.setAttribute('name', 'retention');
    select.innerHTML = `
      <option value="7d">7 days</option>
      <option value="30d">30 days</option>
    `;
    document.body.append(select);

    const native = select.shadowRoot?.querySelector('select') as HTMLSelectElement;
    expect(native.options.length).toBe(2);

    let changed = '';
    select.addEventListener('viking-change', event => {
      changed = (event as CustomEvent<{ value: string }>).detail.value;
    });
    native.value = '30d';
    native.dispatchEvent(new Event('change'));
    expect(changed).toBe('30d');
    expect(select.getAttribute('value')).toBe('30d');
  });

  it('opens and closes modal via attributes and methods', () => {
    const modal = document.createElement('viking-modal-wc');
    modal.setAttribute('title', 'Confirm');
    document.body.append(modal);

    modal.openModal();
    expect(modal.hasAttribute('open')).toBe(true);

    modal.closeModal();
    expect(modal.hasAttribute('open')).toBe(false);
  });

  it('filters command palette items and supports keyboard selection', async () => {
    const palette = document.createElement('viking-command-palette');
    palette.setAttribute(
      'items',
      JSON.stringify([
        { title: 'Components', href: '/components', group: 'Docs', keywords: ['primitives'] },
        { title: 'Theming', href: '/theming', group: 'Docs' },
      ]),
    );
    document.body.append(palette);

    palette.openPalette();
    await Promise.resolve();
    expect(palette.shadowRoot?.querySelectorAll('.viking-search-result').length).toBe(2);

    const input = palette.shadowRoot?.querySelector('input');
    expect(input?.getAttribute('aria-controls')).toMatch(/^viking-search-results-/);

    palette.search('primitives');
    await Promise.resolve();

    const results = palette.shadowRoot?.querySelectorAll('.viking-search-result');
    expect(results?.length).toBe(1);
    expect(results?.[0]?.textContent).toContain('Components');

    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(palette.hasAttribute('open')).toBe(false);
  });

  it('closes command palette from close button, Escape key, and outside click', async () => {
    const palette = document.createElement('viking-command-palette');
    palette.setAttribute('items', JSON.stringify([{ title: 'Docs', href: '/docs' }]));
    document.body.append(palette);

    palette.openPalette();
    await Promise.resolve();
    palette.shadowRoot?.querySelector<HTMLButtonElement>('.viking-search-palette-close')?.click();
    expect(palette.hasAttribute('open')).toBe(false);

    palette.openPalette();
    await Promise.resolve();
    palette.shadowRoot
      ?.querySelector('input')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(palette.hasAttribute('open')).toBe(false);

    palette.openPalette();
    await Promise.resolve();
    const dialog = palette.shadowRoot?.querySelector('dialog');
    dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(palette.hasAttribute('open')).toBe(false);
  });

  it('registers command palette aliases for legacy and semantic tags', () => {
    expect(customElements.get('viking-command-palette')).toBeTruthy();
    expect(customElements.get('viking-search-palette')).toBeTruthy();
    expect(customElements.get('viking-search-palette-wc')).toBeTruthy();
    expect(customElements.get('viking-suite-command-palette')).toBeTruthy();
    expect(customElements.get('viking-suite-search-palette')).toBeTruthy();
    expect(customElements.get('viking-suite-search-palette-wc')).toBeTruthy();
  });

  it('toggles open state with the global shortcut handler', async () => {
    const palette = document.createElement('viking-command-palette');
    palette.setAttribute('global-shortcut', '');
    palette.setAttribute('items', JSON.stringify([{ title: 'Docs', href: '/docs' }]));
    document.body.append(palette);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true }),
    );
    await Promise.resolve();
    expect(palette.hasAttribute('open')).toBe(true);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true }),
    );
    await Promise.resolve();
    expect(palette.hasAttribute('open')).toBe(false);
  });

  it('mounts suite palette with curated items and openPalette()', async () => {
    document.documentElement.setAttribute('data-deml-context', 'marketing');
    const suite = document.createElement('viking-suite-command-palette');
    document.body.append(suite);

    await Promise.resolve();
    await Promise.resolve();

    suite.openPalette();
    await Promise.resolve();

    const inner = suite.querySelector('viking-command-palette');
    expect(inner?.hasAttribute('open')).toBe(true);

    const itemsRaw = inner?.getAttribute('items') ?? '[]';
    const items = JSON.parse(itemsRaw) as { title: string }[];
    const titles = items.map(item => item.title);
    expect(titles).toContain('Documentation');
    expect(titles).toContain('Privacy Policy');
    expect(titles).toContain('Whitepaper');
  });
});
