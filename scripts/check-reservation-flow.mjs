import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual domain modules without adding a test runner dependency.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();
function loadDomain(path) {
  const fullPath = resolve(root, path);
  if (cache.has(fullPath)) return cache.get(fullPath);
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(fullPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = createContext({ module, exports: module.exports, Date, Intl, require: (name) => loadDomain(resolve(dirname(fullPath), name + '.ts')) });
  runInContext(source, context, { filename: fullPath });
  cache.set(fullPath, module.exports);
  return module.exports;
}

const { validateReservation, todayInTucuman, stepForErrors } = loadDomain('src/domain/reservationValidation.ts');
const valid = { title: 'Ensayo del coro', description: 'Ensayo de repertorio para el concierto.', category: 'music', activityType: 'rehearsal', spaceId: 'teatro-300', date: '2026-10-12', startTime: '09:00', endTime: '09:30', responsibleName: 'Responsable de prueba', contact: 'contacto@example.test' };
const check = (patch) => validateReservation({ ...valid, ...patch }, '2026-10-12');
let checks = 0;
function test(name, fn) { fn(); checks++; process.stdout.write('OK ' + name + '\n'); }
test('Una actividad válida de 30 minutos se puede guardar', () => assert.equal(Object.keys(check({})).length, 0));
test('29 minutos y horarios invertidos se rechazan', () => { assert.ok(check({ endTime: '09:29' }).endTime); assert.ok(check({ endTime: '08:00' }).endTime); });
test('Se rechazan horas vacías o fuera de rango', () => { assert.ok(check({ startTime: '' }).startTime); assert.ok(check({ endTime: '25:10' }).endTime); });
test('La fecha pasada y las fechas inexistentes no se aceptan', () => { assert.ok(check({ date: '2026-10-11' }).date); assert.ok(check({ date: '2027-02-30' }).date); assert.ok(check({ date: '' }).date); });
test('La capacidad exacta se acepta y el exceso se rechaza', () => { assert.equal(check({ expectedAttendance: 300 }).expectedAttendance, undefined); assert.ok(check({ expectedAttendance: 301 }).expectedAttendance); assert.ok(check({ expectedAttendance: 0 }).expectedAttendance); });
test('La capacidad administrada reemplaza el aforo antiguo sin inventar datos faltantes', () => { assert.equal(validateReservation({ ...valid, expectedAttendance: 350 }, '2026-10-12', 400).expectedAttendance, undefined); assert.ok(validateReservation({ ...valid, expectedAttendance: 21 }, '2026-10-12', 20).expectedAttendance); assert.equal(validateReservation({ ...valid, expectedAttendance: 350 }, '2026-10-12', null).expectedAttendance, undefined); });
test('Cambiar a una sala más chica vuelve a validar la capacidad', () => assert.ok(check({ spaceId: 'radio', expectedAttendance: 16 }).expectedAttendance));
test('No se omiten descripción, responsable ni contacto', () => { assert.ok(check({ description: 'Breve' }).description); assert.ok(check({ responsibleName: '' }).responsibleName); assert.ok(check({ contact: '123' }).contact); });
test('Los errores vuelven al paso correspondiente', () => { assert.equal(stepForErrors({ description: 'error' }), 0); assert.equal(stepForErrors({ date: 'error' }), 1); assert.equal(stepForErrors({ contact: 'error' }), 2); });
test('Hoy usa Tucumán incluso antes de medianoche UTC', () => { assert.equal(todayInTucuman(new Date('2026-10-13T02:59:00Z')), '2026-10-12'); assert.equal(todayInTucuman(new Date('2026-10-13T03:00:00Z')), '2026-10-13'); });
test('Validar conserva los datos y observaciones privadas', () => { const draft = { ...valid, notes: 'Nota privada', contact: 'privado@example.test' }; const before = JSON.stringify(draft); validateReservation(draft, '2026-10-12'); assert.equal(JSON.stringify(draft), before); });
process.stdout.write('\n' + checks + ' comprobaciones correctas.\n');
