import { createClient, type SupabaseClient } from '@supabase/supabase-js';
interface SupabaseConfig { url: string; publishableKey: string }
let client: SupabaseClient | undefined;
export function getSupabase(): SupabaseClient {
  if (!client) { const config = getSupabaseConfig(); client = createClient(config.url, config.publishableKey); }
  return client;
}

export const spaceCatalogBackend = import.meta.env.VITE_SPACE_CATALOG_BACKEND || 'netlify';

export function getSupabaseConfig(): SupabaseConfig {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key || !key.startsWith('sb_publishable_')) throw new Error('Falta configurar la conexión pública con Supabase.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) throw new Error('La dirección de Supabase no es válida.');
  return { url: parsed.origin, publishableKey: key };
}

export async function supabaseRead(path: string, signal?: AbortSignal): Promise<unknown> {
  if (!path.startsWith('/rest/v1/')) throw new Error('Ruta de consulta no permitida.');
  const config = getSupabaseConfig();
  const { data: { session } } = await getSupabase().auth.getSession();
  const response = await fetch(config.url + path, { headers: { apikey: config.publishableKey, Accept: 'application/json', ...(session ? { Authorization: 'Bearer ' + session.access_token } : {}) }, signal });
  if (!response.ok) {
    if (response.status === 404) throw new Error('Todavía falta crear el catálogo de salas en Supabase.');
    if (response.status === 401 || response.status === 403) throw new Error('Supabase no autorizó la consulta del catálogo.');
    throw new Error('No pudimos consultar el catálogo de Supabase.');
  }
  return response.json();
}
