import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
const env=(file)=>Object.fromEntries(readFileSync(file,'utf8').split(/\r?\n/).filter((line)=>line.includes('=')&&!line.startsWith('#')).map((line)=>{const i=line.indexOf('=');return [line.slice(0,i).replace(/^\uFEFF/,''),line.slice(i+1).trim()];}));
const config=env('.env.local'), credentials=env('.env.test-users.local');
const url='https://virlaoficial.netlify.app/api/profile';
assert.equal(new URL(config.VITE_SUPABASE_URL).hostname,'iiehofyypkmjbcwqnwlg.supabase.co');
const client=createClient(config.VITE_SUPABASE_URL,config.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const login=await client.auth.signInWithPassword({email:'personal@pruebas.virla.invalid',password:credentials.PERSONAL_PASSWORD});
if(login.error)throw new Error('No se pudo abrir la cuenta personal de prueba.');
const token=login.data.session.access_token;
const call=async(method='GET',body)=>{const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw new Error('Endpoint perfil: HTTP '+response.status+' '+(await response.text()).slice(0,180));return response.json();};
try {
assert.equal((await fetch(url)).status,401);
const before=await call();
const role=await client.rpc('virla_ensure_profile');assert.equal(role.data.role,'staff');
const base=before.profile||{name:role.data.display_name,contact:login.data.user.email,area:'',photo:''};
const photo='data:image/jpeg;base64,'+readFileSync('public/photos/illustrative-boleteria.jpg').toString('base64');
try {await call('PUT',{...base,photo});const saved=await call();assert.equal(saved.profile.photo,photo);assert.equal(saved.profile.name,base.name);console.log('Perfil personal: guardado y lectura real de foto y datos correctos.');}
finally {await call('PUT',base);console.log('Foto original restaurada; sin foto ficticia persistida.');}
const afterRole=await client.rpc('virla_ensure_profile');assert.equal(afterRole.data.role,'staff');
console.log('Acceso anónimo rechazado; permisos del personal conservados.');
}finally{await client.auth.signOut({scope:'local'});}
