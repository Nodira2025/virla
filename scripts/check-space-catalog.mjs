import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let reads = 0;
let stored = new Map();
let unavailable = false;
const cache = new Map();
function load(path) {
  const fullPath = resolve(root, path);
  if (cache.has(fullPath)) return cache.get(fullPath);
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(fullPath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = createContext({ module, exports: module.exports, URL, Date, Request, Response, require(name) {
    if (name === '@netlify/blobs') return { getStore(options) {
      assert.equal(options.name, 'virla-space-profiles');
      return { async get(key) { reads++; if (unavailable) throw new Error('Unavailable'); return stored.get(key) ?? null; }, set() { throw new Error('The public catalog must never write'); }, setJSON() { throw new Error('The public catalog must never write'); } };
    } };
    return load(resolve(dirname(fullPath), name + '.ts'));
  } });
  runInContext(source, context, { filename: fullPath });
  cache.set(fullPath, module.exports);
  return module.exports;
}

const { readStoredSpace, safeSpacePhoto } = load('src/domain/spaceCatalog.ts');
const { SPACE_PROFILES } = load('src/domain/spaceProfiles.ts');
const { parseSpaceHash, spaceHash } = load('src/domain/spaceRoutes.ts');
const handler = load('netlify/functions/spaces.ts').default;
const record = { schemaVersion: 1, id: 'teatro-300', status: 'verified', verifiedAt: '2026-09-24T12:00:00Z', capacity: 300, summary: 'Ficha de prueba', technical: { sound: 'PA estéreo' }, notes: 'NOTA PRIVADA', contact: 'privado@example.test', photoUrl: 'javascript:alert(1)' };
let checks = 0;
async function test(name, fn) { await fn(); checks++; process.stdout.write('OK ' + name + '\n'); }
await test('Los seis ejemplos siguen marcados como demo', () => { assert.equal(SPACE_PROFILES.length, 6); assert.ok(SPACE_PROFILES.every((space) => space.status === 'demo')); });
await test('Los registros demo nunca se leen como datos persistidos reales', () => assert.equal(readStoredSpace(SPACE_PROFILES[0], 'teatro-300'), null));
await test('La respuesta pública excluye contactos, notas y campos desconocidos', () => { const parsed = readStoredSpace(record, 'teatro-300'); assert.equal(parsed.name, 'Sala de Teatro'); assert.equal(parsed.technical.sound, 'PA estéreo'); assert.ok(!('contact' in parsed)); assert.ok(!('notes' in parsed)); assert.equal(parsed.photoUrl, undefined); });
await test('La verificación exige fecha e identidad coincidente', () => { assert.equal(readStoredSpace({ ...record, verifiedAt: '' }, 'teatro-300'), null); assert.equal(readStoredSpace(record, 'radio'), null); assert.equal(readStoredSpace({ ...record, schemaVersion: 2 }, 'teatro-300'), null); });
await test('Los campos faltantes quedan por confirmar sin copiar datos demo', () => { const parsed = readStoredSpace({ schemaVersion: 1, id: 'radio', status: 'pending' }, 'radio'); assert.equal(parsed.capacity, null); assert.equal(parsed.technical.stage, ''); assert.equal(parsed.equipment.length, 0); });
await test('Las fotografías rechazan protocolos inseguros y rutas externas ambiguas', () => { for (const value of ['javascript:alert(1)', 'data:image/png;base64,aaa', '//evil.example/photo', '/images/../secret', 'https://user:pass@example.test/photo']) assert.equal(safeSpacePhoto(value), undefined); assert.equal(safeSpacePhoto('/photos/teatro.jpg'), '/photos/teatro.jpg'); });
await test('El listado, el resumen y la ficha tienen rutas estables', () => { const route = parseSpaceHash(spaceHash('technical', 'teatro-300', true)); assert.equal(route.view, 'technical'); assert.equal(route.id, 'teatro-300'); assert.equal(route.full, true); assert.equal(parseSpaceHash('#espacios').id, undefined); assert.equal(parseSpaceHash('#espacios/teatro-300/desconocido').invalid, true); });
await test('GET con catálogo vacío devuelve vacío sin crear ejemplos', async () => { const response = await handler(new Request('https://example.test/api/spaces')); assert.equal(response.status, 200); assert.equal((await response.json()).spaces.length, 0); assert.equal(stored.size, 0); });
await test('GET devuelve sólo las fichas públicas del almacén de salas', async () => { stored.set('catalog/v1/teatro-300', record); const response = await handler(new Request('https://example.test/api/spaces')); const body = await response.json(); assert.equal(body.spaces.length, 1); assert.equal(body.spaces[0].status, 'verified'); assert.ok(!JSON.stringify(body).includes('privado@example.test')); });
await test('Los métodos de escritura están cerrados sin acceder al almacén', async () => { const before = reads; for (const method of ['POST', 'PUT', 'DELETE']) { const response = await handler(new Request('https://example.test/api/spaces', { method })); assert.equal(response.status, 405); } assert.equal(reads, before); });
await test('Un fallo del almacenamiento devuelve error, nunca ejemplos', async () => { unavailable = true; const response = await handler(new Request('https://example.test/api/spaces')); assert.equal(response.status, 503); assert.equal((await response.json()).spaces, undefined); unavailable = false; });
await test('Un registro inconsistente no se presenta como catálogo vacío', async () => { stored = new Map([['catalog/v1/teatro-300', { ...record, schemaVersion: 99 }]]); const response = await handler(new Request('https://example.test/api/spaces')); assert.equal(response.status, 503); });
process.stdout.write('\n' + checks + ' comprobaciones correctas, sin acceso al almacenamiento remoto.\n');
