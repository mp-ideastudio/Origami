const fs = require('fs');
const acorn = require('acorn');

const content = fs.readFileSync('js/engine/WorldGen.js', 'utf8');

try {
    acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'module' });
    console.log("Parsed successfully!");
} catch (e) {
    console.error("Syntax Error:", e.message);
    console.error("Location:", e.loc);
}
