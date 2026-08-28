import { describe, expect, it } from 'vitest';
import { parseXmpText } from '../src/metadata';
import { buildReport } from '../src/compare';
import type { InspectedFile, PhotoMetadata } from '../src/types';

const xmp = `
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/" xmp:Rating="4" exif:DateTimeOriginal="2025-05-04T13:12:11Z" crs:Exposure2012="+0.55" crs:Contrast2012="12">
      <dc:subject><rdf:Bag><rdf:li>night</rdf:li><rdf:li>Lisbon</rdf:li></rdf:Bag></dc:subject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;

describe('XMP inspection', () => {
  it('extracts portable fields and recognizes develop instructions', () => {
    const result = parseXmpText(xmp);
    expect(result.rating).toBe(4);
    expect(result.keywords).toEqual(['night', 'Lisbon']);
    expect(result.captureDate).toBe('2025-05-04T13:12:11Z');
    expect(result.editSignals[0]).toContain('Adobe Camera Raw');
  });
});

function entry(bay: 'source' | 'handoff', name: string, metadata: Partial<PhotoMetadata>): InspectedFile {
  const full: PhotoMetadata = {
    format: 'DNG', kind: 'raw', keywords: [], editSignals: [], hasPixels: true, notes: [], ...metadata,
  };
  return { id: `${bay}-${name}`, bay, file: new File(['test'], name), metadata: full };
}

describe('handoff report', () => {
  it('flags missing metadata while recognizing a flattened export', () => {
    const source = entry('source', 'frame.dng', { rating: 5, keywords: ['select', 'forest'], captureDate: '2026:02:03 10:20:30', editSignals: ['Adobe Camera Raw settings'] });
    const destination = entry('handoff', 'frame.jpg', { format: 'JPG', kind: 'rendered' });
    const report = buildReport([source], [destination]);
    expect(report.outcome).toBe('risk');
    expect(report.rows.find((row) => row.field === 'Visible edits')?.status).toBe('flattened');
    expect(report.rows.find((row) => row.field === 'Rating')?.status).toBe('missing');
    expect(report.rows.find((row) => row.field === 'Keywords')?.status).toBe('missing');
  });

  it('accepts reordered keyword sets and normalized EXIF dates', () => {
    const source = entry('source', 'frame.dng', { rating: 3, keywords: ['Travel', 'Night'], captureDate: '2026:02:03 10:20:30' });
    const destination = entry('handoff', 'frame.jpg', { format: 'JPG', kind: 'rendered', rating: 3, keywords: ['night', 'travel'], captureDate: '2026-02-03 10:20:30' });
    const report = buildReport([source], [destination]);
    expect(report.rows.slice(1).every((row) => row.status === 'survives')).toBe(true);
    expect(report.outcome).toBe('ready');
  });
});
