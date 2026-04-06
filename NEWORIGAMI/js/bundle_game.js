const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    inputFile: path.join(__dirname, 'FPV.4.html'),
    outputFile: 'game.html',
    // System modules to combine into the first script block
    systemModules: [
        'js/StateManager.js',
        'js/RendererSystem.js',
        'js/WorldBuilder.js',
        'js/DungeonMaster.js',
        'js/AccessibilitySystem.js',
        'js/bundle_setup.js' // The glue code that initializes them
    ],
    // Logic scripts to inline as separate blocks (preserving execution order)
    gameScripts: [
        { src: './js/Game.js', id: 'Game Logic' },
        { src: './js/CombatUIManager.js', id: 'UI Managers' }
    ]
};

function bundle() {
    console.log('📦 Bundling for WordPress (Modular)...');
    
    if (!fs.existsSync(CONFIG.inputFile)) {
        console.error("❌ Input file not found:", CONFIG.inputFile);
        return;
    }

    let html = fs.readFileSync(CONFIG.inputFile, 'utf8');

    // 1. Bundle Systems
    // We combine all system classes + setup into one big script
    let systemsBundle = '// [BUNDLED SYSTEMS]\n';
    
    CONFIG.systemModules.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`   + Bundling System: ${file}`);
            let content = fs.readFileSync(file, 'utf8');
            
            // Remove imports (we are concatenating)
            content = content.replace(/import .* from .*/g, '');
            // Remove exports (we are making them global or local scope in one script)
            content = content.replace(/export\s+class\s+/g, 'class ');
            content = content.replace(/export\s+default\s+class\s+/g, 'class ');
            
            systemsBundle += `\n// --- ${file} ---\n${content}\n`;
        } else {
            console.warn(`   ! Missing System: ${file}`);
        }
    });

    // Replace the bundle_setup.js script tag with the full bundle
    // Look for: <script type="module" src="./js/bundle_setup.js"></script>
    const setupTagRegex = /<script type="module" src="\.\/js\/bundle_setup\.js"><\/script>/;
    if (setupTagRegex.test(html)) {
        html = html.replace(setupTagRegex, `<script>\n${systemsBundle}\n</script>`);
        console.log("   ✅ Injected Systems Bundle");
    } else {
        console.warn("   ⚠️ Could not find bundle_setup.js tag to replace.");
    }

    // 2. Inline Game Scripts
    // Replace <script defer src="./js/Game.js"></script> with inline content
    CONFIG.gameScripts.forEach(script => {
        const regex = new RegExp(`<script defer src="${script.src}"><\/script>`);
        if (regex.test(html)) {
            if (fs.existsSync(script.src)) {
                console.log(`   + Inlining Script: ${script.src}`);
                let content = fs.readFileSync(script.src, 'utf8');
                html = html.replace(regex, `<script>\n// --- ${script.id} ---\n${content}\n</script>`);
            } else {
                console.warn(`   ! Missing Script File: ${script.src}`);
            }
        } else {
            console.warn(`   ⚠️ Could not find tag for ${script.src}`);
        }
    });

    // 3. Output
    fs.writeFileSync(CONFIG.outputFile, html);
    console.log(`🎉 Bundled to ${CONFIG.outputFile} (${html.length} bytes)`);
}

bundle();
