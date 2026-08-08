const fs = require('fs');
async function testUpload() {
    try {
        const apiKey = '9a3196c2105eeda2dfdf0031a0e1bcf8';
        console.log("Testing API Key:", apiKey);

        const form = new FormData();
        // Since node fetch FormData might differ, let's just make a dummy request or text upload
        form.append('image', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='); // 1x1 red pixel in base64

        const r = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: form
        });
        const d = await r.json();
        console.log(JSON.stringify(d, null, 2));
    } catch (e) {
        console.error(e);
    }
}
testUpload();
