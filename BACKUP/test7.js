const esprima = require('esprima');
const fs = require('fs');
const content = fs.readFileSync('js/engine/WorldGen.js', 'utf8');

try {
    // Treat as ES module because of export
    esprima.parseModule(content);
    console.log("No syntax error found by Esprima!");
} catch(e) {
    console.error("Syntax Error at line:", e.lineNumber, "column:", e.column);
    console.error(e.description);
}
