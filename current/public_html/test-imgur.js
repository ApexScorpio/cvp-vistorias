const fs = require('fs');
async function testUpload() {
    try {
        console.log("Testing Imgur API...");

        const form = new FormData();
        form.append('image', 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'); // 1x1 transparent gif base64
        form.append('type', 'base64');

        const r = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                'Authorization': 'Client-ID 546c25a59c58ad7'
            },
            body: form
        });
        const d = await r.json();
        console.log("Imgur response:", JSON.stringify(d, null, 2));
    } catch (e) {
        console.error(e);
    }
}
testUpload();
