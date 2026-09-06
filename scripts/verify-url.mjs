import { chromium } from '@playwright/test';

const targetUrl = process.argv[2] ?? 'http://127.0.0.1:4173';
const expectedStatus = Number(process.argv[3] ?? 200);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  const response = await page.goto(targetUrl, { waitUntil: 'networkidle' });
  const result = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    h1Count: document.querySelectorAll('h1').length,
    mainCount: document.querySelectorAll('main').length,
    imagesWithoutAlt: [...document.querySelectorAll('img')].filter((image) => !image.hasAttribute('alt')).length,
  }));
  const status = response?.status() ?? 0;
  const evidence = { url: targetUrl, status, ...result, consoleErrors, pageErrors };
  console.log(JSON.stringify(evidence, null, 2));
  if (status !== expectedStatus || !result.title || result.lang !== 'en' || result.h1Count !== 1 || result.mainCount !== 1 || result.imagesWithoutAlt !== 0 || consoleErrors.length || pageErrors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
