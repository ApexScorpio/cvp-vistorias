const fs = require('fs');
async function testUpload() {
    try {
        console.log("Testing Catbox API...");

        const form = new FormData();
        form.append('reqtype', 'fileupload');
        // Dummy 1x1 base64 string needs to be converted to a Blob/File, let's just make a text file dummy
        form.append('fileToUpload', new Blob(['fake image data'], { type: 'image/png' }), 'test.png');

        const r = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: form
        });
        const d = await r.text();
        console.log("Catbox response:", d);
    } catch (e) {
        console.error(e);
    }
}
testUpload();
