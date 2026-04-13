const fs = require('fs');
const html = fs.readFileSync('NewOrigami.FPV.1.html', 'utf8');

// Find all script tags
const regex = /<script.*?>([\s\S]*?)<\/script>/gi;
let match;
while ((match = regex.exec(html)) !== null) {
    const code = match[1];
    
    // We pad the code with newlines so the line numbers match EXACTLY what's in the HTML file
    const precedingHTML = html.substring(0, match.index + match[0].indexOf(match[1]));
    const lineOffset = precedingHTML.split('\n').length - 1;
    const paddedCode = '\n'.repeat(lineOffset) + code;

    try {
        new Function(paddedCode);
    } catch (e) {
        console.error("Syntax Error found!");
        // write to temp file so we can run with node -c
        fs.writeFileSync('temp_check.js', paddedCode);
        require('child_process').execSync('/usr/local/bin/node -c temp_check.js', {stdio: 'inherit'});
    }
}
