const fs = require('fs');
const data = require('./tally_data.json');

let foundBlocks = null;

function searchBlocks(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.blocks && Array.isArray(obj.blocks)) {
        foundBlocks = obj.blocks;
        return;
    }
    for (const key in obj) {
        if (foundBlocks) return;
        searchBlocks(obj[key]);
    }
}

searchBlocks(data);

if (foundBlocks) {
    fs.writeFileSync('tally_blocks_raw.json', JSON.stringify(foundBlocks, null, 2));
    console.log("FOUND BLOCKS ARRAY!");
} else {
    console.log("BLOCKS NOT FOUND");
}
