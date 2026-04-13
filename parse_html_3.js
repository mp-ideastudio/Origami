const fs = require('fs');
const html = fs.readFileSync('NewOrigami.FPV.1.html', 'utf8');

const regex = /<script.*?>([\s\S]*?)<\/script>/gi;
let match;
let i = 0;
while ((match = regex.exec(html)) !== null) {
    const precedingHTML = html.substring(0, match.index + match[0].indexOf(match[1]));
    const lineOffset = precedingHTML.split('\n').length - 1;
    const code = match[1];
    
    // pad with newlines to keep line numbers identical
    const paddedCode = '\n'.repeat(lineOffset) + code;
    fs.writeFileSync(`temp_${i}.js`, paddedCode);
    console.log(`Checking script ${i} starting at line ${lineOffset}`);
    try {
        require('child_process').execSync(`/usr/local/bin/node -c temp_${i}.js`, {stdio: 'pipe'});
        console.log(`Script ${i} is valid.`);
    } catch(e) {
        console.log(`Script ${i} HAS ERRORS:\n` + e.stderr.toString());
    }
    i++;
}
