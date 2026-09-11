const fs = require('fs');
const path = require('path');
function findTables(dir) {
    let tables = new Set();
    const files = fs.readdirSync(dir);
    for(const file of files) {
        const fullPath = path.join(dir, file);
        if(fs.statSync(fullPath).isDirectory()) {
            findTables(fullPath).forEach(t => tables.add(t));
        } else if(file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const regex = /(?:db|trx)\(\s*['"]([^'"]+)['"]\s*\)/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                tables.add(match[1]);
            }
        }
    }
    return tables;
}
console.log(Array.from(findTables('./controllers')).sort());
