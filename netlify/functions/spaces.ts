import { getStore } from '@netlify/blobs';
import { RESERVABLE_SPACES } from '../../src/domain/reservations';
import { readStoredSpace, type PublicSpaceProfile } from '../../src/domain/spaceCatalog';

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

export default async (request: Request) => {
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Método no permitido.' }), { status: 405, headers: { ...headers, Allow: 'GET' } });
  try {
    const store = getStore({ name: 'virla-space-profiles', consistency: 'strong' });
    const records = await Promise.all(RESERVABLE_SPACES.map(async (space) => {
      const value = await store.get('catalog/v1/' + space.id, { type: 'json' });
      const record = value === null ? null : readStoredSpace(value, space.id);
      if (value !== null && !record) throw new Error('Invalid space catalog record: ' + space.id);
      return record;
    }));
    const spaces = records.filter((record): record is PublicSpaceProfile => record !== null);
    return new Response(JSON.stringify({ spaces }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: 'No pudimos consultar las fichas de las salas. Intentá nuevamente.' }), { status: 503, headers });
  }
};
