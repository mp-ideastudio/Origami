/**
 * NEW ORIGAMI - APPLICATION CONTROLLER (60fps Optimized)
 * Links the Neumorphic Dark UI with the ThreeJS Engine Subsystem.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("INITIALIZING APP CONTROLLER...");
    if (typeof Engine !== 'undefined') {
        Engine.init(); // Boot the FPV ThreeJS engine context
    } else {
        console.warn("FPV Engine subsystem not loaded. Running UI in standalone mode.");
    }

    // Connect Input to Event Log
    const adventureInput = document.getElementById('dnd-adventure-command-input');
    if (adventureInput) {
        adventureInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = adventureInput.value.trim();
                if (cmd) {
                    appendEventLog(`> ${cmd}`);
                    handleCommand(cmd.toLowerCase());
                    adventureInput.value = ''; // Reset
                }
            }
        });
    }

    function appendEventLog(message, styleClass = '') {
        const log = document.getElementById('dnd-adventure-log');
        if (!log) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${styleClass}`;
        entry.innerText = message;
        log.appendChild(entry);
        
        // Auto-scroll logic: only update layout during requestAnimationFrame for 60fps compliance
        requestAnimationFrame(() => {
            log.scrollTop = log.scrollHeight;
        });
    }

    // Basic Command Handler Pipeline
    function handleCommand(cmd) {
        if (cmd === "cast") {
            appendEventLog("SYSTEM: Mana insufficient for casting.", 'sys-msg');
            return;
        }

        if (cmd === "parley") {
            appendEventLog("The spectral target ignores your attempts at communication.", 'sys-msg');
            return;
        }

        // Hook movement commands into the Engine API if available
        if (typeof Engine !== 'undefined') {
            if (cmd === "forward" || cmd === "w") Engine.keys.w = true;
            else if (cmd === "back" || cmd === "s") Engine.keys.s = true;
            else if (cmd === "left" || cmd === "a") Engine.keys.a = true;
            else if (cmd === "right" || cmd === "d") Engine.keys.d = true;
            
            // Release after a short tick (simulated turn)
            setTimeout(() => {
                Engine.keys.w = false;
                Engine.keys.s = false;
                Engine.keys.a = false;
                Engine.keys.d = false;
            }, 300);
            
            appendEventLog(`Executing maneuver: ${cmd}`);
        } else {
            appendEventLog(`Command not recognized: ${cmd}`);
        }
    }

    // Attach Movement Pad standard hooks
    const pads = { 'w':'btn-up', 'a':'btn-left', 's':'btn-down', 'd':'btn-right' };
    for (let key in pads) {
        const btn = document.getElementById(pads[key]);
        if (btn && typeof Engine !== 'undefined') {
            btn.addEventListener('mousedown', () => Engine.keys[key] = true);
            btn.addEventListener('mouseup', () => Engine.keys[key] = false);
            btn.addEventListener('mouseleave', () => Engine.keys[key] = false);
            
            // Touch support
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); Engine.keys[key] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); Engine.keys[key] = false; });
        }
    }
});
