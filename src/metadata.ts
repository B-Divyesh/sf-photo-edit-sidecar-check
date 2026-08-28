import type { Bay, InspectedFile, PhotoMetadata } from './types';

const RAW_EXTENSIONS = new Set(['dng', 'raw', 'cr2', 'cr3', 'nef', 'arw', 'orf', 'rw2', 'raf', 'pef']);
const RENDERED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif', 'tif', 'tiff']);
const SIDECAR_EXTENSIONS = new Set(['xmp']);
const MAX_READ = 24 * 1024 * 1024;

function extension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function cleanXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return cleanXml(match[1]);
  }
  return undefined;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => cleanXml(value)).filter(Boolean))];
}

export function parseXmpText(text: string): Pick<PhotoMetadata, 'rating' | 'keywords' | 'captureDate' | 'editSignals' | 'notes'> {
  const ratingText = firstMatch(text, [
    /\bxmp:Rating=["'](-?\d+)["']/i,
    /<xmp:Rating[^>]*>(-?\d+)<\/xmp:Rating>/i,
    /\bMicrosoftPhoto:Rating=["'](\d+)["']/i,
  ]);
  const rating = ratingText === undefined ? undefined : Math.max(0, Math.min(5, Number(ratingText)));
  const subject = /<dc:subject[^>]*>([\s\S]*?)<\/dc:subject>/i.exec(text)?.[1] ?? '';
  const hierarchical = /<lr:hierarchicalSubject[^>]*>([\s\S]*?)<\/lr:hierarchicalSubject>/i.exec(text)?.[1] ?? '';
  const keywords = unique([...subject.matchAll(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/gi)].map((match) => match[1])
    .concat([...hierarchical.matchAll(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/gi)].map((match) => match[1])));
  const captureDate = firstMatch(text, [
    /\bexif:DateTimeOriginal=["']([^"']+)["']/i,
    /<exif:DateTimeOriginal[^>]*>([^<]+)</i,
    /\bphotoshop:DateCreated=["']([^"']+)["']/i,
    /\bxmp:CreateDate=["']([^"']+)["']/i,
  ]);

  const editSignals: string[] = [];
  const cameraRaw = [...text.matchAll(/(?:\bcrs:([A-Za-z][\w-]*)\s*=|<crs:([A-Za-z][\w-]*)\b)/gi)].map((match) => match[1] ?? match[2]);
  if (cameraRaw.length) editSignals.push(`Adobe Camera Raw settings (${unique(cameraRaw).slice(0, 4).join(', ')})`);
  if (/\bdarktable:(history|history_params|xmp_version|mask)/i.test(text)) editSignals.push('darktable history instructions');
  if (/\b(?:crs:HasSettings=["']True|crs:AlreadyApplied=["']False)/i.test(text) && !cameraRaw.length) editSignals.push('Camera Raw develop instructions');
  const notes: string[] = [];
  if (/snapseed/i.test(text) && editSignals.length === 0) notes.push('Snapseed marker found, but no portable develop instructions were identified.');

  return { rating, keywords, captureDate, editSignals: unique(editSignals), notes };
}

function ascii(buffer: ArrayBuffer): string {
  return new TextDecoder('latin1').decode(buffer);
}

function findEmbeddedXmp(buffer: ArrayBuffer): string | undefined {
  const text = ascii(buffer);
  const start = text.search(/<\?xpacket|<x:xmpmeta|<rdf:RDF/i);
  if (start < 0) return undefined;
  const endPatterns = ['<?xpacket end=', '</x:xmpmeta>', '</rdf:RDF>'];
  let end = -1;
  for (const marker of endPatterns) {
    const position = text.indexOf(marker, start);
    if (position >= 0) end = Math.max(end, position + marker.length + 16);
  }
  const finish = end > start ? Math.min(end, text.length) : Math.min(start + 2_000_000, text.length);
  return new TextDecoder().decode(new Uint8Array(buffer, start, finish - start));
}

interface TiffResult {
  width?: number;
  height?: number;
  rating?: number;
  captureDate?: string;
  keywords: string[];
}

function parseTiff(buffer: ArrayBuffer, base = 0): TiffResult {
  const view = new DataView(buffer);
  const result: TiffResult = { keywords: [] };
  if (base + 8 > view.byteLength) return result;
  const order = String.fromCharCode(view.getUint8(base), view.getUint8(base + 1));
  const little = order === 'II';
  if (!little && order !== 'MM') return result;
  const u16 = (offset: number) => view.getUint16(offset, little);
  const u32 = (offset: number) => view.getUint32(offset, little);
  if (u16(base + 2) !== 42) return result;

  const typeSize: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  const visited = new Set<number>();
  const readValue = (entry: number, type: number, count: number): number | string | undefined => {
    const bytes = (typeSize[type] ?? 1) * count;
    let position = entry + 8;
    if (bytes > 4) position = base + u32(entry + 8);
    if (position < 0 || position + bytes > view.byteLength) return undefined;
    if (type === 2) return new TextDecoder().decode(new Uint8Array(buffer, position, count)).replace(/\0+$/, '').trim();
    if (type === 3) return u16(position);
    if (type === 4) return u32(position);
    return undefined;
  };
  const readIfd = (offset: number, depth: number) => {
    const position = base + offset;
    if (depth > 3 || visited.has(position) || position + 2 > view.byteLength) return;
    visited.add(position);
    const count = Math.min(u16(position), 2048);
    for (let i = 0; i < count; i += 1) {
      const entry = position + 2 + i * 12;
      if (entry + 12 > view.byteLength) break;
      const tag = u16(entry);
      const type = u16(entry + 2);
      const valueCount = u32(entry + 4);
      const value = readValue(entry, type, valueCount);
      if (tag === 256 && typeof value === 'number') result.width = value;
      if (tag === 257 && typeof value === 'number') result.height = value;
      if ((tag === 306 || tag === 36867) && typeof value === 'string') result.captureDate = value;
      if (tag === 18246 && typeof value === 'number') result.rating = Math.max(0, Math.min(5, value));
      if ((tag === 34665 || tag === 34853) && typeof value === 'number') readIfd(value, depth + 1);
      if (tag === 40094) {
        const byteCount = (typeSize[type] ?? 1) * valueCount;
        const valuePosition = byteCount > 4 ? base + u32(entry + 8) : entry + 8;
        if (valuePosition + byteCount <= view.byteLength) {
          const decoded = new TextDecoder('utf-16le').decode(new Uint8Array(buffer, valuePosition, byteCount)).replace(/\0/g, '');
          result.keywords.push(...decoded.split(/[;,]/).map((item) => item.trim()).filter(Boolean));
        }
      }
    }
  };
  const firstIfd = u32(base + 4);
  if (firstIfd > 0) readIfd(firstIfd, 0);
  result.keywords = unique(result.keywords);
  return result;
}

function parseJpeg(buffer: ArrayBuffer): TiffResult {
  const view = new DataView(buffer);
  const result: TiffResult = { keywords: [] };
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return result;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xda || marker === 0xd9) break;
    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > view.byteLength) break;
    if (marker === 0xe1 && ascii(buffer.slice(offset + 4, offset + 10)).startsWith('Exif')) Object.assign(result, parseTiff(buffer, offset + 10));
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
      result.height = view.getUint16(offset + 5);
      result.width = view.getUint16(offset + 7);
    }
    offset += 2 + length;
  }
  return result;
}

async function pixelSignature(file: File): Promise<number[] | undefined> {
  if (!('createImageBitmap' in globalThis) || typeof OffscreenCanvas === 'undefined') return undefined;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(16, 16);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return undefined;
    context.drawImage(bitmap, 0, 0, 16, 16);
    bitmap.close();
    const data = context.getImageData(0, 0, 16, 16).data;
    const signature: number[] = [];
    for (let index = 0; index < data.length; index += 16) {
      let luminance = 0;
      for (let pixel = 0; pixel < 4; pixel += 1) {
        const at = index + pixel * 4;
        luminance += data[at] * 0.2126 + data[at + 1] * 0.7152 + data[at + 2] * 0.0722;
      }
      signature.push(Math.round(luminance / 4));
    }
    return signature;
  } catch {
    return undefined;
  }
}

export async function inspectFile(file: File, bay: Bay): Promise<InspectedFile> {
  const ext = extension(file.name);
  const kind = SIDECAR_EXTENSIONS.has(ext) ? 'sidecar' : RAW_EXTENSIONS.has(ext) ? 'raw' : RENDERED_EXTENSIONS.has(ext) ? 'rendered' : 'unknown';
  const buffer = await file.slice(0, Math.min(file.size, MAX_READ)).arrayBuffer();
  let base: TiffResult = { keywords: [] };
  if (ext === 'jpg' || ext === 'jpeg') base = parseJpeg(buffer);
  if (ext === 'dng' || ext === 'tif' || ext === 'tiff') base = parseTiff(buffer);
  const xmpText = ext === 'xmp' ? new TextDecoder().decode(buffer) : findEmbeddedXmp(buffer);
  const xmp = xmpText ? parseXmpText(xmpText) : { keywords: [], editSignals: [], notes: [] };
  const notes = [...xmp.notes];
  if (file.size > MAX_READ) notes.push('Metadata scan was limited to the first 24 MB; large previews remain untouched.');
  if (kind === 'unknown') notes.push(`.${ext || 'unknown'} is not a recognized photo or XMP format.`);
  if (kind === 'raw' && !xmpText) notes.push('RAW pixels are preserved, but this browser cannot render proprietary develop settings.');
  const metadata: PhotoMetadata = {
    format: ext ? ext.toUpperCase() : 'UNKNOWN',
    kind,
    width: base.width,
    height: base.height,
    rating: xmp.rating ?? base.rating,
    keywords: unique([...base.keywords, ...xmp.keywords]),
    captureDate: xmp.captureDate ?? base.captureDate,
    editSignals: xmp.editSignals,
    hasPixels: kind === 'raw' || kind === 'rendered',
    pixelSignature: kind === 'rendered' ? await pixelSignature(file) : undefined,
    notes,
  };
  return { id: `${bay}-${file.name}-${file.size}-${file.lastModified}`, bay, file, metadata };
}

export function acceptsFile(file: File): boolean {
  return RAW_EXTENSIONS.has(extension(file.name)) || RENDERED_EXTENSIONS.has(extension(file.name)) || SIDECAR_EXTENSIONS.has(extension(file.name));
}

export function supportedFormats(): string {
  return 'DNG, common camera RAW, JPEG, TIFF, PNG, WebP, HEIC/HEIF, AVIF, and XMP';
}
