const fs = require('fs');
const acorn = require('acorn');

function checkFile(path) {
    let content = fs.readFileSync(path, 'utf-8');
    let scripts = [];
    let regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (!match[0].includes('type="importmap"')) {
            scripts.push(match[1]);
        }
    }
    
    scripts.forEach((script, i) => {
        try {
            acorn.parse(script, { ecmaVersion: 2022, sourceType: "module" });
            console.log(path + " script " + i + " is valid");
        } catch(e) {
            console.error(path + " script " + i + " ERROR: " + e.message);
        }
    });
}

checkFile('/Users/mark/Documents/ORIGAMI/NEW.ORIGAMI/NewOrigami.Panels.html');
checkFile('/Users/mark/Documents/ORIGAMI/NEW.ORIGAMI/NewOrigami.FPV.1.html');
