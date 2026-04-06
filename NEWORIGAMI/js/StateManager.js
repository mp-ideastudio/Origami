export class StateManager {
    constructor() {
        // Core Game State
        this.state = {
            gameStatus: 'MENU', // MENU, PLAYING, PAUSED, GAME_OVER
            gameMode: 'REALTIME', // REALTIME, TURN_BASED
            level: 1,
            turn: 0,
            
            // Map Data
            map: [], // 2D Array of Tile objects
            width: 50,
            height: 50,
            
            // Interactive Objects (for Accessibility)
            interactables: [], // { id, x, y, type, name, action }
            
            // Entities
            player: {
                x: 1,
                y: 1,
                hp: 10,
                maxHp: 10,
                xp: 0,
                level: 1,
                inventory: [],
                stats: {
                    str: 10,
                    dex: 10,
                    con: 10,
                    ac: 10
                }
            },
            monsters: [], // Array of monster objects
            
            // log
            messages: []
        };

        this.listeners = new Set();
    }

    // --- State Accessors ---
    get() {
        return this.state;
    }

    // --- Subscription ---
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(action, data) {
        this.listeners.forEach(listener => listener(this.state, action, data));
    }

    // --- Actions (Reducers) ---
    
    // Initialize a new game level
    initLevel(levelNum, mapData, playerStart) {
        this.state.level = levelNum;
        this.state.map = mapData;
        this.state.monsters = [];
        this.state.messages = [];
        if (playerStart) {
            this.state.player.x = playerStart.x;
            this.state.player.y = playerStart.y;
        }
        this.notify('LEVEL_INIT');
    }

    // Update Player Position
    movePlayer(x, y) {
        this.state.player.x = x;
        this.state.player.y = y;
        this.notify('PLAYER_MOVE', { x, y });
    }

    // Modify Player Stats
    updatePlayerStats(updates) {
        Object.assign(this.state.player, updates);
        this.notify('PLAYER_UPDATE', updates);
    }

    // Inventory
    addToInventory(item) {
        this.state.player.inventory.push(item);
        this.notify('INVENTORY_ADD', item);
    }
    
    removeFromInventory(itemId) {
        const idx = this.state.player.inventory.findIndex(i => i.id === itemId);
        if (idx !== -1) {
            this.state.player.inventory.splice(idx, 1);
            this.notify('INVENTORY_REMOVE', itemId);
        }
    }

    // Monsters
    addMonster(monster) {
        this.state.monsters.push(monster);
        this.notify('MONSTER_ADD', monster);
    }
    
    updateMonster(id, updates) {
        const m = this.state.monsters.find(m => m.id === id);
        if (m) {
            Object.assign(m, updates);
            this.notify('MONSTER_UPDATE', { id, updates });
        }
    }
    
    removeMonster(id) {
        this.state.monsters = this.state.monsters.filter(m => m.id !== id);
        this.notify('MONSTER_REMOVE', id);
    }

    // Game Mode
    setGameMode(mode) {
        if (this.state.gameMode !== mode) {
            this.state.gameMode = mode;
            this.notify('GAME_MODE_UPDATE', mode);
        }
    }

    // Interactables (Accessibility)
    registerInteractable(obj) {
        // Avoid duplicates
        const existing = this.state.interactables.findIndex(i => i.id === obj.id);
        if (existing !== -1) {
            this.state.interactables[existing] = obj;
        } else {
            this.state.interactables.push(obj);
        }
        this.notify('INTERACTABLES_UPDATE');
    }

    unregisterInteractable(id) {
        this.state.interactables = this.state.interactables.filter(i => i.id !== id);
        this.notify('INTERACTABLES_UPDATE');
    }

    getNearbyInteractables(range = 5) {
        const p = this.state.player;
        return this.state.interactables.filter(i => {
            const dist = Math.hypot(i.x - p.x, i.y - p.y);
            return dist <= range;
        });
    }

    // Logging
    log(message, type = 'info') {
        const entry = { text: message, type, timestamp: Date.now() };
        this.state.messages.push(entry);
        // Keep log size manageable
        if (this.state.messages.length > 100) this.state.messages.shift();
        this.notify('LOG_MESSAGE', entry);
    }
}
