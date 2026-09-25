import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';
const cache=new Map();
let identity='staff-one'; let active=true; let storeReads=0; const store=new Map();
function load(path){ const full=resolve(path); if(cache.has(full))return cache.get(full); const module={exports:{}}; const source=ts.transpileModule(readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText; const context=createContext({module,exports:module.exports,Date,URL,Request,Response,require(name){
if(name==='@netlify/blobs')return {getStore(){return {async get(key){storeReads++;return store.get(key)||null;},async setJSON(key,value){store.set(key,value);}};}};
if(name==='@supabase/supabase-js')return {createClient(){return {auth:{async getUser(token){return token==='valid'?{data:{user:{id:identity}}}:{data:{user:null},error:{message:'invalid'}};}},async rpc(){return {data:active?'staff':null};}};}};
return load(resolve(dirname(full),name+'.ts'));}});runInContext(source,context);cache.set(full,module.exports);return module.exports;}
const {parseVoiceBooking}=load('src/domain/voiceBooking.ts');
const {parsePersonalProfile}=load('src/domain/personalProfile.ts');
const handler=load('netlify/functions/profile.ts').default;
let count=0; async function check(name,fn){await fn();console.log('OK '+name);count++;}
await check('Dictado completo con fecha, rango horario, sala y evento',()=>{const p=parseVoiceBooking('El día 28 de septiembre, de 18 a 20 horas necesito ocupar la Sala de Teatro para el evento Reunión de equipo, solicitada por Ana Pérez.','2026-09-24');assert.equal(p.date,'2026-09-28');assert.equal(p.startTime,'18:00');assert.equal(p.endTime,'20:00');assert.equal(p.spaceId,'teatro-300');assert.equal(p.title,'Reunión de equipo');assert.equal(p.responsibleName,undefined);});
await check('Números hablados y medias horas',()=>{const p=parseVoiceBooking('El día veintiocho de septiembre de dieciocho y media a veinte horas necesito la sala de muestras para el evento Pintura','2026-09-24');assert.equal(p.date,'2026-09-28');assert.equal(p.startTime,'18:30');assert.equal(p.endTime,'20:00');assert.equal(p.spaceId,'subsuelo-muestras');});
await check('Fecha relativa respeta cambio de mes y año',()=>{assert.equal(parseVoiceBooking('Mañana de 10 a 11 horas en el teatro para el evento Ensayo','2026-12-31').date,'2027-01-01');});
await check('No inventa sala desconocida ni finalización ausente',()=>{const p=parseVoiceBooking('El día 27 de septiembre a las 18 horas necesito sala Alberdi para el evento Teatro','2026-09-24');assert.equal(p.spaceId,undefined);assert.equal(p.endTime,undefined);assert.equal(p.startTime,'18:00');});
await check('Fechas imposibles y salas ambiguas quedan sin resolver',()=>{const p=parseVoiceBooking('El día 31 de febrero de 25 a 27 horas necesito teatro o bar para el evento Charla','2026-01-01');assert.equal(p.date,undefined);assert.equal(p.spaceId,undefined);assert.equal(p.startTime,undefined);});
await check('AM/PM no se interpreta como madrugada silenciosamente',()=>{const p=parseVoiceBooking('El día 28 de septiembre de 6 a 8 de la tarde en el teatro para el evento Ensayo','2026-09-24');assert.equal(p.startTime,undefined);assert.equal(p.endTime,undefined);});
await check('El perfil no admite URLs externas, SVG ni datos de permisos',()=>{assert.equal(parsePersonalProfile({name:'Ana',contact:'3811234567',area:'',photo:'data:image/svg+xml;base64,abc'}),null);const p=parsePersonalProfile({name:'Ana',contact:'3811234567',area:'',photo:'',role:'admin',id:'other'});assert.equal(p.role,undefined);assert.equal(p.id,undefined);});
await check('Sin sesión o token inválido no accede al almacén privado',async()=>{const before=storeReads;assert.equal((await handler(new Request('https://example.test/api/profile'))).status,401);assert.equal((await handler(new Request('https://example.test/api/profile',{headers:{Authorization:'Bearer bad'}}))).status,401);assert.equal(storeReads,before);});
const request=(method='GET',body)=>new Request('https://example.test/api/profile?userId=other',{method,headers:{Authorization:'Bearer valid'},...(body?{body:JSON.stringify(body)}:{})});
await check('Personal guarda solo su perfil y lo vuelve a leer',async()=>{assert.equal((await handler(request('PUT',{name:'Ana',contact:'3811234567',area:'Producción',photo:'',id:'other',role:'admin'}))).status,200);const data=await (await handler(request())).json();assert.equal(data.profile.name,'Ana');assert.equal(store.has('members/other'),false);assert.equal(data.profile.role,undefined);});
await check('Otra persona no recibe foto ni datos del usuario anterior',async()=>{identity='staff-two';assert.equal((await (await handler(request())).json()).profile,null);identity='staff-one';});
await check('Cuenta deshabilitada no puede leer ni modificar perfiles',async()=>{active=false;assert.equal((await handler(request())).status,403);assert.equal((await handler(request('PUT',{name:'Otra'}))).status,403);active=true;});
await check('Error de validación no reemplaza los datos guardados',async()=>{assert.equal((await handler(request('PUT',{name:'',contact:'x',area:'',photo:''}))).status,400);assert.equal((await (await handler(request())).json()).profile.name,'Ana');});
console.log(`${count} comprobaciones correctas.`);
