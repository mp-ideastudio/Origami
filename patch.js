const fs = require('fs');
let html = fs.readFileSync('NewOrigami.Panels.html', 'utf8');

// Add rule to hide contents of background cards to prevent ANY bleed
html = html.replace(
    /\.guide-card\[data-depth="1"\] \{/,
    ".guide-card:not([data-depth=\"0\"]) * { display: none !important; }\n        .guide-card[data-depth=\"1\"] {"
);

fs.writeFileSync('NewOrigami.Panels.html', html);
