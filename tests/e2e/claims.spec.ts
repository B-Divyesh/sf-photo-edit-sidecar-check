import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const sidecar = `<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/" xmp:Rating="4" exif:DateTimeOriginal="2025-05-04T21:12:11Z" crs:Exposure2012="+0.55"><dc:subject><rdf:Bag><rdf:li>night</rdf:li><rdf:li>Lisbon</rdf:li></rdf:Bag></dc:subject></rdf:Description></rdf:RDF></x:xmpmeta>`;
const handoffSidecar = sidecar.replace(' xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"', '').replace(' crs:Exposure2012="+0.55"', '');
const tinyJpeg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=', 'base64');

async function loadReadySet(page: Page): Promise<void> {
  await page.locator('[data-file-input="source"]').setInputFiles([
    { name: 'frame.dng', mimeType: 'image/x-adobe-dng', buffer: Buffer.from('II*\0\b\0\0\0\0\0') },
    { name: 'frame.xmp', mimeType: 'application/rdf+xml', buffer: Buffer.from(sidecar) },
  ]);
  await expect(page.getByText('frame.xmp', { exact: true })).toBeVisible();
  await page.locator('[data-file-input="handoff"]').setInputFiles([
    { name: 'frame.jpg', mimeType: 'image/jpeg', buffer: tinyJpeg },
    { name: 'frame-export.xmp', mimeType: 'application/rdf+xml', buffer: Buffer.from(handoffSidecar) },
  ]);
  await expect(page.getByText('frame-export.xmp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'RUN 4 CHECKS' }).click();
  await expect(page.getByRole('heading', { name: 'This handoff looks ready' })).toBeVisible();
}

test('@claim:sample-comparison loads a completed four-part sample report in one click', async ({ page }) => {
  await page.goto('/');
  const action = page.getByRole('link', { name: 'Try it with sample data' });
  await expect(action).toBeVisible();
  await action.click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This handoff looks ready' })).toBeVisible();
  await expect(page.locator('.comparison-row')).toHaveCount(4);
  await expect(page.getByText('Lisbon-Night-042.dng', { exact: true })).toBeVisible();
  await expect(page.getByText('Lisbon-Night-042-print.jpg', { exact: true })).toBeVisible();
});

test('@claim:metadata-comparison reports edits, rating, keywords, and capture date from the sample files', async ({ page }) => {
  await page.goto('/demo');
  const rows = page.locator('.comparison-row');
  await expect(rows.filter({ hasText: 'Visible edits' })).toContainText('Flattened');
  await expect(rows.filter({ hasText: 'Rating' })).toContainText('4');
  await expect(rows.filter({ hasText: 'Rating' })).toContainText('Survives');
  await expect(rows.filter({ hasText: 'Keywords' })).toContainText('night');
  await expect(rows.filter({ hasText: 'Keywords' })).toContainText('Lisbon');
  await expect(rows.filter({ hasText: 'Capture date' })).toContainText('2025-05-04T21:12:11+00:00');
  await expect(rows.filter({ hasText: 'Capture date' })).toContainText('Survives');
});

test('@claim:demo-isolation resets sample state without reading or changing real history', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sidecar-check:history', JSON.stringify([{ sourceFiles: ['REAL-LIBRARY.dng'] }]));
    const original = Storage.prototype.getItem;
    const testWindow = window as unknown as { realStorageReads: string[]; restoreStorageGet: () => void };
    testWindow.realStorageReads = [];
    testWindow.restoreStorageGet = () => { Storage.prototype.getItem = original; };
    Storage.prototype.getItem = function getItem(key: string) {
      if (this === localStorage) (window as unknown as { realStorageReads: string[] }).realStorageReads.push(key);
      return original.call(this, key);
    };
  });
  await page.goto('/demo');
  expect(await page.evaluate(() => (window as unknown as { realStorageReads: string[] }).realStorageReads)).toEqual([]);
  await page.getByRole('button', { name: 'Save in demo history' }).click();
  expect(await page.evaluate(() => ({
    real: localStorage.getItem('sidecar-check:history'),
    demo: sessionStorage.getItem('demo:sidecar-check:history'),
  }))).toEqual({ real: JSON.stringify([{ sourceFiles: ['REAL-LIBRARY.dng'] }]), demo: expect.any(String) });
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('heading', { name: 'This handoff looks ready' })).toBeVisible();
  expect(await page.evaluate(() => ({
    real: localStorage.getItem('sidecar-check:history'),
    demo: sessionStorage.getItem('demo:sidecar-check:history'),
  }))).toEqual({ real: JSON.stringify([{ sourceFiles: ['REAL-LIBRARY.dng'] }]), demo: null });
  await page.evaluate(() => (window as unknown as { restoreStorageGet: () => void }).restoreStorageGet());
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.locator('[data-file-input="source"]').setInputFiles({ name: 'keep-this-selection.dng', mimeType: 'image/x-adobe-dng', buffer: Buffer.from('II*\0\b\0\0\0\0\0') });
  await expect(page.getByText('keep-this-selection.dng', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Demo' }).click();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page.getByText('keep-this-selection.dng', { exact: true })).toBeVisible();
});

test('@claim:local-processing keeps selected file content off the network', async ({ page }) => {
  const requests: Array<{ url: string; body: string | null }> = [];
  page.on('request', (request) => requests.push({ url: request.url(), body: request.postData() }));
  await page.goto('/demo');
  await page.getByLabel('Remove Lisbon-Night-042.xmp').click();
  await page.locator('[data-file-input="source"]').setInputFiles({ name: 'private-note.xmp', mimeType: 'application/rdf+xml', buffer: Buffer.from(sidecar.replace('Lisbon', 'PRIVATE-NETWORK-CANARY')) });
  await expect(page.getByText('private-note.xmp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'RUN 4 CHECKS' }).click();
  await expect(page.locator('.report')).toBeVisible();
  expect(requests.filter((request) => new URL(request.url).origin !== new URL(page.url()).origin)).toEqual([]);
  expect(requests.some((request) => request.body?.includes('PRIVATE-NETWORK-CANARY'))).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('sidecar-check:history'))).toBeNull();
});

test('@claim:originals-unchanged leaves a selected source file byte-for-byte unchanged', async ({ page }, testInfo) => {
  const sourcePath = testInfo.outputPath('unchanged-source.dng');
  writeFileSync(sourcePath, Buffer.from('II*\0\b\0\0\0\0\0ORIGINAL-CANARY'));
  const before = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
  await page.goto('/demo');
  await page.getByLabel('Remove Lisbon-Night-042.dng').click();
  await page.locator('[data-file-input="source"]').setInputFiles(sourcePath);
  await expect(page.getByText('unchanged-source.dng', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'RUN 4 CHECKS' }).click();
  await expect(page.locator('.report')).toBeVisible();
  const after = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
  expect(after).toBe(before);
});

test('@claim:report-download downloads the complete text report without a license', async ({ page }) => {
  await page.goto('/demo');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^sidecar-check-\d{4}-\d{2}-\d{2}\.txt$/);
  const content = readFileSync(await download.path() as string, 'utf8');
  expect(content).toContain('SOURCE FILES\nLisbon-Night-042.dng');
  expect(content).toContain('CHECKS\nVisible edits: ▣ Flattened');
  expect(content).toContain('HANDOFF CHECKLIST');
  expect(await page.evaluate(() => localStorage.getItem('sb_license:photo-edit-sidecar-check'))).toBeNull();
});

test('@claim:offline-open-check keeps an opened demo check working without a network', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('/demo');
    await expect(page.getByRole('heading', { name: 'This handoff looks ready' })).toBeVisible();
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Reset demo' }).click();
    await expect(page.getByRole('heading', { name: 'This handoff looks ready' })).toBeVisible();
    await expect(page.locator('.comparison-row')).toHaveCount(4);
  } finally {
    await context.setOffline(false);
    await context.close();
  }
});

test('@claim:accepted-formats accepts every listed photo and sidecar extension', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start for real' }).click();
  const extensions = ['dng', 'raw', 'cr2', 'cr3', 'nef', 'arw', 'orf', 'rw2', 'raf', 'pef', 'jpg', 'tiff', 'png', 'webp', 'avif', 'heic', 'heif', 'xmp'];
  await page.locator('[data-file-input="source"]').setInputFiles(extensions.map((extension) => ({
    name: `format-check.${extension}`,
    mimeType: extension === 'xmp' ? 'application/rdf+xml' : 'application/octet-stream',
    buffer: extension === 'xmp' ? Buffer.from(sidecar) : Buffer.from('format-check'),
  })));
  await expect(page.locator('[data-file-list="source"] li')).toHaveCount(extensions.length);
  await expect(page.getByRole('status')).not.toContainText('unsupported');
});

test('@claim:pro-history-limit keeps at most 25 Pro reports in browser storage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sb_license:photo-edit-sidecar-check', 'cached-valid-license');
    localStorage.setItem('sb_license_verdict:photo-edit-sidecar-check', JSON.stringify({ valid: true, reason: 'ok', checkedAt: Date.now() }));
  });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start for real' }).click();
  await loadReadySet(page);
  for (let count = 0; count < 26; count += 1) await page.getByRole('button', { name: 'Save to local history' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidecar-check:history') ?? '[]').length)).toBe(25);
  await expect(page.getByText('25 saved reports')).toBeVisible();
});

test('@claim:license-token-only sends only the pasted token for license verification', async ({ page }) => {
  const calls: Array<{ method: string; url: string; body: string | null }> = [];
  await page.route('https://api.sociobot.in/api/v1/products/photo-edit-sidecar-check/verify?license=sample-license-token', async (route) => {
    const request = route.request();
    calls.push({ method: request.method(), url: request.url(), body: request.postData() });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) });
  });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.getByLabel('Have a license? Paste it here').fill('sample-license-token');
  await page.getByRole('button', { name: 'Restore purchase' }).click();
  await expect(page.getByText('Pro is unlocked on this browser.')).toBeVisible();
  expect(calls).toEqual([{ method: 'GET', url: 'https://api.sociobot.in/api/v1/products/photo-edit-sidecar-check/verify?license=sample-license-token', body: null }]);
});

test('@claim:no-tracking runs the sample without analytics, ads, tracking, or cookies', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('heading', { name: 'This handoff looks ready' })).toBeVisible();
  expect([...origins]).toEqual([new URL(page.url()).origin]);
  expect(await page.context().cookies()).toEqual([]);
  expect(await page.locator('script[src*="analytics"], script[src*="track"], iframe').count()).toBe(0);
});

test('@claim:pro-price shows the live $12 one-time offer and production checkout action', async ({ page }) => {
  await page.goto('/demo');
  const section = page.locator('#pro');
  await expect(section).toContainText('$12');
  await expect(section).toContainText('one-time purchase');
  await expect(section.getByRole('link', { name: 'Buy Pro at checkout' })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/photo-edit-sidecar-check/checkout');
});
