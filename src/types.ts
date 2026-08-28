export type Bay = 'source' | 'handoff';

export interface PhotoMetadata {
  format: string;
  kind: 'sidecar' | 'raw' | 'rendered' | 'unknown';
  width?: number;
  height?: number;
  rating?: number;
  keywords: string[];
  captureDate?: string;
  editSignals: string[];
  hasPixels: boolean;
  pixelSignature?: number[];
  notes: string[];
}

export interface InspectedFile {
  id: string;
  bay: Bay;
  file: File;
  metadata: PhotoMetadata;
}

export type CheckStatus = 'survives' | 'missing' | 'changed' | 'review' | 'flattened';

export interface CheckRow {
  field: 'Visible edits' | 'Rating' | 'Keywords' | 'Capture date';
  status: CheckStatus;
  source: string;
  handoff: string;
  explanation: string;
}

export interface CheckReport {
  createdAt: string;
  outcome: 'ready' | 'risk' | 'review';
  headline: string;
  summary: string;
  rows: CheckRow[];
  checklist: string[];
  caveats: string[];
  sourceFiles: string[];
  handoffFiles: string[];
}
