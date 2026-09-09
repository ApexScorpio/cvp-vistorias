import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { identityIndices, createRecoveryController } from '../form-recovery.js';

const schema = [
    { type: 'text-short', question: 'Motorista' },
    { type: 'date', question: 'DIA DO TURNO' },
    { type: 'choice-single', question: 'VIATURA' },
    { type: 'section', question: 'Luzes:' },
    { type: 'choice-single', question: 'Chapa de Matricula' }
];

test('VIATURA and Chapa de Matricula are distinct fields', () => {
    assert.deepEqual(identityIndices(schema), { driver: 0, vehicle: 2 });
});
test('identity is not tied to a fixed block index', () => {
    const shifted = [{ type: 'title', title: 'Title' }, ...schema];
    assert.deepEqual(identityIndices(shifted), { driver: 1, vehicle: 3 });
});
test('duplicate VIATURA remains ambiguous', () => {
    assert.equal(identityIndices([...schema, { question: 'VIATURA' }]).vehicle, -1);
});
test('inspection question alone is never the vehicle identity', () => {
    assert.equal(identityIndices([schema[0], schema[4]]).vehicle, -1);
});
test('aliases, case, spaces and trailing colon remain supported', () => {
    for (const label of [' viatura: ', 'VE\u00cdCULO', 'Matr\u00edcula']) {
        assert.equal(identityIndices([schema[0], { question: label }, schema[4]]).vehicle, 1);
    }
});
test('missing schema is handled without throwing', () => {
    assert.deepEqual(identityIndices(null), { driver: -1, vehicle: -1 });
});
test('actual renderer reaches recovery and asks once with the conflicting questions', async () => {
    const html = fs.readFileSync(new URL('../view_v201.html', import.meta.url), 'utf8');
    const start = html.indexOf('        function readBlockAnswer(');
    const end = html.indexOf('        function restorePreviousAnswers(', start);
    assert.ok(start >= 0 && end > start, 'Renderer functions not found');
    const driverInput = { value: 'Miguel Teste' };
    const selected = { textContent: 'TEST-A', classList: { contains: () => false } };
    const sandbox = {
        identityIndices,
        normalize: value => String(value ?? '').normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase(),
        currentUser: { uid: 'test', isAnonymous: false }, currentFormId: 'test-form',
        window: { currentSchema: schema, isPreviewMode: false },
        document: {
            getElementById: id => id === 'ans-0' ? driverInput : null,
            querySelectorAll: selector => selector === '#block-2 .pill-btn.selected' ? [selected] : []
        }
    };
    vm.createContext(sandbox);
    vm.runInContext(html.slice(start, end), sandbox);
    const context = sandbox.recoveryContext();
    assert.ok(context, 'Recovery must not stop at an ambiguous vehicle field');
    assert.equal(context.vehicleQuestion, 'VIATURA');
    assert.equal(context.vehicle, 'TEST-A');
    let queries = 0, prompts = 0, applications = 0;
    const check = createRecoveryController({
        getContext: () => sandbox.recoveryContext(),
        findLatest: async () => { queries++; return { id: 'mock-report' }; },
        confirmLoad: () => { prompts++; return false; },
        apply: () => { applications++; }, notify: () => {}
    });
    await check(); await check();
    assert.equal(queries, 1); assert.equal(prompts, 1); assert.equal(applications, 0);
    sandbox.currentUser = null;
    assert.equal(sandbox.recoveryContext(), null, 'Existing login requirement must remain');
});
