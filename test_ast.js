const fs = require('fs');
const acorn = require('./acorn.js');

const html = fs.readFileSync('NewOrigami.FPV.1.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) process.exit(1);

try {
    acorn.parse(scriptMatch[1], { ecmaVersion: 2020 });
    console.log("SUCCESS!");
} catch (e) {
    console.log("ERROR at line " + e.loc.line + " col " + e.loc.column + ": " + e.message);
}
