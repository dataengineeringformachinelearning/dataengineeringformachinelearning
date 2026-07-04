import { describe, expect, it } from 'vitest';
import { buildSuiteSearchItems } from './suite-search-items';

const urls = {
  app: 'https://deml.app',
  marketing: 'https://dataengineeringformachinelearning.com',
  backend: 'https://backend.deml.app',
};

describe('buildSuiteSearchItems', () => {
  it('includes platform navigation and legal links for marketing', () => {
    const items = buildSuiteSearchItems('marketing', urls);
    const titles = items.map(item => item.title);

    expect(titles).toContain('Documentation');
    expect(titles).toContain('Whitepaper');
    expect(titles).toContain('Book');
    expect(titles).toContain('Privacy Policy');
    expect(titles).toContain('Terms of Service');
    expect(titles).toContain('SOC2 Compliance');
    expect(titles).toContain('Viking-UI Components');
  });

  it('resolves app routes for deml.app context', () => {
    const items = buildSuiteSearchItems('app', urls);
    const dashboard = items.find(item => item.title === 'Dashboard');

    expect(dashboard?.href).toBe('/dashboard');
    expect(items.some(item => item.title === 'Billing & subscription')).toBe(true);
  });

  it('matches keyword search metadata', () => {
    const items = buildSuiteSearchItems('marketing', urls);
    const privacy = items.find(item => item.title === 'Privacy Policy');

    expect(privacy?.keywords?.some(keyword => keyword.includes('privacy'))).toBe(true);
  });
});
