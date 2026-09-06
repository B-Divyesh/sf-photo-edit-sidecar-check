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
      responseOverrides?: Record<string, { rewrite?: string }>;
      navigationFallback?: { exclude?: string[] };
    };
    const assetRoute = config.routes.find((route) => route.route === '/assets/*');
    const workerRoute = config.routes.find((route) => route.route === '/service-worker.js');

    expect(config.globalHeaders['Cache-Control']).toBe('public, max-age=0, must-revalidate');
    expect(assetRoute?.headers?.['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(workerRoute?.headers?.['Cache-Control']).toBe('no-cache, must-revalidate');
    expect(config.globalHeaders['Content-Security-Policy']).toContain('https://api.sociobot.in');
    expect(config.globalHeaders['Content-Security-Policy']).not.toContain('pilot-api.sociobot.in');
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.responseOverrides?.['404']?.rewrite).toBe('/404.html');
    expect(config.navigationFallback?.exclude).toContain('/*');
    expect(readFileSync('public/404.html', 'utf8')).toContain('<h1>This page does not exist</h1>');
  });

  it('ships social, touch, canonical, demo, and sitemap metadata', () => {
    const html = readFileSync('index.html', 'utf8');
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(sitemap).toContain('/demo</loc>');
  });
});
