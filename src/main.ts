import './style.css';
import { acceptsFile, inspectFile, supportedFormats } from './metadata';
import { buildReport } from './compare';
import { captureReturnedLicense, checkoutUrl, initialLicenseState, storeLicense, verifyLicense, type LicenseState } from './license';
import { sampleFiles } from './sample';
import type { Bay, CheckReport, CheckStatus, InspectedFile } from './types';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application mount not found');
const root = app;
const REAL_HISTORY_KEY = 'sidecar-check:history';
const DEMO_HISTORY_KEY = 'demo:sidecar-check:history';

type Route = 'home' | 'demo' | 'privacy' | 'terms';

const state: {
  files: Record<Bay, InspectedFile[]>;
  report?: CheckReport;
  license: LicenseState;
  processing: boolean;
  error: string;
  demo: boolean;
} = {
  files: { source: [], handoff: [] },
  license: { unlocked: false, checking: false, message: 'Free check ready.' },
  processing: false,
  error: '',
  demo: false,
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function currentRoute(): Route {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/demo') return 'demo';
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  return 'home';
}

const routeMeta: Record<Route, { title: string; description: string; canonical: string }> = {
  home: {
    title: 'Edit Sidecar Check — Check photo handoffs',
    description: 'Compare photo files and sidecars before a handoff. Check visible edits, ratings, keywords, and dates in your browser.',
    canonical: 'https://photo-edit-sidecar-check.sociobot.in/',
  },
  demo: {
    title: 'Demo — Edit Sidecar Check',
    description: 'Try a complete photo handoff check with bundled sample files. The demo is separate from your files and saved reports.',
    canonical: 'https://photo-edit-sidecar-check.sociobot.in/demo',
  },
  privacy: {
    title: 'Privacy — Edit Sidecar Check',
    description: 'Learn what Edit Sidecar Check reads, stores, and sends when you check photo files or verify a Pro license.',
    canonical: 'https://photo-edit-sidecar-check.sociobot.in/privacy',
  },
  terms: {
    title: 'Terms — Edit Sidecar Check',
    description: 'Read the use limits and one-time Pro purchase terms for Edit Sidecar Check.',
    canonical: 'https://photo-edit-sidecar-check.sociobot.in/terms',
  },
};

function setMeta(route: Route): void {
  const meta = routeMeta[route];
  document.title = meta.title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', meta.description);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', meta.canonical);
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', meta.title);
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', meta.description);
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', meta.canonical);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', meta.title);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', meta.description);
}

function demoBanner(): string {
  return `<aside class="demo-banner" aria-label="Demo mode">
    <strong>Demo — sample data, nothing is saved</strong>
    <div><button class="banner-action" type="button" data-reset-demo>Reset demo</button><button class="banner-action" type="button" data-start-real>Start for real</button></div>
  </aside>`;
}

function layout(content: string, route: Route): string {
  setMeta(route);
  return `
    <header class="site-header">
      <a class="wordmark" href="/" aria-label="Edit Sidecar Check home"><span class="reels" aria-hidden="true">●—●</span> EDIT SIDECAR CHECK</a>
      <nav aria-label="Primary navigation"><a href="/demo">Demo</a><a href="/#checker">Checker</a><a href="/privacy">Privacy</a></nav>
      <span class="network-status" data-network>${navigator.onLine ? '● Local / online' : '○ Local / offline'}</span>
    </header>
    ${route === 'demo' ? demoBanner() : ''}
    <div class="route-status" aria-live="polite" aria-atomic="true" data-route-status></div>
    ${content}
    <footer>
      <div><span class="footer-mark">A ⇢ B</span><p>Check which photo edits and tags can survive a handoff.</p></div>
      <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
      <p>Built by Param Factory · version 1.1.0 · build repair-2</p>
      <p class="asset-note">The cassette collage is original AI-generated art made for this product.</p>
    </footer>`;
}

function legalPage(kind: 'privacy' | 'terms'): string {
  const privacy = `
    <main id="main" class="legal-page">
      <p class="eyebrow">Policy updated 6 September 2026</p>
      <h1 tabindex="-1">Privacy</h1>
      <p class="lede">Your photos and sidecars are checked inside this browser. We do not receive photo bytes or reports.</p>
      <h2>What stays in this browser</h2>
      <p>Selected files stay in browser memory while the page is open.</p>
      <p>The free checker does not save files or reports.</p>
      <p>Pro can save up to 25 reports in this browser.</p>
      <p>Clear this site’s storage to remove licenses and saved reports.</p>
      <h2>Network requests</h2>
      <p>The free checker uses no analytics, ads, or tracking.</p>
      <p>Buying Pro opens Sociobot’s checkout.</p>
      <p>License checks send only your license token to the Sociobot billing API.</p>
      <p>Sociobot and Dodo handle checkout data under their policies.</p>
      <h2>Demo data</h2>
      <p>The demo uses storage keys that start with <code>demo:</code>. It never reads your saved report history.</p>
      <p>Reset demo or Start for real removes those demo keys.</p>
      <p><a class="text-link" href="/">← Return to the checker</a></p>
    </main>`;
  const terms = `
    <main id="main" class="legal-page">
      <p class="eyebrow">Terms updated 6 September 2026</p>
      <h1 tabindex="-1">Terms</h1>
      <p class="lede">Edit Sidecar Check helps you test a photo handoff. It is not a backup or a promise about another editor.</p>
      <h2>Use and limits</h2>
      <p>The checker reads known metadata and small previews without changing originals.</p>
      <p>Proprietary RAW engines may read the same recipe differently.</p>
      <p>Some apps store fields that this checker cannot see.</p>
      <p>Always back up originals and test representative files.</p>
      <h2>One-time Pro purchase</h2>
      <p>Pro costs $12 once and saves up to 25 reports in this browser.</p>
      <p>The checker and report download stay free.</p>
      <p>Sociobot and Dodo are the merchant of record.</p>
      <p>Refunds are handled there and revoke the license.</p>
      <h2>Warranty</h2>
      <p>The software is provided “as is,” without warranty.</p>
      <p>You remain responsible for originals, backups, exports, and migration choices.</p>
      <p><a class="text-link" href="/">← Return to the checker</a></p>
    </main>`;
  return layout(kind === 'privacy' ? privacy : terms, kind);
}

function fileList(bay: Bay): string {
  const files = state.files[bay];
  if (!files.length) return '<p class="empty-file">No files loaded. Choose a photo set above.</p>';
  return `<ul class="file-list">${files.map(({ id, file, metadata }) => `
    <li>
      <span class="file-type" aria-hidden="true">${escapeHtml(metadata.format)}</span>
      <span><strong>${escapeHtml(file.name)}</strong><small>${(file.size / 1024 / 1024).toFixed(2)} MB · ${metadata.kind}${metadata.width ? ` · ${metadata.width}×${metadata.height}` : ''}</small></span>
      <button class="icon-button" type="button" data-remove="${escapeHtml(id)}" data-bay="${bay}" aria-label="Remove ${escapeHtml(file.name)}">×</button>
    </li>`).join('')}</ul>`;
}

const statusLabels: Record<CheckStatus, string> = {
  survives: '✓ Survives', missing: '× Missing', changed: '↕ Changed', review: '? Review', flattened: '▣ Flattened',
};

function reportHtml(report: CheckReport): string {
  return `
    <section class="report report-${report.outcome}" id="report" aria-labelledby="report-title" tabindex="-1">
      <div class="report-head">
        <div><p class="eyebrow">Handoff report · ${new Date(report.createdAt).toLocaleString()}</p><h2 id="report-title">${report.headline}</h2><p>${report.summary}</p></div>
        <span class="outcome-stamp">${report.outcome === 'ready' ? 'READY' : report.outcome === 'risk' ? 'AT RISK' : 'REVIEW'}</span>
      </div>
      <div class="comparison" role="table" aria-label="Metadata survival comparison">
        <div class="comparison-header" role="row"><span role="columnheader">Check</span><span role="columnheader">Source set</span><span role="columnheader">Handoff set</span><span role="columnheader">Verdict</span></div>
        ${report.rows.map((row, index) => `<div class="comparison-row comparison-row-${index + 1}" role="row">
          <div role="cell" data-label="Check"><strong>${row.field}</strong><small>${row.explanation}</small></div>
          <div role="cell" data-label="Source set">${escapeHtml(row.source)}</div>
          <div role="cell" data-label="Handoff set">${escapeHtml(row.handoff)}</div>
          <div role="cell" data-label="Verdict"><span class="status status-${row.status}">${statusLabels[row.status]}</span></div>
        </div>`).join('')}
      </div>
      <div class="checklist-grid">
        <div><p class="eyebrow">Before a batch</p><h3>Handoff checklist</h3><ol>${report.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol></div>
        <aside><h3>Limits</h3><ul>${report.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></aside>
      </div>
      <div class="report-actions">
        <button type="button" class="button button-primary" data-download>Download report</button>
        <button type="button" class="button button-quiet" data-copy>Copy checklist</button>
        <button type="button" class="button button-quiet" data-save>${state.demo ? 'Save in demo history' : state.license.unlocked ? 'Save to local history' : 'Save to history · Pro'}</button>
      </div>
    </section>`;
}

function historyKey(): string {
  return state.demo ? DEMO_HISTORY_KEY : REAL_HISTORY_KEY;
}

function readHistory(): CheckReport[] {
  try {
    const storage = state.demo ? sessionStorage : localStorage;
    return JSON.parse(storage.getItem(historyKey()) ?? '[]') as CheckReport[];
  } catch {
    return [];
  }
}

function proHtml(): string {
  const saved = readHistory();
  const history = (state.demo || state.license.unlocked) && saved.length ? `<div class="saved-history"><h3>Recent local reports</h3><ul>${saved.slice(0, 5).map((report) => `<li><strong>${escapeHtml(report.sourceFiles[0] ?? 'Source')} → ${escapeHtml(report.handoffFiles[0] ?? 'handoff')}</strong><span>${new Date(report.createdAt).toLocaleDateString()} · ${escapeHtml(report.headline)}</span></li>`).join('')}</ul></div>` : '';
  const restore = state.demo ? `<p class="demo-license">Demo history uses a temporary <code>demo:</code> key. Reset demo clears it.</p>` : `
    <form class="license-form" data-license-form>
      <label for="license">Have a license? Paste it here</label>
      <div><input id="license" name="license" autocomplete="off" spellcheck="false" required><button class="button button-quiet" type="submit">Restore purchase</button></div>
      <p class="license-state" aria-live="polite" data-license-state>${escapeHtml(state.license.message)}${state.license.unlocked ? ` · ${saved.length} saved report${saved.length === 1 ? '' : 's'}` : ''}</p>
    </form>`;
  return `
    <section class="pro-strip" id="pro" aria-labelledby="pro-title">
      <div><p class="eyebrow">Optional local history</p><h2 id="pro-title">Save repeat checks with Pro</h2><p>Pro saves up to 25 handoff reports in this browser. The checker and text report stay free.</p></div>
      <div class="price-block"><strong>$12</strong><span>one-time purchase</span><a class="button button-primary" href="${checkoutUrl()}">Buy Pro</a></div>
      ${restore}
      ${history}
    </section>`;
}

function checkerHtml(): string {
  return `
    <section class="checker" id="checker" aria-labelledby="checker-title">
      <div class="section-heading"><p class="eyebrow">Four-part photo check</p><h2 id="checker-title">Compare a source with its handoff</h2><p>Add the edited source files and the files going to your next photo tool.</p></div>
      <div class="bays">
        <section class="bay" data-drop-bay="source" aria-labelledby="source-title">
          <div class="bay-number" aria-hidden="true">A</div><div><p class="tape-label">SOURCE SET</p><h3 id="source-title">Source and sidecar</h3><p>Add the RAW or DNG you edited. Add its same-name XMP when present.</p>
          <label class="file-pick"><input type="file" multiple data-file-input="source" accept=".dng,.raw,.cr2,.cr3,.nef,.arw,.orf,.rw2,.raf,.pef,.jpg,.jpeg,.tif,.tiff,.png,.webp,.avif,.heic,.heif,.xmp"><span>Choose source files</span><small>or drop them here</small></label></div>
          <div class="file-zone" data-file-list="source">${fileList('source')}</div>
        </section>
        <div class="tape-path" aria-hidden="true"><span></span><b>HANDOFF</b><span></span></div>
        <section class="bay" data-drop-bay="handoff" aria-labelledby="handoff-title">
          <div class="bay-number" aria-hidden="true">B</div><div><p class="tape-label">HANDOFF SET</p><h3 id="handoff-title">Export and sidecar</h3><p>Add the export, copied RAW or DNG, and any XMP going with it.</p>
          <label class="file-pick"><input type="file" multiple data-file-input="handoff" accept=".dng,.raw,.cr2,.cr3,.nef,.arw,.orf,.rw2,.raf,.pef,.jpg,.jpeg,.tif,.tiff,.png,.webp,.avif,.heic,.heif,.xmp"><span>Choose handoff files</span><small>or drop them here</small></label></div>
          <div class="file-zone" data-file-list="handoff">${fileList('handoff')}</div>
        </section>
      </div>
      <div class="run-bar"><div><strong>Files are read in this browser</strong><span>Accepted: ${supportedFormats()}.</span></div><button class="button button-run" type="button" data-run ${state.processing ? 'disabled' : ''}>${state.processing ? 'READING FILES…' : 'RUN 4 CHECKS →'}</button></div>
      <p class="form-status ${state.error ? 'is-error' : ''}" role="status" aria-live="polite" tabindex="-1" data-status>${escapeHtml(state.error || (state.processing ? 'Reading files in this browser.' : 'Add files to both sides, then run the four checks.'))}</p>
    </section>`;
}

function homePage(): string {
  const content = `
    <main id="main">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">Photo handoff check · runs in your browser</p>
          <h1 id="hero-title" tabindex="-1">Check what survives a photo handoff</h1>
          <p class="lede">For photographers moving edited RAW or DNG files between phone and desktop tools, it shows what can survive.</p>
          <div class="hero-actions"><a class="button button-primary" href="/demo">Try it with sample data</a><span>Loads a filled report with one safe transfer and clear evidence.</span></div>
          <a class="secondary-action" href="#checker">Or check your own files</a>
          <ul class="plain-facts" aria-label="Product facts"><li>Files stay in this browser.</li><li>An open check works without a network.</li><li>The checker and report are free. Pro history costs $12 once.</li></ul>
        </div>
        <figure class="hero-art"><picture><source srcset="/assets/handoff-cassette.avif" type="image/avif"><source srcset="/assets/handoff-cassette.webp" type="image/webp"><img src="/assets/handoff-cassette.jpg" width="1280" height="853" alt="A cassette collage links a landscape negative to photo metadata marks" fetchpriority="high" decoding="async"></picture><figcaption><span>A</span> rendered pixels &nbsp; / &nbsp; <span>B</span> portable metadata</figcaption></figure>
      </section>
      ${checkerHtml()}
      ${state.report ? reportHtml(state.report) : ''}
      <section class="how" id="how-it-works" aria-labelledby="how-title"><div><p class="eyebrow">Three steps</p><h2 id="how-title">How it works</h2></div><ol><li><span>01</span><strong>Load source files</strong><p>Add one edited photo and its XMP sidecar when present.</p></li><li><span>02</span><strong>Load handoff files</strong><p>Add the files that another photo tool will receive.</p></li><li><span>03</span><strong>Read four checks</strong><p>Review visible edits, rating, keywords, and capture date before moving a batch.</p></li></ol></section>
      <section class="format-notes" id="format-notes" aria-labelledby="formats-title"><p class="eyebrow">Formats and limits</p><h2 id="formats-title">What the checker reads</h2><div><article><h3>Accepted files</h3><p>Accepts DNG, camera RAW, XMP, JPEG, TIFF, PNG, WebP, HEIC/HEIF, and AVIF.</p></article><article><h3>Known fields</h3><p>Checks rating, keyword, date, and edit fields when those values are present.</p></article><article><h3>What it does not do</h3><p>It does not develop RAW pixels, write metadata, or copy proprietary edit engines.</p></article></div><p class="limits-note">Back up your originals and test one image before moving a batch.</p></section>
      ${proHtml()}
    </main>`;
  return layout(content, 'home');
}

function demoPage(): string {
  const content = `
    <main id="main">
      <section class="demo-intro" aria-labelledby="demo-title"><p class="eyebrow">Bundled Lisbon night sample</p><h1 id="demo-title" tabindex="-1">See what survives this sample handoff</h1><p>This sample sends an edited DNG and XMP to a JPEG with matching portable metadata.</p></section>
      ${state.report ? reportHtml(state.report) : '<section class="demo-loading" aria-live="polite"><h2>Loading the sample report</h2><p>The same local parser used for your files is reading the sample.</p></section>'}
      ${checkerHtml()}
      ${proHtml()}
    </main>`;
  return layout(content, 'demo');
}

function render(preserveFocus?: string, announceRoute = false): void {
  const route = currentRoute();
  root.innerHTML = route === 'privacy' ? legalPage('privacy') : route === 'terms' ? legalPage('terms') : route === 'demo' ? demoPage() : homePage();
  bindPage();
  updateNetworkStatus();
  if (preserveFocus) document.querySelector<HTMLElement>(preserveFocus)?.focus();
  if (announceRoute) {
    const heading = document.querySelector<HTMLElement>('h1');
    heading?.focus({ preventScroll: true });
    const status = document.querySelector<HTMLElement>('[data-route-status]');
    if (status && heading) status.textContent = `${heading.textContent ?? 'Page'} page loaded`;
  }
}

function updateNetworkStatus(): void {
  document.querySelectorAll<HTMLElement>('[data-network]').forEach((node) => { node.textContent = navigator.onLine ? '● Local / online' : '○ Local / offline'; });
}

async function addFiles(bay: Bay, list: FileList | File[]): Promise<void> {
  state.error = '';
  const files = Array.from(list);
  const rejected = files.filter((file) => !acceptsFile(file));
  if (rejected.length) state.error = `Skipped unsupported file${rejected.length === 1 ? '' : 's'}: ${rejected.map((file) => file.name).join(', ')}. Choose a listed photo or XMP format.`;
  state.processing = true;
  render();
  const accepted = files.filter(acceptsFile);
  try {
    const inspected = await Promise.all(accepted.map((file) => inspectFile(file, bay)));
    const existing = new Set(state.files[bay].map((item) => item.id));
    state.files[bay].push(...inspected.filter((item) => !existing.has(item.id)));
  } catch {
    state.error = 'One file could not be read. Choose a valid photo or XMP sidecar, then try again.';
  }
  state.processing = false;
  state.report = undefined;
  render(`[data-file-input="${bay}"]`);
}

function downloadReport(report: CheckReport): void {
  const rows = report.rows.map((row) => `${row.field}: ${statusLabels[row.status]}\n  Source: ${row.source}\n  Handoff: ${row.handoff}\n  ${row.explanation}`).join('\n\n');
  const text = `EDIT SIDECAR CHECK\n${report.headline}\n${report.summary}\nGenerated: ${report.createdAt}\n\nSOURCE FILES\n${report.sourceFiles.join('\n')}\n\nHANDOFF FILES\n${report.handoffFiles.join('\n')}\n\nCHECKS\n${rows}\n\nHANDOFF CHECKLIST\n${report.checklist.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nLIMITS\n${report.caveats.join('\n')}\n`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  link.download = `sidecar-check-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function saveReport(report: CheckReport): void {
  if (!state.demo && !state.license.unlocked) {
    document.querySelector('#pro')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    state.error = 'Pro saves report history in this browser. You can download this report for free.';
    const status = document.querySelector<HTMLElement>('[data-status]');
    if (status) { status.textContent = state.error; status.classList.add('is-error'); status.focus(); }
    return;
  }
  const history = readHistory();
  history.unshift(report);
  const storage = state.demo ? sessionStorage : localStorage;
  storage.setItem(historyKey(), JSON.stringify(history.slice(0, 25)));
  state.license.message = `Saved locally. ${Math.min(history.length, 25)} report${history.length === 1 ? '' : 's'} in history.`;
  render('[data-save]');
}

async function resetDemo(): Promise<void> {
  sessionStorage.removeItem(DEMO_HISTORY_KEY);
  state.demo = true;
  state.files = { source: [], handoff: [] };
  state.report = undefined;
  state.error = '';
  state.processing = true;
  const sample = sampleFiles();
  const [source, handoff] = await Promise.all([
    Promise.all(sample.source.map((file) => inspectFile(file, 'source'))),
    Promise.all(sample.handoff.map((file) => inspectFile(file, 'handoff'))),
  ]);
  state.files = { source, handoff };
  state.report = buildReport(source, handoff);
  state.processing = false;
  state.license = { unlocked: true, checking: false, message: 'Demo history is available in this sandbox.' };
}

async function enterDemo(announce = false): Promise<void> {
  await resetDemo();
  render(undefined, announce);
}

function startReal(announce = false): void {
  sessionStorage.removeItem(DEMO_HISTORY_KEY);
  state.demo = false;
  state.files = { source: [], handoff: [] };
  state.report = undefined;
  state.error = '';
  state.processing = false;
  state.license = initialLicenseState();
  render(undefined, announce);
  if (localStorage.getItem('sb_license:photo-edit-sidecar-check')) void verifyLicense().then((license) => { state.license = license; render(); });
}

function bindPage(): void {
  document.querySelectorAll<HTMLInputElement>('[data-file-input]').forEach((input) => input.addEventListener('change', () => {
    if (input.files) void addFiles(input.dataset.fileInput as Bay, input.files);
  }));
  document.querySelectorAll<HTMLElement>('[data-drop-bay]').forEach((zone) => {
    const bay = zone.dataset.dropBay as Bay;
    zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('is-dragging'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-dragging'));
    zone.addEventListener('drop', (event) => { event.preventDefault(); zone.classList.remove('is-dragging'); if (event.dataTransfer?.files) void addFiles(bay, event.dataTransfer.files); });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((button) => button.addEventListener('click', () => {
    const bay = button.dataset.bay as Bay;
    state.files[bay] = state.files[bay].filter((item) => item.id !== button.dataset.remove);
    state.report = undefined;
    render(`[data-file-input="${bay}"]`);
  }));
  document.querySelector<HTMLButtonElement>('[data-run]')?.addEventListener('click', () => {
    const noSourcePhoto = !state.files.source.some((item) => item.metadata.kind === 'raw' || item.metadata.kind === 'rendered');
    if (noSourcePhoto || !state.files.handoff.length) {
      state.error = noSourcePhoto ? 'Add a source photo in bay A. An XMP alone has no pixel baseline.' : 'Add the exported or copied files in bay B.';
      const status = document.querySelector<HTMLElement>('[data-status]');
      if (status) { status.textContent = state.error; status.classList.add('is-error'); status.focus(); }
      return;
    }
    state.error = '';
    state.report = buildReport(state.files.source, state.files.handoff);
    render('#report');
    document.querySelector('#report')?.scrollIntoView({ block: 'start' });
  });
  document.querySelector<HTMLButtonElement>('[data-download]')?.addEventListener('click', () => { if (state.report) downloadReport(state.report); });
  document.querySelector<HTMLButtonElement>('[data-copy]')?.addEventListener('click', async (event) => {
    if (!state.report) return;
    try {
      await navigator.clipboard.writeText(state.report.checklist.map((item, index) => `${index + 1}. ${item}`).join('\n'));
      (event.currentTarget as HTMLButtonElement).textContent = 'Checklist copied';
    } catch {
      (event.currentTarget as HTMLButtonElement).textContent = 'Copy failed — download the report';
    }
  });
  document.querySelector<HTMLButtonElement>('[data-save]')?.addEventListener('click', () => { if (state.report) saveReport(state.report); });
  document.querySelector<HTMLButtonElement>('[data-reset-demo]')?.addEventListener('click', () => void enterDemo());
  document.querySelector<HTMLButtonElement>('[data-start-real]')?.addEventListener('click', () => {
    history.pushState({}, '', '/');
    startReal(true);
    window.scrollTo(0, 0);
  });
  document.querySelector<HTMLFormElement>('[data-license-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = new FormData(event.currentTarget as HTMLFormElement).get('license');
    if (typeof input !== 'string' || !input.trim()) return;
    storeLicense(input);
    state.license = { unlocked: false, checking: true, message: 'Checking your license…' };
    render('#license');
    state.license = await verifyLicense(true);
    render('#license');
  });
}

async function navigate(url: URL): Promise<void> {
  history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  if (url.pathname === '/demo') {
    await enterDemo(true);
  } else {
    startReal(true);
  }
  if (url.hash) document.querySelector<HTMLElement>(url.hash)?.scrollIntoView();
  else window.scrollTo(0, 0);
}

document.addEventListener('click', (event) => {
  const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="/"]');
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
  const url = new URL(anchor.href);
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname && url.hash) return;
  event.preventDefault();
  void navigate(url);
});

window.addEventListener('popstate', () => {
  if (currentRoute() === 'demo') void enterDemo(true);
  else startReal(true);
});
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

async function start(): Promise<void> {
  if (new URL(location.href).searchParams.get('demo') === '1') history.replaceState({}, '', '/demo');
  if (currentRoute() === 'demo') {
    await enterDemo();
  } else {
    captureReturnedLicense();
    state.license = initialLicenseState();
    render();
    if (localStorage.getItem('sb_license:photo-edit-sidecar-check')) void verifyLicense().then((license) => { state.license = license; render(); });
  }
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => undefined));
}

void start();
