import { RESERVABLE_SPACES } from './reservations';
import { readStoredSpace, type PublicSpaceProfile } from './spaceCatalog';

export const SPACE_SELECT = 'id,schema_version,status,verified_at,capacity,summary,area,dimensions,height,layout,access,equipment,uses,considerations,stage,sound,lighting,projection,connectivity,backstage,photo_url,photo_alt';

export function parseSupabaseSpaces(body: unknown): PublicSpaceProfile[] {
  if (!Array.isArray(body)) throw new Error('El catálogo de Supabase no es válido.');
  const seen = new Set<string>();
  return body.map((row) => {
    if (!row || typeof row !== 'object') throw new Error('La ficha recibida no es válida.');
    const space = RESERVABLE_SPACES.find((item) => item.id === row.id);
    const parsed = space ? readStoredSpace({
      id: row.id, schemaVersion: row.schema_version, status: row.status, verifiedAt: row.verified_at,
      capacity: row.capacity, summary: row.summary, area: row.area, dimensions: row.dimensions,
      height: row.height, layout: row.layout, access: row.access, equipment: row.equipment,
      uses: row.uses, considerations: row.considerations, photoUrl: row.photo_url, photoAlt: row.photo_alt,
      technical: { stage: row.stage, sound: row.sound, lighting: row.lighting, projection: row.projection, connectivity: row.connectivity, backstage: row.backstage },
    }, space.id) : null;
    if (!parsed || seen.has(parsed.id)) throw new Error('La ficha recibida no es válida.');
    seen.add(parsed.id);
    return parsed;
  });
}
