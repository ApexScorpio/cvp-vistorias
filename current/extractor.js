const fs = require('fs');

fetch('https://tally.so/r/eqBRoe')
    .then(r => r.text())
    .then(html => {
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        if (match) {
            fs.writeFileSync('tally_data.json', match[1]);
            console.log("Successfully extracted full JSON.");
        } else {
            console.log("Failed to find Next.js data block.");
        }
    })
    .catch(console.error);
