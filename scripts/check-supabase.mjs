import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').trim().split(/\r?\n/).filter((line) => line.includes('=') && !line.startsWith('#')).map((line) => {
  const index = line.indexOf('=');
  return [line.slice(0, index).replace(/^\uFEFF/, ''), line.slice(index + 1)];
}));
const base = env.VITE_SUPABASE_URL;
if (new URL(base).hostname !== 'iiehofyypkmjbcwqnwlg.supabase.co') throw new Error('El proyecto no coincide con el autorizado.');
for (const path of ['/rest/v1/', '/auth/v1/settings', '/rest/v1/virla_space_profiles?select=id&limit=0']) {
  try {
    const response = await fetch(base + path, { headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    console.log(JSON.stringify({ endpoint: path, status: response.status, ...(path === '/rest/v1/' ? { tables: Object.keys(body.definitions || {}) } : path.includes('settings') ? { emailEnabled: body.external?.email, signupDisabled: body.disable_signup } : {}), code: body.code, error: body.message || body.msg || body.error }));
  } catch (error) { console.log(JSON.stringify({ endpoint: path, error: error.message, cause: error.cause?.code })); process.exitCode = 1; }
}
