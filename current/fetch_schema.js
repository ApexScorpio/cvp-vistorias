const https = require('https');

https.get('https://firestore.googleapis.com/v1/projects/lpx--gerador-de-formularios/databases/(default)/documents/forms/hBBuSjc5a47czrfLWveC', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        try {
            const doc = JSON.parse(data);
            const values = doc.fields.schema.arrayValue.values;
            const parsed = values.map(val => {
                const fields = val.mapValue.fields;
                const obj = {};
                for (const key in fields) {
                    const f = fields[key];
                    if (f.stringValue !== undefined) obj[key] = f.stringValue;
                    else if (f.booleanValue !== undefined) obj[key] = f.booleanValue;
                    else if (f.integerValue !== undefined) obj[key] = parseInt(f.integerValue);
                }
                return obj;
            });
            console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.error("Error parsing schema:", e);
        }
    });
});
