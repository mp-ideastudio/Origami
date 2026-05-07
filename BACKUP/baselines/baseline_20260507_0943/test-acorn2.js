const fs = require('fs');
const acorn = require('acorn');

const content = fs.readFileSync('js/engine/WorldGen.js', 'utf8');

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
