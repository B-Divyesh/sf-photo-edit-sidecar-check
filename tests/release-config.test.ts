import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BILLING_API_BASE, checkoutUrl } from '../src/license';

describe('release configuration', () => {
  it('uses the live Sociobot billing origin for the advertised Pro checkout', () => {
    expect(BILLING_API_BASE).toBe('https://api.sociobot.in/api/v1');
    expect(checkoutUrl()).toBe('https://api.sociobot.in/api/v1/products/photo-edit-sidecar-check/checkout');
    expect(checkoutUrl()).not.toContain('pilot-api.sociobot.in');
  });

  it('keeps fingerprinted assets immutable while revalidating the app shell and worker', () => {
    const config = JSON.parse(readFileSync('public/staticwebapp.config.json', 'utf8')) as {
      globalHeaders: Record<string, string>;
      routes: Array<{ route: string; headers?: Record<string, string> }>;
    };
    const assetRoute = config.routes.find((route) => route.route === '/assets/*');
    const workerRoute = config.routes.find((route) => route.route === '/service-worker.js');

    expect(config.globalHeaders['Cache-Control']).toBe('public, max-age=0, must-revalidate');
    expect(assetRoute?.headers?.['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(workerRoute?.headers?.['Cache-Control']).toBe('no-cache, must-revalidate');
    expect(config.globalHeaders['Content-Security-Policy']).toContain('https://api.sociobot.in');
    expect(config.globalHeaders['Content-Security-Policy']).not.toContain('pilot-api.sociobot.in');
  });
});
