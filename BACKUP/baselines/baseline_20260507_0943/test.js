const fs = require('fs');
const content = fs.readFileSync('js/engine/WorldGen.js', 'utf8');

// Find missing brace or extra brace
let depth = 0;
let lines = content.split('\n');
let braces = [];
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let j = 0; j < line.length; j++) {
        if (line[j] === '{') {
            depth++;
            braces.push({line: i+1, type: '{', depth});
        }
        else if (line[j] === '}') {
            braces.push({line: i+1, type: '}', depth});
            depth--;
        }
    }
}
console.log("Final depth:", depth);
