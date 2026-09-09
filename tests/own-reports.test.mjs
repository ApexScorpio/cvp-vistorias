import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { latestVehicleReport, createRecoveryController, normalize, identityIndices } from '../form-recovery.js';

const context = {
    uid: 'user-a',
    email: 'own@example.invalid',
    formId: 'form-a',
    vehicleQuestion: 'VIATURA',
    vehicle: 'TEST-A'
};

const report = (id, respondent, seconds, extra = {}) => ({
    id, formId: 'form-a', respondent, submittedAt: { seconds },
    answers: [
        { question: 'VIATURA', answer: 'TEST-A' },
        { question: 'Motorista', answer: 'Miguel Teste' }
    ],
    ...extra
});

test('a newer report from another person must not replace my latest report', () => {
    const records = [
        report('mine-old', context.email, 1),
        report('mine-latest', context.email, 3),
        report('other-newer', 'other@example.invalid', 9)
    ];
    assert.equal(latestVehicleReport(records, context)?.id, 'mine-latest');
});

test('a same-name driver using another account is not my report', () => {
    assert.equal(
        latestVehicleReport([report('other', 'other@example.invalid', 9)], context),
        null
    );
});

test('no personal report means no fallback to another author', () => {
    assert.equal(latestVehicleReport([
        report('other', 'other@example.invalid', 9),
        report('anon', 'Anónimo', 10)
    ], context), null);
});

test('matching stored email tolerates case and outer spaces only', () => {
    assert.equal(
        latestVehicleReport([report('mine', ' OWN@EXAMPLE.INVALID ', 1)], context)?.id,
        'mine'
    );
    assert.equal(
        latestVehicleReport([report('not-mine', 'o wn@example.invalid', 1)], context),
        null
    );
});

test('missing account identity fails closed', () => {
    const records = [report('mine', context.email, 1)];
    assert.equal(latestVehicleReport(records, { ...context, email: '' }), null);
    assert.equal(latestVehicleReport(records, { ...context, uid: '' }), null);
    assert.equal(latestVehicleReport(records, null), null);
});

test('form, vehicle and valid timestamp remain mandatory', () => {
    assert.equal(latestVehicleReport([
        report('wrong-form', context.email, 9, { formId: 'other' })
    ], context), null);

    assert.equal(latestVehicleReport([
        report('wrong-car', context.email, 9, {
            answers: [{ question: 'VIATURA', answer: 'TEST-B' }]
        })
    ], context), null);

    assert.equal(
        latestVehicleReport([report('bad-date', context.email, NaN)], context),
        null
    );
});

test('legacy records without respondent are not attributed by guessing', () => {
    const legacy = report('legacy', undefined, 4);
    delete legacy.respondent;
    assert.equal(latestVehicleReport([legacy], context), null);
});

test('an account email change invalidates an in-flight recovery', async () => {
    let current = context, finish, prompts = 0;

    const check = createRecoveryController({
        getContext: () => current,
        findLatest: () => new Promise(resolve => { finish = resolve; }),
        confirmLoad: () => { prompts++; return false; },
        apply: () => assert.fail('must not apply'),
        notify: () => {}
    });

    const pending = check();
    current = { ...context, email: 'other@example.invalid' };
    finish({ id: 'obsolete' });
    await pending;
    assert.equal(prompts, 0);
});

test('new responses page exists in both locations and contains only read operations', () => {
    const source = fs.readFileSync(new URL('../responses.html', import.meta.url), 'utf8');
    assert.equal(
        source,
        fs.readFileSync(new URL('../public_html/responses.html', import.meta.url), 'utf8')
    );
    assert.match(source, /CVP_RESPONSES_READONLY_V1/);

    const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1);

    const script = scripts[0][1].replace(/^\s*import[^\n]*;\s*$/gm, '');
    new vm.Script(script);

    assert.doesNotMatch(script, /\b(?:setDoc|addDoc|updateDoc|deleteDoc|submitResponse)\s*\(/);
    assert.match(script, /where\('formId', '==', formId\)/);
    assert.match(script, /allowed\(form, user\)/);
});

test('actual responses page reads the selected form, renders records and opens details', async () => {
    class Element {
        constructor() {
            this.children = [];
            this.textContent = '';
            this.dataset = {};
            this.value = '';
            this.hidden = false;
            this.open = false;
            this.listeners = {};
        }
        replaceChildren(...children) { this.children = children; }
        append(...children) { this.children.push(...children); }
        addEventListener(name, callback) { this.listeners[name] = callback; }
        close() { this.open = false; }
        showModal() { this.open = true; }
    }

    const elements = {};
    const byId = id => elements[id] ||= new Element();
    let authCallback, queries = 0;

    const source = fs.readFileSync(new URL('../responses.html', import.meta.url), 'utf8');
    const script = source.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
        .replace(/^\s*import[^\n]*;\s*$/gm, '');

    const sandbox = {
        window: { location: { search: '?id=form-a' } },
        URLSearchParams, normalize, identityIndices,
        auth: {}, db: {},
        document: {
            getElementById: byId,
            createElement: () => new Element()
        },
        onAuthStateChanged: (_auth, callback) => { authCallback = callback; },
        doc: (_db, name, id) => {
            assert.equal(name, 'forms');
            assert.equal(id, 'form-a');
            return {};
        },
        getDoc: async () => ({
            exists: () => true,
            data: () => ({
                uid: 'user-a',
                title: 'Vehicles',
                sharedWith: ['collaborator@example.invalid']
            })
        }),
        collection: (_db, name) => {
            assert.equal(name, 'responses');
            return {};
        },
        where: (field, op, id) => {
            assert.equal(field, 'formId');
            assert.equal(op, '==');
            assert.equal(id, 'form-a');
            return {};
        },
        query: () => ({}),
        getDocs: async () => {
            queries++;
            return {
                docs: [{
                    id: 'one',
                    data: () => report('one', context.email, 1)
                }]
            };
        }
    };

    vm.createContext(sandbox);
    vm.runInContext(script, sandbox);
    authCallback({ uid: 'user-a', email: context.email });
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(queries, 1);
    assert.equal(byId('rows').children.length, 1);

    const button = byId('rows').children[0].children[4].children[0];
    button.listeners.click();

    assert.equal(byId('details').open, true);
    assert.equal(byId('answers').children.length, 4);

    assert.equal(sandbox.allowed(
        { uid: 'owner', sharedWith: ['collaborator@example.invalid'] },
        { uid: 'collaborator', email: 'collaborator@example.invalid' }
    ), true);

    assert.equal(sandbox.allowed(
        { uid: 'owner' },
        { uid: 'stranger', email: 'other@example.invalid' }
    ), false);

    authCallback(null);
    assert.equal(byId('rows').children.length, 0);
    assert.equal(byId('details').open, false);
    assert.equal(byId('content').hidden, true);
});
