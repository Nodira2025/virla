import { getReservableSpace, type ReservableSpaceId } from './reservations';

export const TECHNICAL_SECTIONS = ['stage', 'sound', 'lighting', 'projection', 'connectivity', 'backstage'] as const;
export type TechnicalSection = (typeof TECHNICAL_SECTIONS)[number];

export interface PublicSpaceProfile {
  schemaVersion: 1;
  id: ReservableSpaceId;
  name: string;
  status: 'demo' | 'pending' | 'verified';
  verifiedAt?: string;
  capacity: number | null;
  summary: string;
  area: string;
  dimensions: string;
  height: string;
  layout: string;
  access: string;
  equipment: string[];
  uses: string[];
  considerations: string;
  technical: Record<TechnicalSection, string>;
  photoUrl?: string;
  photoAlt?: string;
}

export interface SpaceCatalogResponse { spaces: PublicSpaceProfile[] }
const clean = (value: unknown, maxLength = 1500) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
const strings = (value: unknown) => Array.isArray(value) ? value.slice(0, 30).map((item) => clean(item, 300)).filter(Boolean) : [];

export function safeSpacePhoto(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (/^\/(?:images|photos)\/[\w./-]+$/.test(value) && !value.includes('..')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

// Whitelist public fields. Demo records are never read from the persistent catalog.
export function readStoredSpace(value: unknown, expectedId: ReservableSpaceId): PublicSpaceProfile | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const space = getReservableSpace(expectedId);
  if (!space || raw.id !== expectedId || raw.schemaVersion !== 1 || (raw.status !== 'pending' && raw.status !== 'verified')) return null;
  const verifiedAt = clean(raw.verifiedAt, 40);
  if (raw.status === 'verified' && (!verifiedAt || !Number.isFinite(Date.parse(verifiedAt)))) return null;
  const rawTechnical = raw.technical && typeof raw.technical === 'object' ? raw.technical as Record<string, unknown> : {};
  return {
    schemaVersion: 1, id: space.id, name: space.name, status: raw.status,
    verifiedAt: raw.status === 'verified' ? verifiedAt : undefined,
    capacity: typeof raw.capacity === 'number' && Number.isInteger(raw.capacity) && raw.capacity > 0 && raw.capacity <= 100_000 ? raw.capacity : null,
    summary: clean(raw.summary), area: clean(raw.area, 100), dimensions: clean(raw.dimensions, 300), height: clean(raw.height, 100),
    layout: clean(raw.layout), access: clean(raw.access), equipment: strings(raw.equipment), uses: strings(raw.uses), considerations: clean(raw.considerations),
    technical: Object.fromEntries(TECHNICAL_SECTIONS.map((key) => [key, clean(rawTechnical[key])])) as Record<TechnicalSection, string>,
    photoUrl: safeSpacePhoto(raw.photoUrl), photoAlt: clean(raw.photoAlt, 200) || undefined,
  };
}
