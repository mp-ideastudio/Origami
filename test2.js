const fs = require('fs');
const content = fs.readFileSync('js/engine/WorldGen.js', 'utf8');

let lines = content.split('\n');

// let's strip out comments and strings so we don't count { inside strings
const stripped = content.replace(/\/\/.*$/gm, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/`[^`]*`/g, '');

let depth = 0;
for(let i=0; i<stripped.length; i++) {
    if(stripped[i] === '{') depth++;
    if(stripped[i] === '}') depth--;
}
console.log("True stripped depth:", depth);
