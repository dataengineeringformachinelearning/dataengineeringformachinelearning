import { beforeEach, describe, expect, it } from 'vitest';
import {
  registerVikingBadgeWc,
  registerVikingCalloutWc,
  registerVikingModalWc,
  registerVikingSearchPaletteWc,
  registerVikingSelectWc,
} from './index';

const registerAll = (): void => {
  registerVikingBadgeWc();
  registerVikingCalloutWc();
  registerVikingSelectWc();
  registerVikingModalWc();
  registerVikingSearchPaletteWc();
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
    select.addEventListener('viking-change', (event) => {
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

  it('filters search palette items and supports keyboard selection', async () => {
    const palette = document.createElement('viking-search-palette-wc');
    palette.setAttribute(
      'items',
      JSON.stringify([
        { title: 'Components', href: '/components', group: 'Docs' },
        { title: 'Theming', href: '/theming', group: 'Docs' },
      ]),
    );
    document.body.append(palette);

    palette.openPalette();
    await Promise.resolve();
    expect(palette.shadowRoot?.querySelectorAll('.viking-search-result').length).toBe(2);

    palette.search('theming');
    await Promise.resolve();

    const results = palette.shadowRoot?.querySelectorAll('.viking-search-result');
    expect(results?.length).toBe(1);
    expect(results?.[0]?.textContent).toContain('Theming');

    palette.shadowRoot
      ?.querySelector('input')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(palette.hasAttribute('open')).toBe(false);
  });
});
