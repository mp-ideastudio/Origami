
export class AccessibilitySystem {
    constructor(stateManager) {
        this.sm = stateManager;
        // Subscribe to state changes
        this.unsubscribe = this.sm.subscribe((state, action, data) => this.onStateChange(state, action, data));
        
        // Initial check
        this.updateGuideButtons(this.sm.get());
    }

    onStateChange(state, action, data) {
        // We really only need to update buttons on position change or environment updates
        if (['PLAYER_MOVE', 'LEVEL_INIT', 'TURN_END', 'INTERACTABLES_UPDATE', 'GAME_MODE_UPDATE'].includes(action)) {
            this.updateGuideButtons(state);
        }
    }

    updateGuideButtons(state) {
        const actions = [];
        const p = state.player;
        
        // 1. Navigation (Cardinal Directions if open)
        // We can look at the map to see available exits
        // Using StateManager's map data
        const map = state.map;
        if (map && map.length > 0 && map[p.y] && map[p.y][p.x]) {
             const exits = [
                 { label: 'North', dx: 0, dy: -1 },
                 { label: 'South', dx: 0, dy: 1 },
                 { label: 'East', dx: 1, dy: 0 },
                 { label: 'West', dx: -1, dy: 0 }
             ];
             
             exits.forEach(exit => {
                 const nx = p.x + exit.dx;
                 const ny = p.y + exit.dy;
                 if (map[ny] && map[ny][nx] && map[ny][nx].type !== '#') {
                     // Check if it's a hallway or room
                     const type = map[ny][nx].roomId === 'corridor' ? 'Hallway' : 'Room';
                     actions.push({
                         label: `Go ${exit.label} to ${type}`,
                         action: () => window.dungeonMaster.startAutopilot(nx, ny),
                         priority: 10
                     });
                 }
             });
        }

        // 2. Interactables (Nearby)
        if (state.interactables) {
            state.interactables.forEach(obj => {
                const dist = Math.hypot(obj.x - p.x, obj.y - p.y);
                if (dist < 5) { // Close enough to care
                    const verb = obj.type === 'monster' ? 'Attack' : 'Go to';
                    const label = `${verb} ${obj.name} (${Math.round(dist)}m)`;
                    const action = () => {
                        window.dungeonMaster.startAutopilot(obj.x, obj.y);
                    };
                    
                    actions.push({
                        label: label,
                        action: action,
                        priority: 20
                    });
                }
            });
        }
        
        // 3. Monsters (Combat)
        state.monsters.forEach(m => {
            if (m.health > 0) {
                 const dist = Math.hypot(m.x - p.x, m.y - p.y);
                 if (dist < 8) {
                     actions.push({
                         label: `Engage ${m.name}`,
                         action: () => {
                             window.dungeonMaster.startAutopilot(m.x, m.y); 
                             // Logic will switch to turn based on arrival/proximity
                         },
                         priority: 30 // Higher priority
                     });
                 }
            }
        });

        // Sort by priority descending
        actions.sort((a,b) => b.priority - a.priority);

        // Render to DOM (Conceptually, for now just log or shim)
        if (window.uiShim && window.uiShim.renderGuideButtons) {
            window.uiShim.renderGuideButtons(actions);
        } else {
            this.renderDOM(actions);
        }
    }
    
    renderDOM(actions) {
        // Create or get container
        let container = document.getElementById('accessibility-guide-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'accessibility-guide-container';
            container.style.cssText = `
                position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
                background: rgba(0,0,0,0.8); padding: 10px; border-radius: 8px;
                display: flex; gap: 10px; flex-wrap: wrap; z-index: 10000;
                max-width: 90vw; justify-content: center;
            `;
            document.body.appendChild(container);
        }
        
        container.innerHTML = '';
        if (actions.length === 0) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        
        actions.forEach(act => {
            const btn = document.createElement('button');
            btn.textContent = act.label;
            btn.style.cssText = `
                padding: 12px 20px; font-size: 16px; font-weight: bold;
                background: #4a5568; color: white; border: 2px solid #a0aec0;
                border-radius: 6px; cursor: pointer;
            `;
            btn.onclick = () => {
                console.log(`[Guide] ${act.label}`);
                act.action();
            };
            container.appendChild(btn);
        });
    }
}
