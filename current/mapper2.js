const fs = require('fs');
const rawBlocks = require('./tally_blocks_raw.json');

const schema = [];
let pendingQuestion = "Pergunta";
let currentMultiChoice = null;

// Convert Tally's nested safeHTMLSchema array into a plain text string
function safeHtmlToText(arr) {
    if (!arr || !Array.isArray(arr)) return '';
    let result = '';
    for (const chunk of arr) {
        if (!Array.isArray(chunk)) continue;
        for (const part of chunk) {
            if (typeof part === 'string') {
                result += part;
            } else if (Array.isArray(part)) {
                // e.g. [["tag","br"]] -> newline
                for (const tag of part) {
                    if (Array.isArray(tag) && tag[0] === 'tag' && tag[1] === 'br') {
                        result += '\n';
                    } else if (Array.isArray(tag) && typeof tag[1] === 'string') {
                        result += tag[1];
                    }
                }
            }
        }
    }
    return result.trim();
}

rawBlocks.forEach(tb => {

    if (tb.type === 'FORM_TITLE') {
        schema.push({
            type: 'title',
            content: tb.payload?.title || 'Formulário',
            hasDescription: false
        });
    } else if (tb.type === 'TITLE') {
        const textArr = tb.payload?.safeHTMLSchema;
        pendingQuestion = (textArr && textArr[0] && textArr[0][0]) || 'Pergunta';
        currentMultiChoice = null;
    } else if (tb.type === 'HEADING_1') {
        const textArr = tb.payload?.safeHTMLSchema;
        pendingQuestion = (textArr && textArr[0] && textArr[0][0]) || 'Secção';
        schema.push({ type: 'divider' });
        schema.push({ type: 'section', question: pendingQuestion, hasDescription: false });
        pendingQuestion = "Pergunta";
        currentMultiChoice = null;
    } else if (tb.type === 'TEXT') {
        const textStr = safeHtmlToText(tb.payload?.safeHTMLSchema);
        if (textStr) {
            schema.push({ type: 'desc', content: textStr });
        }
    } else if (tb.type === 'INPUT_TEXT') {
        if (tb.payload?.placeholder === 'Outra' && currentMultiChoice) {
            currentMultiChoice.hasOther = true;
        } else {
            schema.push({
                type: 'text-short',
                question: pendingQuestion,
                required: tb.payload?.isRequired || false,
                hasDescription: false
            });
            pendingQuestion = "Pergunta";
        }
    } else if (tb.type === 'INPUT_DATE') {
        schema.push({
            type: 'date',
            question: pendingQuestion,
            required: tb.payload?.isRequired || false,
            hasDescription: false
        });
        pendingQuestion = "Pergunta";
    } else if (tb.type === 'MULTIPLE_CHOICE_OPTION' || tb.type === 'CHECKBOX_OPTION') {
        if (!currentMultiChoice) {
            currentMultiChoice = {
                type: 'choice-single',
                question: pendingQuestion,
                required: false,
                hasDescription: false,
                hasColorCode: false,
                hasOther: false,
                options: [[]]
            };
            schema.push(currentMultiChoice);
        }

        currentMultiChoice.required = tb.payload?.isRequired || currentMultiChoice.required;
        const color = tb.payload?.color;
        if (color && color !== 'gray') currentMultiChoice.hasColorCode = true;

        const hexMap = { 'yellow': '#eab308', 'blue': '#3b82f6', 'red': '#ef4444', 'green': '#22c55e', 'orange': '#f97316', 'gray': null };
        currentMultiChoice.options[0].push({ text: tb.payload?.text || 'Opção', color: hexMap[color] || null });

    } else if (tb.type === 'DIVIDER') {
        schema.push({ type: 'divider' });
        currentMultiChoice = null;
    }
});

fs.writeFileSync('mapped_schema.json', JSON.stringify(schema, null, 2));
console.log("Mapped schema successfully to " + schema.length + " distinct items.");
