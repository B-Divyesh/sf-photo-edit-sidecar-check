import './style.css';
import { acceptsFile, inspectFile, supportedFormats } from './metadata';
import { buildReport } from './compare';
import { captureReturnedLicense, checkoutUrl, initialLicenseState, storeLicense, verifyLicense, type LicenseState } from './license';
import type { Bay, CheckReport, CheckStatus, InspectedFile } from './types';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application mount not found');
const root = app;

const state: {
  files: Record<Bay, InspectedFile[]>;
  report?: CheckReport;
  license: LicenseState;
  processing: boolean;
  error: string;
} = {
  files: { source: [], handoff: [] },
  license: initialLicenseState(),
  processing: false,
  error: '',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function layout(content: string, route: 'home' | 'privacy' | 'terms'): string {
  const title = route === 'home' ? 'Edit Sidecar Check — Photo handoff preflight' : `${route === 'privacy' ? 'Privacy' : 'Terms'} — Edit Sidecar Check`;
  document.title = title;
  return `
    <header class="site-header">
      <a class="wordmark" href="/" aria-label="Edit Sidecar Check home"><span class="reels" aria-hidden="true">●—●</span> EDIT SIDECAR CHECK</a>
      <nav aria-label="Primary navigation">
        <a href="/${route === 'home' ? '#how-it-works' : ''}">How it works</a>
        <a href="/${route === 'home' ? '#format-notes' : ''}">Format notes</a>
        <span class="network-status" data-network>${navigator.onLine ? '● Local / online' : '○ Local / offline'}</span>
      </nav>
    </header>
    ${content}
    <footer>
      <div><span class="footer-mark">A ⇢ B</span><p>Files stay on this device. No uploads, no tracking.</p></div>
      <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="https://github.com/B-Divyesh/sf-photo-edit-sidecar-check">Source</a></nav>
      <p class="asset-note">Hero art is an original AI-generated collage for this product.</p>
    </footer>`;
}

function legalPage(kind: 'privacy' | 'terms'): string {
  const privacy = `
    <main id="main" class="legal-page">
      <p class="eyebrow">Plain-language policy / 27 Aug 2026</p>
      <h1>Privacy</h1>
      <p class="lede">Your photographs and sidecars are inspected inside your browser. They are not uploaded to us.</p>
      <h2>What stays on your device</h2>
      <p>Photo bytes, XMP content, comparison results, downloaded checklists, and Pro report history remain on your device. The browser may store the app shell for offline use.</p>
      <h2>License checks</h2>
      <p>If you buy or restore Pro, the license token and a dated verification result are stored in localStorage. Verification sends only that token to the Sociobot billing API. Sociobot/Dodo is the merchant of record and handles checkout data under its own policy.</p>
      <h2>Analytics and deletion</h2>
      <p>This version includes no analytics, advertising, cookies, or tracking scripts. Clear this site’s browser storage to remove saved licenses and local report history.</p>
      <p><a class="text-link" href="/">← Return to the checker</a></p>
    </main>`;
  const terms = `
    <main id="main" class="legal-page">
      <p class="eyebrow">Plain-language terms / 27 Aug 2026</p>
      <h1>Terms</h1>
      <p class="lede">Edit Sidecar Check is a preflight aid, not a backup or a guarantee of another editor’s behavior.</p>
      <h2>Use and limits</h2>
      <p>The checker reads recognizable metadata and small visual previews without changing originals. Proprietary RAW engines may interpret the same recipe differently or store data the checker cannot see. Always back up and test representative files.</p>
      <h2>One-time Pro purchase</h2>
      <p>Pro is a $12 one-time license for saved local report history and workflow presets. The free checker and report download remain available. Sociobot/Dodo is the merchant of record; refunds are handled there and revoke the associated license.</p>
      <h2>Warranty</h2>
      <p>The software is provided “as is,” without warranty. You remain responsible for originals, backups, exports, and migration decisions. See the MIT License in the source repository.</p>
      <p><a class="text-link" href="/">← Return to the checker</a></p>
    </main>`;
  return layout(kind === 'privacy' ? privacy : terms, kind);
}

function fileList(bay: Bay): string {
  const files = state.files[bay];
  if (!files.length) return `<p class="empty-file">No files loaded yet.</p>`;
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
    <section class="report report-${report.outcome}" id="report" aria-labelledby="report-title">
      <div class="report-head">
        <div><p class="eyebrow">Handoff report / ${new Date(report.createdAt).toLocaleString()}</p><h2 id="report-title">${report.headline}</h2><p>${report.summary}</p></div>
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
        <div><p class="eyebrow">Do this before the batch</p><h3>Handoff checklist</h3><ol>${report.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol></div>
        <aside><h3>Limits noted</h3><ul>${report.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></aside>
      </div>
      <div class="report-actions">
        <button type="button" class="button button-primary" data-download>Download report</button>
        <button type="button" class="button button-quiet" data-copy>Copy checklist</button>
        <button type="button" class="button button-quiet" data-save>${state.license.unlocked ? 'Save to local history' : 'Save to history · Pro'}</button>
      </div>
    </section>`;
}

function proHtml(): string {
  let saved: CheckReport[] = [];
  try { saved = JSON.parse(localStorage.getItem('sidecar-check:history') ?? '[]') as CheckReport[]; } catch { /* empty */ }
  const history = state.license.unlocked && saved.length ? `<div class="saved-history"><h3>Recent local reports</h3><ul>${saved.slice(0, 5).map((report) => `<li><strong>${escapeHtml(report.sourceFiles[0] ?? 'Source')} → ${escapeHtml(report.handoffFiles[0] ?? 'handoff')}</strong><span>${new Date(report.createdAt).toLocaleDateString()} · ${escapeHtml(report.headline)}</span></li>`).join('')}</ul></div>` : '';
  return `
    <section class="pro-strip" id="pro" aria-labelledby="pro-title">
      <div><p class="eyebrow">Optional desk upgrade</p><h2 id="pro-title">Keep a workflow log</h2><p>Pro keeps up to 25 handoff reports in this browser for repeat workflow checks. The checker and report downloads stay free.</p></div>
      <div class="price-block"><strong>$12</strong><span>one-time</span><a class="button button-primary" href="${checkoutUrl()}">Buy Pro</a></div>
      <form class="license-form" data-license-form>
        <label for="license">Have a license? Paste it here</label>
        <div><input id="license" name="license" autocomplete="off" spellcheck="false" required><button class="button button-quiet" type="submit">Restore purchase</button></div>
        <p class="license-state" data-license-state>${escapeHtml(state.license.message)}${state.license.unlocked ? ` · ${saved.length} saved report${saved.length === 1 ? '' : 's'}` : ''}</p>
      </form>
      ${history}
    </section>`;
}

function homePage(): string {
  const content = `
    <main id="main">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy"><p class="eyebrow">Photo handoff preflight / runs on your device</p><h1 id="hero-title">Know what survives<br><em>before</em> you export.</h1><p class="lede">Compare a RAW or DNG plus its sidecar against the files you plan to hand off. See whether visible edits, ratings, keywords, and capture date make the trip.</p><a class="button button-primary" href="#checker">Check a handoff</a><p class="microcopy">No upload. No account. Originals remain untouched.</p></div>
        <figure class="hero-art"><picture><source srcset="/assets/handoff-cassette.avif" type="image/avif"><source srcset="/assets/handoff-cassette.webp" type="image/webp"><img src="/assets/handoff-cassette.jpg" width="1280" height="853" alt="An open cassette collage with a landscape negative on one reel and metadata marks on the other" fetchpriority="high" decoding="async"></picture><figcaption><span>A</span> rendered pixels &nbsp; / &nbsp; <span>B</span> portable metadata</figcaption></figure>
      </section>
      <section class="checker" id="checker" aria-labelledby="checker-title">
        <div class="section-heading"><p class="eyebrow">Inspection bench 01</p><h2 id="checker-title">Load one before-and-after set</h2><p>Add the original and any XMP beside it, then add the export or files arriving in the next app.</p></div>
        <div class="bays">
          <section class="bay" data-drop-bay="source" aria-labelledby="source-title">
            <div class="bay-number" aria-hidden="true">A</div><div><p class="tape-label">ORIGINAL SET</p><h3 id="source-title">Source + sidecar</h3><p>The RAW/DNG you edited and its same-name <code>.xmp</code>, if present.</p>
            <label class="file-pick"><input type="file" multiple data-file-input="source" accept=".dng,.raw,.cr2,.cr3,.nef,.arw,.orf,.rw2,.raf,.pef,.jpg,.jpeg,.tif,.tiff,.png,.webp,.avif,.heic,.heif,.xmp"><span>Choose source files</span><small>or drop them here</small></label></div>
            <div class="file-zone" data-file-list="source">${fileList('source')}</div>
          </section>
          <div class="tape-path" aria-hidden="true"><span></span><b>HANDOFF</b><span></span></div>
          <section class="bay" data-drop-bay="handoff" aria-labelledby="handoff-title">
            <div class="bay-number" aria-hidden="true">B</div><div><p class="tape-label">DESTINATION SET</p><h3 id="handoff-title">Export + sidecar</h3><p>The flattened export, copied RAW/DNG, and any XMP being handed off.</p>
            <label class="file-pick"><input type="file" multiple data-file-input="handoff" accept=".dng,.raw,.cr2,.cr3,.nef,.arw,.orf,.rw2,.raf,.pef,.jpg,.jpeg,.tif,.tiff,.png,.webp,.avif,.heic,.heif,.xmp"><span>Choose handoff files</span><small>or drop them here</small></label></div>
            <div class="file-zone" data-file-list="handoff">${fileList('handoff')}</div>
          </section>
        </div>
        <div class="run-bar"><div><strong>Everything is read locally</strong><span>Supported: ${supportedFormats()}.</span></div><button class="button button-run" type="button" data-run ${state.processing ? 'disabled' : ''}>${state.processing ? 'READING FILES…' : 'RUN 4 CHECKS →'}</button></div>
        <p class="form-status ${state.error ? 'is-error' : ''}" role="status" aria-live="polite" data-status>${escapeHtml(state.error || (state.processing ? 'Inspecting files locally. Nothing is being uploaded.' : 'Ready when both bays contain files.'))}</p>
      </section>
      ${state.report ? reportHtml(state.report) : ''}
      <section class="how" id="how-it-works" aria-labelledby="how-title"><div><p class="eyebrow">Read the tape path</p><h2 id="how-title">Pixels and recipes are not the same thing</h2></div><ol><li><span>01</span><strong>Rendered pixels</strong><p>A JPEG or TIFF bakes the current look into pixels. It is portable, but no longer a flexible RAW recipe.</p></li><li><span>02</span><strong>Develop instructions</strong><p>XMP can carry sliders and masks, but another editor may ignore or reinterpret app-specific fields.</p></li><li><span>03</span><strong>Portable metadata</strong><p>Ratings, keywords, and dates are more standardized, yet exports can still omit or rewrite them.</p></li></ol></section>
      <section class="format-notes" id="format-notes" aria-labelledby="formats-title"><p class="eyebrow">Known format limits</p><h2 id="formats-title">Honest by format</h2><div><article><h3>RAW / DNG</h3><p>Reads TIFF/EXIF and embedded XMP where exposed. It does not develop RAW pixels or emulate proprietary editing engines.</p></article><article><h3>XMP sidecars</h3><p>Recognizes common rating, keyword, date, Adobe Camera Raw, and darktable signals. A recipe’s presence is not a compatibility promise.</p></article><article><h3>JPEG / TIFF</h3><p>Confirms pixel-bearing exports and reads common EXIF/XMP. Browser-decodable images also get a tiny local visual-distance check.</p></article></div></section>
      ${proHtml()}
    </main>`;
  return layout(content, 'home');
}

function bindNetwork(): void {
  const update = () => document.querySelectorAll<HTMLElement>('[data-network]').forEach((node) => { node.textContent = navigator.onLine ? '● Local / online' : '○ Local / offline'; });
  window.addEventListener('online', update, { once: true });
  window.addEventListener('offline', update, { once: true });
}

function render(preserveFocus?: string): void {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  root.innerHTML = path === '/privacy' ? legalPage('privacy') : path === '/terms' ? legalPage('terms') : homePage();
  bindNetwork();
  if (path === '/') bindHome();
  if (preserveFocus) document.querySelector<HTMLElement>(preserveFocus)?.focus();
}

async function addFiles(bay: Bay, list: FileList | File[]): Promise<void> {
  state.error = '';
  const files = Array.from(list);
  const rejected = files.filter((file) => !acceptsFile(file));
  if (rejected.length) state.error = `Skipped unsupported file${rejected.length === 1 ? '' : 's'}: ${rejected.map((file) => file.name).join(', ')}.`;
  state.processing = true;
  render();
  const accepted = files.filter(acceptsFile);
  try {
    const inspected = await Promise.all(accepted.map((file) => inspectFile(file, bay)));
    const existing = new Set(state.files[bay].map((item) => item.id));
    state.files[bay].push(...inspected.filter((item) => !existing.has(item.id)));
  } catch {
    state.error = 'One file could not be read. Check that it is a valid photo or XMP sidecar and try again.';
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
  if (!state.license.unlocked) {
    document.querySelector('#pro')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    state.error = 'Pro saves report history locally. You can still download this report for free.';
    const status = document.querySelector<HTMLElement>('[data-status]');
    if (status) { status.textContent = state.error; status.classList.add('is-error'); }
    return;
  }
  let history: CheckReport[] = [];
  try { history = JSON.parse(localStorage.getItem('sidecar-check:history') ?? '[]') as CheckReport[]; } catch { /* start over */ }
  history.unshift(report);
  localStorage.setItem('sidecar-check:history', JSON.stringify(history.slice(0, 25)));
  state.license.message = `Saved locally. ${Math.min(history.length, 25)} report${history.length === 1 ? '' : 's'} in history.`;
  render('#pro');
}

function bindHome(): void {
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
    await navigator.clipboard.writeText(state.report.checklist.map((item, index) => `${index + 1}. ${item}`).join('\n'));
    (event.currentTarget as HTMLButtonElement).textContent = 'Copied';
  });
  document.querySelector<HTMLButtonElement>('[data-save]')?.addEventListener('click', () => { if (state.report) saveReport(state.report); });
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

document.addEventListener('click', (event) => {
  const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="/"]');
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
  const url = new URL(anchor.href);
  if (url.origin !== location.origin || url.pathname === '/' && url.hash) return;
  event.preventDefault();
  history.pushState({}, '', `${url.pathname}${url.hash}`);
  render();
  window.scrollTo(0, 0);
});
window.addEventListener('popstate', () => render());

captureReturnedLicense();
render();
if (localStorage.getItem('sb_license:photo-edit-sidecar-check')) void verifyLicense().then((license) => { state.license = license; render(); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => undefined));
