const fs = require('fs');

if (!fs.existsSync('./tally_blocks_raw.json')) {
    console.log("No blocks raw file found.");
    process.exit(1);
}

const rawBlocks = require('./tally_blocks_raw.json');

const schema = [];

// Helper to convert Tally block types to our types
function mapTallyBlock(tb) {
    if (tb.type === 'HEADING_1') {
        return { type: 'title', content: tb.payload?.text || 'Sem título' };
    }
    if (tb.type === 'HEADING_3' || tb.type === 'HEADING_2') {
        return { type: 'section', question: tb.payload?.text || 'Secção' };
    }
    if (tb.type === 'INPUT_TEXT') {
        return { type: 'text-short', question: 'Texto Curto' };
    }
    if (tb.type === 'TEXT') {
        return { type: 'desc', content: tb.payload?.text || '' };
    }

    if (tb.type === 'MULTIPLE_CHOICE' || tb.type === 'CHECKBOXES') {
        const questionText = tb.payload?.text || 'Pergunta';
        const isMulti = tb.type === 'CHECKBOXES';

        let hasColorCode = false;

        const optionsRaw = tb.payload?.options || [];
        const mappedOptions = [];

        // Tally normally stores options sequentially. We need to split them into rows depending on UI.
        // For simplicity, we can do 1 option per row, or exactly how it is. Our UI usually pushes them into a line.
        // We'll map them as rows of 1 option. Our UI flex-wraps anyway, so 1 item per row in a 2D array means vertical stacking, 
        // wait, editor.js uses `.map(opt => [{ text: opt }])` for vertical lines? 
        // Actually, editor.js `pill-row` has flex-wrap, so multiple items in 1 row wraps natively if it doesn't fit.
        // Let's just put them all in 1 row so they flow inline like pills!
        const row = [];
        optionsRaw.forEach(o => {
            row.push({
                text: o.text || 'Opção',
                color: null
            });
        });

        return {
            type: isMulti ? 'choice-multi' : 'choice-single',
            question: questionText,
            options: [row],
            required: false,
            hasDescription: false
        };
    }

    return null;
}

rawBlocks.forEach(tb => {
    const mapped = mapTallyBlock(tb);
    if (mapped) schema.push(mapped);
});

fs.writeFileSync('mapped_schema.json', JSON.stringify(schema, null, 2));
console.log("Successfully mapped " + schema.length + " blocks.");
