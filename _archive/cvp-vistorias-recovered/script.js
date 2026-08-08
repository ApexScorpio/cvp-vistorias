// Default Schema (based on original static form)
const defaultSchema = {
    title: "CHECK-LIST VIATURAS - DELEGACAO DE PORTIMAO",
    description: "Os formulários deverão ser preenchidos no início de cada turno e no fim de cada turno.",
    fields: [
        { id: 'motorista', label: 'Motorista', type: 'text', required: true },
        { id: 'diaTurno', label: 'DIA DO TURNO', type: 'date', required: true },
        {
            id: 'viatura', label: 'VIATURA', type: 'choice',
            options: ['INEM (PEM)', 'AB-01-ZV (B)', 'BF-33-FL (B)', '86-HG-59 (B)', '37-QE-31 (B)', '38-EP-53 (B)', '38-UQ-42 (A2)', '88-HR-48 (A2)', '74-UR-57 (A2)', '48-IO-01 (A2)', 'BH-72-MO (A2)', '77-16-JS (Jipe)', '26-PU-66 (Logistica)'],
            required: true
        },
        {
            id: 'servico', label: 'SERVIÇO', type: 'choice',
            options: ['INEM', 'RESERVA', 'AIA/KIA', 'GERAL', 'EVENTO', 'VIAGEM', 'CENTRAL/ESCRITORIO'],
            required: true
        },
        { id: 'combustivel', label: 'Combustivel', type: 'choice', options: ['Cheio', '3/4', '1/2 - Meio', '1/4', 'Reserva'], required: true },
        { type: 'section', label: 'Luzes:' },
        { id: 'luz_minimos', label: 'Minimos', type: 'choice', options: ['Funciona', 'Nao Funciona'], required: false },
        { id: 'luz_medios', label: 'Medios', type: 'choice', options: ['Funciona', 'Nao Funciona'], required: false },
        { id: 'luz_maximos', label: 'Maximos', type: 'choice', options: ['Funciona', 'Nao Funciona'], required: false },
        { id: 'luz_stop', label: 'STOP', type: 'choice', options: ['Funciona', 'Nao Funciona'], required: false }
    ]
};

// State
let formSchema = JSON.parse(localStorage.getItem('cvpFormSchema')) || defaultSchema;
let editingFieldIndex = null;

// DOM Elements
const questionsContainer = document.getElementById('questions-container');
const editorFieldsList = document.getElementById('editor-fields-list');
const propertiesPanel = document.getElementById('properties-panel');
const propContent = document.getElementById('prop-content');
const previewTitle = document.getElementById('preview-title');
const previewDesc = document.getElementById('preview-desc');

// -------------------------------------------------------------
// LIVE PREVIEW RENDERER
// -------------------------------------------------------------
function renderPreview() {
    previewTitle.textContent = formSchema.title || "Untitled Form";
    previewDesc.textContent = formSchema.description || "";
    questionsContainer.innerHTML = ''; // Clear

    formSchema.fields.forEach((field, index) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.id = field.id ? `group-${field.id}` : `group-${index}`;

        // Section Headers
        if (field.type === 'section' || field.type === 'html') {
            const heading = document.createElement('h3');
            heading.style.fontSize = '16px';
            heading.style.fontWeight = '700';
            heading.style.marginBottom = '24px';
            heading.style.marginTop = '40px';
            heading.textContent = field.label || field.content;
            group.appendChild(heading);
            questionsContainer.appendChild(group);
            return;
        }

        // Standard Label
        const labelEl = document.createElement('div');
        labelEl.className = 'form-label';
        labelEl.innerHTML = `${field.label} ${field.required ? '<span class="required">*</span>' : ''}`;

        if (field.desc) {
            const descEl = document.createElement('div');
            descEl.className = 'form-label-desc';
            descEl.textContent = field.desc;
            labelEl.appendChild(descEl);
        }
        group.appendChild(labelEl);

        // Input Types
        if (field.type === 'text' || field.type === 'date') {
            const input = document.createElement('input');
            input.type = field.type;
            input.className = field.type === 'text' ? 'text-input' : 'date-input';
            if (field.placeholder) input.placeholder = field.placeholder;
            if (field.required) input.required = true;
            group.appendChild(input);
        } else if (field.type === 'textarea') {
            const textarea = document.createElement('textarea');
            textarea.className = 'textarea-input';
            if (field.placeholder) textarea.placeholder = field.placeholder;
            if (field.required) textarea.required = true;
            group.appendChild(textarea);
        } else if (field.type === 'choice') {
            const pillGroup = document.createElement('div');
            pillGroup.className = 'pill-group';

            const options = field.options || [];
            options.forEach(opt => {
                const optValue = typeof opt === 'string' ? opt : opt.v;
                const pill = document.createElement('button');
                pill.type = 'button';
                pill.className = 'pill-btn';
                pill.textContent = optValue;
                // Add click toggle logic for interactive preview
                pill.addEventListener('click', () => {
                    pill.classList.toggle('selected');
                });
                pillGroup.appendChild(pill);
            });

            if (field.hasOther || field.id === 'viatura' || field.id === 'servico') {
                const otherInput = document.createElement('input');
                otherInput.type = 'text';
                otherInput.className = 'text-input';
                otherInput.placeholder = 'Outra';
                otherInput.style.marginTop = '12px';
                pillGroup.appendChild(otherInput);
            }

            group.appendChild(pillGroup);
        }

        // Error message placeholder
        const errorText = document.createElement('div');
        errorText.className = 'error-text';
        errorText.textContent = "Este campo é de preenchimento obrigatório.";
        group.appendChild(errorText);

        questionsContainer.appendChild(group);
    });
}

// -------------------------------------------------------------
// EDITOR RENDERER
// -------------------------------------------------------------
function getIconForType(type) {
    if (type === 'text' || type === 'textarea') return 'ph-text-t';
    if (type === 'date') return 'ph-calendar-blank';
    if (type === 'choice') return 'ph-radio-button';
    if (type === 'section') return 'ph-text-aa';
    return 'ph-square';
}

function renderEditor() {
    editorFieldsList.innerHTML = '';

    formSchema.fields.forEach((field, index) => {
        const item = document.createElement('div');
        item.className = 'field-item-editor';
        item.onclick = (e) => {
            // Prevent opening if clicked on actions
            if (!e.target.closest('.field-actions')) {
                openProperties(index);
            }
        };

        const info = document.createElement('div');
        info.className = 'field-info';

        info.innerHTML = `
            <i class="ph ${getIconForType(field.type)} field-icon"></i>
            <span class="field-label">${field.label || 'Untitled Field'}</span>
        `;

        const actions = document.createElement('div');
        actions.className = 'field-actions';

        // Move Up
        const btnUp = document.createElement('button');
        btnUp.className = 'icon-btn';
        btnUp.innerHTML = '<i class="ph ph-caret-up"></i>';
        btnUp.onclick = () => moveField(index, -1);

        // Move Down
        const btnDown = document.createElement('button');
        btnDown.className = 'icon-btn';
        btnDown.innerHTML = '<i class="ph ph-caret-down"></i>';
        btnDown.onclick = () => moveField(index, 1);

        // Delete
        const btnDelete = document.createElement('button');
        btnDelete.className = 'icon-btn delete';
        btnDelete.innerHTML = '<i class="ph ph-trash"></i>';
        btnDelete.onclick = () => deleteField(index);

        actions.appendChild(btnUp);
        actions.appendChild(btnDown);
        actions.appendChild(btnDelete);

        item.appendChild(info);
        item.appendChild(actions);
        editorFieldsList.appendChild(item);
    });
}

// -------------------------------------------------------------
// EDITOR ACTIONS
// -------------------------------------------------------------
function moveField(index, direction) {
    if (index + direction < 0 || index + direction >= formSchema.fields.length) return;
    const temp = formSchema.fields[index];
    formSchema.fields[index] = formSchema.fields[index + direction];
    formSchema.fields[index + direction] = temp;
    updateAll();
}

function deleteField(index) {
    if (confirm("Tens a certeza que queres eliminar este campo?")) {
        formSchema.fields.splice(index, 1);
        if (editingFieldIndex === index) closeProperties();
        updateAll();
    }
}

document.getElementById('btn-add-field').addEventListener('click', () => {
    formSchema.fields.push({
        id: 'new_field_' + Date.now(),
        label: 'Nova Pergunta',
        type: 'text',
        required: false
    });
    updateAll();
    // Auto-open newest property
    openProperties(formSchema.fields.length - 1);
});

// -------------------------------------------------------------
// PROPERTIES PANEL
// -------------------------------------------------------------
function closeProperties() {
    propertiesPanel.classList.add('hidden');
    editingFieldIndex = null;
}

document.getElementById('btn-close-props').addEventListener('click', closeProperties);

function openProperties(index) {
    editingFieldIndex = index;
    const field = formSchema.fields[index];
    propertiesPanel.classList.remove('hidden');

    let html = `
        <div class="prop-group">
            <label>Field Type</label>
            <select class="prop-input" id="prop-type">
                <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text Input</option>
                <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Long Text</option>
                <option value="choice" ${field.type === 'choice' ? 'selected' : ''}>Multiple Choice / Pills</option>
                <option value="date" ${field.type === 'date' ? 'selected' : ''}>Date Picker</option>
                <option value="section" ${field.type === 'section' ? 'selected' : ''}>Section Title</option>
            </select>
        </div>
        <div class="prop-group">
            <label>Question / Label</label>
            <input type="text" class="prop-input" id="prop-label" value="${field.label || ''}">
        </div>
    `;

    if (field.type !== 'section') {
        html += `
            <div class="prop-group" style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="prop-required" ${field.required ? 'checked' : ''}>
                <label style="margin:0;">Obrigatório (Required)</label>
            </div>
        `;
    }

    if (field.type === 'choice') {
        const optionString = (field.options || []).map(opt => typeof opt === 'string' ? opt : opt.v).join('\n');
        html += `
            <div class="prop-group">
                <label>Options (One per line)</label>
                <textarea class="prop-input" id="prop-options" rows="6" placeholder="Opção 1\nOpção 2">${optionString}</textarea>
            </div>
        `;
    }

    propContent.innerHTML = html;

    // Attach listeners for instant updates
    document.getElementById('prop-type').addEventListener('change', (e) => {
        field.type = e.target.value;
        if (field.type === 'choice' && !field.options) field.options = ['Nova Opção'];
        openProperties(index); // Re-render props panel to show/hide options
        updateAll();
    });

    document.getElementById('prop-label').addEventListener('input', (e) => {
        field.label = e.target.value;
        updateAll();
    });

    const reqEl = document.getElementById('prop-required');
    if (reqEl) {
        reqEl.addEventListener('change', (e) => {
            field.required = e.target.checked;
            updateAll();
        });
    }

    const optEl = document.getElementById('prop-options');
    if (optEl) {
        optEl.addEventListener('input', (e) => {
            field.options = e.target.value.split('\n').filter(s => s.trim() !== '');
            updateAll();
        });
    }
}

// -------------------------------------------------------------
// SAVE & EXPORT
// -------------------------------------------------------------
document.getElementById('btn-save-form').addEventListener('click', () => {
    localStorage.setItem('cvpFormSchema', JSON.stringify(formSchema));
    alert("Formulário Guardado Localmente com Sucesso!");
});

document.getElementById('btn-export-json').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formSchema, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "cvp_form_schema.json");
    dlAnchorElem.click();
});

function updateAll() {
    renderEditor();
    renderPreview();
}

// Init
updateAll();
