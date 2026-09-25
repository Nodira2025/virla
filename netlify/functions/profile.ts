import { getStore } from '@netlify/blobs';
import { createClient } from '@supabase/supabase-js';
import { parsePersonalProfile } from '../../src/domain/personalProfile';

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'Vary': 'Authorization' };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
export default async (request: Request) => {
  if (!['GET', 'PUT'].includes(request.method)) return reply({ error: 'Método no permitido.' }, 405);
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Iniciá sesión para abrir tu perfil.' }, 401);
  try {
    // Only this app's public project configuration; the caller's JWT determines identity.
    const client = createClient('https://iiehofyypkmjbcwqnwlg.supabase.co', 'sb_publishable_GDDQ0FQQaD33OLrWV4660w_rdA-h5IQ', { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !data.user) return reply({ error: 'Tu sesión venció. Volvé a ingresar.' }, 401);
    const role = await client.rpc('virla_role');
    if (role.error || !['admin', 'director', 'staff'].includes(role.data)) return reply({ error: 'Tu cuenta no está habilitada.' }, 403);
    const store = getStore({ name: 'virla-personal-profiles', consistency: 'strong' });
    const key = 'members/' + data.user.id;
    if (request.method === 'GET') return reply({ profile: await store.get(key, { type: 'json' }) });
    const text = await request.text();
    if (text.length > 190000) return reply({ error: 'La foto es demasiado grande.' }, 413);
    let input: unknown;
    try { input = JSON.parse(text); } catch { return reply({ error: 'Datos de perfil inválidos.' }, 400); }
    const profile = parsePersonalProfile(input);
    if (!profile) return reply({ error: 'Revisá nombre, contacto y foto del perfil.' }, 400);
    profile.updatedAt = new Date().toISOString();
    await store.setJSON(key, profile);
    return reply({ profile });
  } catch { return reply({ error: 'No pudimos acceder a tu perfil. Intentá nuevamente.' }, 503); }
};
