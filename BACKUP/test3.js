const fs = require('fs');
const content = fs.readFileSync('js/engine/WorldGen.js', 'utf8');
const lines = content.split('\n');

let depth = 0;
for(let i=0; i<lines.length; i++) {
    let line = lines[i];
    let stripped = line.replace(/\/\/.*$/g, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/`[^`]*`/g, '');
    for(let j=0; j<stripped.length; j++) {
        if(stripped[j] === '{') depth++;
        if(stripped[j] === '}') {
            depth--;
            if (depth < 0) {
                console.log(`Extra } found at line ${i+1}`);
            }
        }
    }
}
console.log("Final depth:", depth);
