const fs = require('fs');
const content = fs.readFileSync('/Users/mark/Documents/ORIGAMI/NEW.ORIGAMI/NewOrigami.FPV.1.html', 'utf8');
const scriptMatch = content.match(/<script type="module">([\s\S]*?)<\/script>/);
if (scriptMatch) {
    try {
        new Function(scriptMatch[1]);
        console.log("No syntax errors found!");
    } catch (e) {
        console.error("Syntax Error:", e.message);
        // We can't get line numbers from new Function easily, but we know it failed
    }
}
