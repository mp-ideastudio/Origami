const fs = require('fs');
const content = fs.readFileSync('js/engine/WorldGen.js', 'utf8');
const lines = content.split('\n');

let pDepth = 0;
let bDepth = 0;
for(let i=0; i<lines.length; i++) {
    let line = lines[i];
    let stripped = line.replace(/\/\/.*$/g, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/`[^`]*`/g, '');
    for(let j=0; j<stripped.length; j++) {
        if(stripped[j] === '(') pDepth++;
        if(stripped[j] === ')') pDepth--;
        if(stripped[j] === '[') bDepth++;
        if(stripped[j] === ']') bDepth--;
    }
}
console.log("Parenthesis depth:", pDepth);
console.log("Bracket depth:", bDepth);
