import { readStoredSpace, type PublicSpaceProfile } from '../domain/spaceCatalog';
import { RESERVABLE_SPACES } from '../domain/reservations';
import { spaceCatalogBackend, supabaseRead } from '../infrastructure/supabase';
import { parseSupabaseSpaces, SPACE_SELECT } from '../domain/supabaseSpaces';

export async function fetchSpaceCatalog(signal?: AbortSignal): Promise<PublicSpaceProfile[]> {
  if (spaceCatalogBackend === 'supabase') {
    const body = await supabaseRead('/rest/v1/virla_space_profiles?select=' + SPACE_SELECT + '&order=id.asc', signal);
    return parseSupabaseSpaces(body);
  }
  if (spaceCatalogBackend !== 'netlify') throw new Error('El origen del catálogo no está configurado correctamente.');
  const response = await fetch('/api/spaces', { headers: { Accept: 'application/json' }, signal });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('No se pudo consultar el catálogo de salas.');
  const body = await response.json();
  if (!body || !Array.isArray(body.spaces)) throw new Error('La respuesta del catálogo no es válida.');
  const records: PublicSpaceProfile[] = [];
  for (const entry of body.spaces) {
    const space = RESERVABLE_SPACES.find((item) => item.id === entry?.id);
    const parsed = space ? readStoredSpace(entry, space.id) : null;
    if (!parsed || records.some((record) => record.id === parsed.id)) throw new Error('La ficha recibida no es válida.');
    records.push(parsed);
  }
  return records;
}
