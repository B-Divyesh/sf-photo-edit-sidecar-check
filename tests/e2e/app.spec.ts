import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const sidecar = `<?xpacket begin=""><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/" xmp:Rating="4" exif:DateTimeOriginal="2025-05-04T13:12:11Z" crs:Exposure2012="+0.55"><dc:subject><rdf:Bag><rdf:li>night</rdf:li><rdf:li>Lisbon</rdf:li></rdf:Bag></dc:subject></rdf:Description></rdf:RDF></x:xmpmeta>`;
const tinyJpeg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=', 'base64');

test('runs the real handoff check and exposes an accessible report', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.locator('[data-file-input="source"]').setInputFiles([
    { name: 'frame.dng', mimeType: 'image/x-adobe-dng', buffer: Buffer.from('II*\0\b\0\0\0\0\0') },
    { name: 'frame.xmp', mimeType: 'application/rdf+xml', buffer: Buffer.from(sidecar) },
  ]);
  await page.locator('[data-file-input="handoff"]').setInputFiles({ name: 'frame.jpg', mimeType: 'image/jpeg', buffer: tinyJpeg });
  await page.getByRole('button', { name: 'RUN 4 CHECKS' }).click();
  await expect(page.getByRole('heading', { name: 'This handoff can lose information' })).toBeVisible();
  await expect(page.locator('.status-flattened')).toBeVisible();
  await expect(page.getByText('Missing', { exact: false }).first()).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
});

test('empty and unsupported states explain the next action', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'RUN 4 CHECKS' }).click();
  await expect(page.getByRole('status')).toContainText('Add a source photo');
  await page.locator('[data-file-input="source"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('no') });
  await expect(page.getByRole('status')).toContainText('Skipped unsupported file');
});

test('privacy route and 390px layout pass smoke checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
});

test('uses production billing and keeps a returned license without repeat verification', async ({ page }) => {
  let verificationRequests = 0;
  await page.route('https://api.sociobot.in/api/v1/products/photo-edit-sidecar-check/verify?license=returned-license', async (route) => {
    verificationRequests += 1;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) });
  });

  await page.goto('/?license=returned-license');
  await expect(page.getByRole('link', { name: 'Buy Pro' })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/photo-edit-sidecar-check/checkout');
  await expect(page.getByText('Pro is unlocked on this browser.')).toBeVisible();
  expect(await page.evaluate(() => ({
    token: localStorage.getItem('sb_license:photo-edit-sidecar-check'),
    query: location.search,
  }))).toEqual({ token: 'returned-license', query: '' });
  expect(verificationRequests).toBe(1);

  await page.reload();
  await expect(page.getByText('Pro is unlocked on this browser.')).toBeVisible();
  expect(verificationRequests).toBe(1);
});

test('keeps an open check useful when the network drops', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('/demo');
    await expect(page.getByRole('heading', { name: 'This handoff looks ready' })).toBeVisible();
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Reset demo' }).click();
    await expect(page.locator('.comparison-row')).toHaveCount(4);
    await expect(page.locator('[data-network]')).toContainText('offline');
  } finally {
    await context.setOffline(false);
    await context.close();
  }
});

test('updates route titles, canonical URLs, browser history, and focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy' }).first().click();
  await expect(page).toHaveTitle('Privacy — Edit Sidecar Check');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://photo-edit-sidecar-check.sociobot.in/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeFocused();
  await page.goBack();
  await expect(page).toHaveTitle('Edit Sidecar Check — Check photo handoffs');
  await expect(page.getByRole('heading', { level: 1, name: 'Check what survives a photo handoff' })).toBeFocused();
});

test('shows the plain first action on a phone without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const heading = page.getByRole('heading', { level: 1, name: 'Check what survives a photo handoff' });
  const sample = page.getByRole('link', { name: 'Try it with sample data' });
  await expect(heading).toBeVisible();
  await expect(sample).toBeVisible();
  const actionBox = await sample.boundingBox();
  expect(actionBox && actionBox.y + actionBox.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('renders the designed 404 document accessibly', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page).toHaveTitle('Page not found — Edit Sidecar Check');
  await expect(page.getByRole('heading', { level: 1, name: 'This page does not exist' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the checker' })).toHaveAttribute('href', '/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
});
