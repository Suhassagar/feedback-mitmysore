const fs = require('fs');
const path = require('path');

function getFiles(dir, ext) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory() && !fullPath.includes('node_modules')) {
            results = results.concat(getFiles(fullPath, ext));
        } else if (file.endsWith(ext)) {
            results.push(fullPath);
        }
    }
    return results;
}

const allJsFiles = getFiles('.', '.js').filter(f => !f.includes('find_tables') && !f.includes('find_unused'));
const fileUsage = {};
allJsFiles.forEach(f => fileUsage[f] = 0);

allJsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    allJsFiles.forEach(target => {
        if (file === target) return;
        const basename = path.basename(target, '.js');
        if (content.includes(`require('./${basename}')`) || 
            content.includes(`require('../controllers/${basename}')`) || 
            content.includes(`require('../routes/${basename}')`)) {
            fileUsage[target]++;
        }
    });
});

console.log("Files never required by any other JS file (Entry points / Unused):");
for (const [file, count] of Object.entries(fileUsage)) {
    if (count === 0 && !file.includes('server.js') && !file.includes('routes\\') && !file.includes('config\\')) {
        console.log(file);
    }
}
