const fs = require('fs');
const schema = require('./mapped_schema.json');

const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Importar Tally...</title>
</head>
<body style="background: #0f172a; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <div style="text-align: center;">
        <h2>A Clonar o Tally.so...</h2>
        <p>A transferir os dados para o teu painel...</p>
    </div>
    <script>
        // Inject the cloned schema into the browser's localStorage
        const schema = ${JSON.stringify(JSON.stringify(schema))};
        localStorage.setItem('cvpTallySchema', schema);
        
        // Redirect to the editor so the user can see it and click Publicar
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    </script>
</body>
</html>
`;

fs.writeFileSync('import_tally.html', html);
console.log('Successfully created import_tally.html');
