const SLUG = 'photo-edit-sidecar-check';
// Production builds must use the live billing origin. Test purchases belong to
// staging builds only; shipping the pilot origin makes the advertised checkout
// unavailable to real visitors.
export const BILLING_API_BASE = 'https://api.sociobot.in/api/v1';
const TOKEN_KEY = `sb_license:${SLUG}`;
const CACHE_KEY = `sb_license_verdict:${SLUG}`;
const DAY = 86_400_000;

interface CachedVerdict {
  valid: boolean;
  checkedAt: number;
  reason: string;
}

export interface LicenseState {
  unlocked: boolean;
  checking: boolean;
  message: string;
}

function readCache(): CachedVerdict | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '') as CachedVerdict;
    return typeof parsed.valid === 'boolean' && typeof parsed.checkedAt === 'number' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function checkoutUrl(): string {
  return `${BILLING_API_BASE}/products/${SLUG}/checkout`;
}

export function captureReturnedLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.removeItem(CACHE_KEY);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function initialLicenseState(): LicenseState {
  const token = localStorage.getItem(TOKEN_KEY);
  const cache = readCache();
  return {
    unlocked: Boolean(token && cache?.valid),
    checking: Boolean(token),
    message: token && cache?.valid ? 'Pro is unlocked on this browser.' : token ? 'Checking your saved license…' : 'Free check ready.',
  };
}

export async function verifyLicense(force = false): Promise<LicenseState> {
  const token = localStorage.getItem(TOKEN_KEY)?.trim();
  if (!token) return { unlocked: false, checking: false, message: 'Free check ready.' };
  const cache = readCache();
  if (!force && cache && Date.now() - cache.checkedAt < DAY) {
    return { unlocked: cache.valid, checking: false, message: cache.valid ? 'Pro is unlocked on this browser.' : 'This license is no longer active.' };
  }
  if (!navigator.onLine) {
    return { unlocked: Boolean(cache?.valid), checking: false, message: cache?.valid ? 'Pro is unlocked from the last check; verification will resume online.' : 'Connect once to verify this license.' };
  }
  try {
    const response = await fetch(`${BILLING_API_BASE}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('Verification service unavailable');
    const result = await response.json() as { valid?: boolean; reason?: string };
    const verdict = { valid: result.valid === true, reason: result.reason ?? 'invalid', checkedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(verdict));
    return { unlocked: verdict.valid, checking: false, message: verdict.valid ? 'Pro is unlocked on this browser.' : 'This license is no longer active.' };
  } catch {
    return { unlocked: Boolean(cache?.valid), checking: false, message: cache?.valid ? 'Pro remains unlocked from the last successful check.' : 'License check could not connect. The free checker still works.' };
  }
}

export function storeLicense(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.removeItem(CACHE_KEY);
}
