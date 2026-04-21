const fs = require('fs');
const files = ['NewOrigamiAi.html', 'NewOrigami.FPV.1.html', 'NewOrigami.Panels.html'];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const match = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (match) fs.writeFileSync(f + '.js', match[1]);
}
