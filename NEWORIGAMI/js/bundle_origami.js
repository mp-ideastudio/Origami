const fs = require('fs');
const path = require('path');

const gameFile = path.join(__dirname, 'NewOrigamiGame.html');
const panelsFile = path.join(__dirname, 'NewOrigami.Panels.html');
const aiFile = path.join(__dirname, 'NewOrigamiAi.html');
const outputFile = path.join(__dirname, 'NewOrigami.Playable.html');

console.log('Bundling NewOrigami modules...');

let gameHTML = fs.readFileSync(gameFile, 'utf8');
const panelsHTML = fs.readFileSync(panelsFile, 'utf8');
const aiHTML = fs.readFileSync(aiFile, 'utf8');

// Escape quotes for srcdoc injection
const escapeHTML = (str) => {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
};

const safePanels = escapeHTML(panelsHTML);
const safeAi = escapeHTML(aiHTML);

// Replace standard src attributes with srcdoc attributes containing the full HTML
gameHTML = gameHTML.replace(
    /<iframe id="ui-frame" class="logic-frame" src="NewOrigami.Panels.html" sandbox="allow-scripts allow-same-origin allow-modals"><\/iframe>/,
    `<iframe id="ui-frame" class="logic-frame" srcdoc="${safePanels}" sandbox="allow-scripts allow-same-origin allow-modals"></iframe>`
);

gameHTML = gameHTML.replace(
    /<iframe id="ai-frame" class="logic-frame" src="NewOrigamiAi.html" sandbox="allow-scripts allow-same-origin"><\/iframe>/,
    `<iframe id="ai-frame" class="logic-frame" srcdoc="${safeAi}" sandbox="allow-scripts allow-same-origin"></iframe>`
);

fs.writeFileSync(outputFile, gameHTML);

console.log('Successfully created NewOrigami.Playable.html');
