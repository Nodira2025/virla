import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const readEnv = (file) => Object.fromEntries(readFileSync(new URL('../' + file, import.meta.url), 'utf8').split(/\r?\n/).filter((line) => line.includes('=') && !line.startsWith('#')).map((line) => { const i = line.indexOf('='); return [line.slice(0, i).replace(/^\uFEFF/, ''), line.slice(i + 1).trim()]; }));
const config = readEnv('.env.local');
const credentials = readEnv('.env.test-users.local');
if (new URL(config.VITE_SUPABASE_URL).hostname !== 'iiehofyypkmjbcwqnwlg.supabase.co') throw new Error('Proyecto no autorizado.');
for (const [username, expectedRole] of [['director', 'director'], ['personal', 'staff'], ['admin', 'admin']]) {
  const client = createClient(config.VITE_SUPABASE_URL, config.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: username + '@pruebas.virla.invalid', password: credentials[username.toUpperCase() + '_PASSWORD'] });
  if (error || !data.session) { console.log(JSON.stringify({ username, login: false, error: error?.message })); process.exitCode = 1; continue; }
  try {
    const profile = await client.rpc('virla_ensure_profile');
    const rooms = await client.from('virla_space_profiles').select('id');
    const history = await client.from('virla_booking_archive').select('id');
    const people = await client.from('virla_profiles').select('id');
    const ok = !profile.error && profile.data?.role === expectedRole && profile.data?.active === true && !rooms.error && rooms.data?.length === 6 && !history.error && history.data?.length === 1 && !people.error && people.data?.length === (username === 'admin' ? 3 : 1);
    console.log(JSON.stringify({ username, login: true, role: profile.data?.role, active: profile.data?.active, rooms: rooms.data?.length, historicalReservations: history.data?.length, visibleProfiles: people.data?.length, verified: ok }));
    if (!ok) process.exitCode = 1;
  } finally { await client.auth.signOut({ scope: 'local' }); }
}
