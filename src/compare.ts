import type { CheckReport, CheckRow, InspectedFile, PhotoMetadata } from './types';

interface CombinedMetadata extends PhotoMetadata {
  filenames: string[];
}

function combine(files: InspectedFile[]): CombinedMetadata {
  const photos = files.filter((item) => item.metadata.kind !== 'sidecar');
  const sidecars = files.filter((item) => item.metadata.kind === 'sidecar');
  const ordered = [...sidecars, ...photos];
  const first = <K extends keyof PhotoMetadata>(key: K): PhotoMetadata[K] | undefined => ordered.map((item) => item.metadata[key]).find((value) => value !== undefined);
  return {
    format: photos.map((item) => item.metadata.format).join(' + ') || sidecars.map((item) => item.metadata.format).join(' + '),
    kind: photos[0]?.metadata.kind ?? sidecars[0]?.metadata.kind ?? 'unknown',
    width: first('width') as number | undefined,
    height: first('height') as number | undefined,
    rating: first('rating') as number | undefined,
    keywords: [...new Set(ordered.flatMap((item) => item.metadata.keywords))],
    captureDate: first('captureDate') as string | undefined,
    editSignals: [...new Set(ordered.flatMap((item) => item.metadata.editSignals))],
    hasPixels: photos.some((item) => item.metadata.hasPixels),
    pixelSignature: photos.map((item) => item.metadata.pixelSignature).find(Boolean),
    notes: [...new Set(files.flatMap((item) => item.metadata.notes))],
    filenames: files.map((item) => item.file.name),
  };
}

function normalizedDate(value?: string): string | undefined {
  return value?.trim().replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(/Z$/, '+00:00');
}

function compareScalar(field: CheckRow['field'], source: string | number | undefined, handoff: string | number | undefined): CheckRow {
  const sourceText = source === undefined || source === '' ? 'Not found' : String(source);
  const handoffText = handoff === undefined || handoff === '' ? 'Not found' : String(handoff);
  if (source === undefined || source === '') return { field, status: 'review', source: sourceText, handoff: handoffText, explanation: `No ${field.toLowerCase()} was found in the source set, so there is no baseline to verify.` };
  if (handoff === undefined || handoff === '') return { field, status: 'missing', source: sourceText, handoff: handoffText, explanation: `${field} exists in the source set but was not found in the handoff files.` };
  if (String(source).toLowerCase() === String(handoff).toLowerCase()) return { field, status: 'survives', source: sourceText, handoff: handoffText, explanation: `${field} matches across the handoff.` };
  return { field, status: 'changed', source: sourceText, handoff: handoffText, explanation: `${field} changed during the handoff. Confirm whether the destination app rewrote it intentionally.` };
}

function compareKeywords(source: string[], handoff: string[]): CheckRow {
  const sourceSet = new Set(source.map((item) => item.toLocaleLowerCase()));
  const handoffSet = new Set(handoff.map((item) => item.toLocaleLowerCase()));
  const missing = source.filter((item) => !handoffSet.has(item.toLocaleLowerCase()));
  const added = handoff.filter((item) => !sourceSet.has(item.toLocaleLowerCase()));
  if (!source.length) return { field: 'Keywords', status: 'review', source: 'None found', handoff: handoff.join(', ') || 'None found', explanation: 'No keywords were found in the source set, so there is no baseline to verify.' };
  if (!handoff.length) return { field: 'Keywords', status: 'missing', source: source.join(', '), handoff: 'None found', explanation: `All ${source.length} source keyword${source.length === 1 ? '' : 's'} are absent from the handoff.` };
  if (!missing.length && !added.length) return { field: 'Keywords', status: 'survives', source: source.join(', '), handoff: handoff.join(', '), explanation: 'The keyword set matches, ignoring order and capitalization.' };
  const details = [missing.length ? `missing: ${missing.join(', ')}` : '', added.length ? `added: ${added.join(', ')}` : ''].filter(Boolean).join('; ');
  return { field: 'Keywords', status: 'changed', source: source.join(', '), handoff: handoff.join(', '), explanation: `The keyword set changed (${details}).` };
}

function signatureDistance(a?: number[], b?: number[]): number | undefined {
  if (!a || !b || a.length !== b.length) return undefined;
  const sum = a.reduce((total, value, index) => total + Math.abs(value - b[index]), 0);
  return sum / (a.length * 255);
}

function compareVisible(source: CombinedMetadata, handoff: CombinedMetadata): CheckRow {
  const destinationRendered = handoff.kind === 'rendered';
  const distance = signatureDistance(source.pixelSignature, handoff.pixelSignature);
  if (destinationRendered) {
    const comparison = distance === undefined ? '' : distance < 0.025 ? ' The small preview is visually very similar to the source.' : ` The small preview differs from the source (${Math.round(distance * 100)}% luminance distance), consistent with a rendered change or resize.`;
    return {
      field: 'Visible edits',
      status: 'flattened',
      source: source.editSignals.length ? 'Edit instructions detected' : `${source.format || 'Source'} pixels`,
      handoff: `Baked into ${handoff.format || 'rendered'} pixels`,
      explanation: `A pixel-bearing export was found. Its visible appearance no longer depends on the source app’s edit recipe.${comparison}`,
    };
  }
  if (source.editSignals.length && handoff.editSignals.length) return {
    field: 'Visible edits', status: 'review', source: source.editSignals.join('; '), handoff: handoff.editSignals.join('; '), explanation: 'Edit instructions exist on both sides, but develop recipes are app-specific. Open one file in the destination app before moving a batch.',
  };
  if (source.editSignals.length) return {
    field: 'Visible edits', status: 'missing', source: source.editSignals.join('; '), handoff: 'No rendered export or edit instructions found', explanation: 'The handoff has neither flattened pixels nor recognizable develop instructions. The edited appearance is at high risk.',
  };
  return {
    field: 'Visible edits', status: 'review', source: source.hasPixels ? `${source.format} pixels; no portable recipe identified` : 'No pixel source found', handoff: handoff.hasPixels ? `${handoff.format} pixels` : 'No rendered export found', explanation: 'The checker cannot prove a visual edit existed in the source. RAW develop recipes are not standardized; compare a test render in the destination app.',
  };
}

export function buildReport(sourceFiles: InspectedFile[], handoffFiles: InspectedFile[]): CheckReport {
  const source = combine(sourceFiles);
  const handoff = combine(handoffFiles);
  const rows: CheckRow[] = [
    compareVisible(source, handoff),
    compareScalar('Rating', source.rating, handoff.rating),
    compareKeywords(source.keywords, handoff.keywords),
    compareScalar('Capture date', normalizedDate(source.captureDate), normalizedDate(handoff.captureDate)),
  ];
  const failures = rows.filter((row) => row.status === 'missing' || row.status === 'changed');
  const reviews = rows.filter((row) => row.status === 'review');
  const outcome = failures.length ? 'risk' : reviews.length ? 'review' : 'ready';
  const headline = outcome === 'risk' ? 'This handoff can lose information' : outcome === 'review' ? 'One manual check remains' : 'This handoff looks ready';
  const summary = failures.length
    ? `${failures.length} of 4 checks need action before a batch move.`
    : reviews.length ? `${reviews.length} of 4 checks cannot be proven from these files alone.` : 'All four portability checks have positive evidence.';
  const checklist = [
    ...(rows[0].status !== 'flattened' ? ['Export one representative image as a full-quality JPEG or TIFF and visually compare it in the destination app.'] : []),
    ...failures.filter((row) => row.field !== 'Visible edits').map((row) => `Fix or deliberately accept the ${row.field.toLowerCase()} mismatch before batch export.`),
    'Keep the untouched original and its same-basename XMP sidecar together until the move is verified.',
    'Test one dark, one bright, and one heavily tagged image before moving the full library.',
    'Back up the source folder; this checker never changes it.',
  ];
  const caveats = [...new Set([...source.notes, ...handoff.notes, 'A matching XMP recipe does not guarantee that another editor interprets it the same way.'])];
  return {
    createdAt: new Date().toISOString(), outcome, headline, summary, rows, checklist, caveats,
    sourceFiles: source.filenames, handoffFiles: handoff.filenames,
  };
}
