export interface PersonalProfile { name: string; contact: string; area: string; photo: string; updatedAt?: string }
export function parsePersonalProfile(value: unknown): PersonalProfile | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== 'string' || !v.name.trim() || v.name.length > 80 || typeof v.contact !== 'string' || v.contact.trim().length < 6 || v.contact.length > 120 || typeof v.area !== 'string' || v.area.length > 100 || typeof v.photo !== 'string') return null;
  if (v.photo && (v.photo.length > 180000 || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(v.photo))) return null;
  return { name: v.name.trim(), contact: v.contact.trim(), area: v.area.trim(), photo: v.photo, ...(typeof v.updatedAt === 'string' ? { updatedAt: v.updatedAt } : {}) };
}
