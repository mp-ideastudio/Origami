const fs = require('fs');

const css = fs.readFileSync('/tmp/pip_css.css', 'utf-8');
const html = fs.readFileSync('/tmp/pip_html.html', 'utf-8');

let panels = fs.readFileSync('NewOrigami.Panels.html', 'utf-8');

// Insert CSS right before </style>
panels = panels.replace('    </style>', css + '\n    </style>');

// Insert HTML into #main-container
panels = panels.replace('<div id="main-container">', '<div id="main-container">\n' + html);

fs.writeFileSync('NewOrigami.Panels.html', panels);

// Clean up FPV.1.html
let fpv = fs.readFileSync('NewOrigami.FPV.1.html', 'utf-8');
// Remove the CSS block (lines 263-468)
fpv = fpv.replace(css, '');
// Remove the HTML block (lines 500-520)
fpv = fpv.replace(html, '');

fs.writeFileSync('NewOrigami.FPV.1.html', fpv);

// We still need to migrate initWindowDragging logic!
