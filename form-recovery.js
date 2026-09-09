// Shared by the editor and the public form. No database writes in this module.
export function normalize(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().replace(/\s+/g, ' ').toLowerCase();
}

// Same administrator allowlist as current/admin.html in the preserved project.
export function canManagePillVisibility(user) {
    return !!user && !user.isAnonymous &&
        normalize(user.email) === 'miguel.lopes@cruzvermelha.org.pt';
}

export function optionRows(options) {
    if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch { return []; }
    }
    if (!Array.isArray(options)) return [];
    const rows = options.some(Array.isArray) ? options : [options];
    return rows.filter(Array.isArray).map(row => row.filter(opt => opt != null)
        .map(opt => typeof opt === 'string' ? { text: opt } : opt));
}

export function visibleOptionRows(options) {
    return optionRows(options).map(row => row.filter(opt => opt.disabled !== true))
        .filter(row => row.length);
}

export function toggleOptionDisabled(schema, blockIndex, rowIndex, columnIndex, user) {
    if (!canManagePillVisibility(user)) return false;
    const block = schema[blockIndex];
    if (!block || !['choice-single', 'choice-multi'].includes(block.type)) return false;
    const rows = optionRows(block.options);
    const option = rows[rowIndex]?.[columnIndex];
    if (!option) return false;
    option.disabled = option.disabled !== true;
    block.options = rows;
    return true;
}

export function identityIndices(schema) {
    // CVP_IDENTITY_VIATURA_V1: prefer the identity field, not inspection questions.
    if (!Array.isArray(schema)) return { driver: -1, vehicle: -1 };
    const labels = schema.map(block => normalize(block?.question)
        .replace(/[:*]+$/g, '').trim());
    const unique = (patterns, exclude = null) => {
        for (const pattern of patterns) {
            const matches = labels.map((label, index) =>
                pattern.test(label) && (!exclude || !exclude.test(label)) ? index : -1
            ).filter(index => index >= 0);
            // A duplicated identity remains ambiguous: never choose arbitrarily.
            if (matches.length) return matches.length === 1 ? matches[0] : -1;
        }
        return -1;
    };
    return {
        driver: unique([/\bmotorista\b/]),
        vehicle: unique([
            /^viatura$/, /^veiculo$/, /^matricula$/,
            /\b(viatura|veiculo|matricula)\b/
        ], /\bchapa\b/)
    };
}

function timestamp(value) {
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?.seconds === 'number') return value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
    if (typeof value === 'number') return value;
    return typeof value === 'string' ? Date.parse(value) : NaN;
}

export function latestVehicleReport(reports, context) {
    // CVP_OWN_REPORT_V1: the saved respondent email identifies the author.
    const emailOf = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
    const email = emailOf(context?.email);
    if (!context?.uid || !email.includes('@') || !Array.isArray(reports)) return null;
    return reports.filter(report => {
        if (!report || report.formId !== context.formId || !Array.isArray(report.answers)) return false;
        // No fallback to another person, a partial name, or an anonymous report.
        if (emailOf(report.respondent) !== email) return false;
        const matches = report.answers.filter(a => a && normalize(a.question) === normalize(context.vehicleQuestion));
        if (matches.length !== 1) return false;
        const value = matches[0].answer;
        const vehicle = Array.isArray(value) && value.length === 1 ? value[0] : value;
        return typeof vehicle === 'string' && normalize(vehicle) === normalize(context.vehicle) &&
            Number.isFinite(timestamp(report.submittedAt));
    }).sort((a, b) => timestamp(b.submittedAt) - timestamp(a.submittedAt) ||
        String(b.id).localeCompare(String(a.id)))[0] || null;
}

// Legacy answers have only question labels. Ambiguous duplicates are deliberately skipped.
export function matchingAnswers(schema, answers) {
    const pairs = [];
    schema.forEach((block, index) => {
        const byId = block.id == null ? [] : answers.filter(a => a.blockId === block.id);
        if (byId.length === 1) { pairs.push({ block, index, answer: byId[0].answer }); return; }
        const label = normalize(block.question);
        if (!label || schema.filter(b => normalize(b.question) === label).length !== 1) return;
        const matches = answers.filter(a => a.blockId == null && normalize(a.question) === label);
        if (matches.length === 1) pairs.push({ block, index, answer: matches[0].answer });
    });
    return pairs;
}

export function createRecoveryController({ getContext, findLatest, confirmLoad, apply, notify }) {
    let activeKey = '', revision = 0, applying = false;
    const keyOf = context => context ? JSON.stringify([
        context.uid, String(context.email || '').trim().toLowerCase(), context.formId, normalize(context.vehicle)
    ]) : '';
    return async function check() {
        if (applying) return;
        const context = getContext(), key = keyOf(context);
        if (key === activeKey) return;
        activeKey = key;
        const ticket = ++revision;
        if (!context) return;
        const stillCurrent = () => ticket === revision && keyOf(getContext()) === key;
        try {
            const report = await findLatest(context);
            if (!stillCurrent()) return;
            if (!report) { notify('Não existe um relatório anterior teu para esta viatura nesta conta.'); return; }
            if (!await confirmLoad(report, context) || !stillCurrent()) return;
            applying = true;
            try { apply(report, context); } finally { applying = false; }
            notify('Respostas anteriores carregadas. Verifique-as antes de submeter.');
        } catch (error) {
            if (stillCurrent()) {
                activeKey = ''; // Permit an explicit retry; do not loop automatically.
                notify('Não foi possível consultar o relatório anterior. Tente novamente.');
            }
        }
    };
}
