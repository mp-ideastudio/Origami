const fs = require('fs');
const acorn = require('acorn');

let content = fs.readFileSync('js/engine/WorldGen.js', 'utf8');
content = content.split('\n').slice(0, 2492).join('\n'); // Remove lines 2493 onwards

try {
    const ast = acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
    const decl = ast.body[0].declaration.declarations[0].init;
    console.log("Methods in WorldGenMixin:");
    decl.properties.forEach(p => {
        console.log(`  ${p.key.name} (lines ${p.loc.start.line}-${p.loc.end.line})`);
    });
} catch (e) {
    console.error("Syntax Error:", e.message);
}
