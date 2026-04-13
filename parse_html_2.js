const fs = require('fs');
const html = fs.readFileSync('NewOrigami.FPV.1.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
fs.writeFileSync('temp_module.js', match[1]);
