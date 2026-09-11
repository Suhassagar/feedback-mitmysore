const fs = require('fs');
const path = require('path');

function getFiles(dir, ext) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory() && !fullPath.includes('node_modules')) {
            results = results.concat(getFiles(fullPath, ext));
        } else if (file.endsWith(ext) || file.endsWith('.tsx') || file.endsWith('.jsx')) {
            results.push(fullPath);
        }
    }
    return results;
}

const allJsFiles = getFiles('.', '.js');
const fileUsage = {};
allJsFiles.forEach(f => fileUsage[f] = 0);

allJsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    allJsFiles.forEach(target => {
        if (file === target) return;
        const basename = path.basename(target).replace('.jsx', '').replace('.js', '').replace('.tsx', '');
        if (content.includes(`/${basename}`) || content.includes(`'${basename}'`) || content.includes(`"${basename}"`)) {
            fileUsage[target]++;
        }
    });
});

console.log("Potentially unused React components/pages:");
for (const [file, count] of Object.entries(fileUsage)) {
    if (count === 0 && !file.includes('App.jsx') && !file.includes('main.jsx') && !file.includes('vite.config.js')) {
        console.log(file);
    }
}
