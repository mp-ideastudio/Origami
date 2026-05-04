const fs = require('fs');
const content = fs.readFileSync('js/engine/WorldGen.js', 'utf8');
const lines = content.split('\n');

let pStack = [];
for(let i=1600; i<1780; i++) {
    let line = lines[i];
    let stripped = line.replace(/\/\/.*$/g, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/`[^`]*`/g, '');
    for(let j=0; j<stripped.length; j++) {
        if(stripped[j] === '(') pStack.push(i + 1);
        if(stripped[j] === ')') pStack.pop();
    }
}
console.log("Unclosed parentheses at lines:", pStack);
