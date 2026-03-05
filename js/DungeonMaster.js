
export class DungeonMaster {
    constructor(stateManager) {
        this.sm = stateManager;
        
        // AI Constants
        this.MONSTER_STATES = {
            IDLE: 'IDLE',
            ALERTED: 'ALERTED', 
            HOSTILE: 'HOSTILE',
            SEARCHING: 'SEARCHING',
            RETURNING_HOME: 'RETURNING_HOME'
        };

        this.CONFIG = {
            SLEEP_DISTANCE: 22,
            WAKE_DISTANCE: 18,
            HARD_SIGHT_RANGE: 14,
            SOFT_SIGHT_RANGE: 22,
            SIDE_SIGHT_MULT: 0.55,
            BACK_SIGHT_MULT: 0.15,
            HEARING_BASE: 7,
            HEARING_LOUD: 11,
            PERCEPTION_DECAY: 0.035,
            ALERT_THRESHOLD: 0.28,
            HOSTILE_THRESHOLD: 0.58,
            DISENGAGE_THRESHOLD: 0.12,
            PATH_REPLAN_MS: 650,
            MAX_BFS_STEPS: 260,
            MOVE_COOLDOWN_BASE: 320,
            HOSTILE_SPEED_MULT: 0.75,
            SEARCH_SPEED_MULT: 0.50,
            RANDOM_IDLE_WANDER_CHANCE: 0.02,
            PERIPHERAL_ANGLE: Math.PI * 0.66,
            SIDE_ANGLE: Math.PI * 0.9,
            FACING_WEIGHT: 1.18,
            DAMAGE_PERCEPTION_BOOST: 0.22,
            GROUP_ALERT_RADIUS: 8,
            GROUP_ALERT_PERCEPTION: 0.35
        };
    }

    // --- Legacy Compatibility ---
    init(monsters) {
        console.log("DungeonMaster: Legacy init called with", monsters ? monsters.length : 0, "monsters");
        // Sync monsters to StateManager
        if (monsters) {
             const state = this.sm.get();
             // wipe and replace
             state.monsters = monsters;
             this.sm.notify('MONSTER_UPDATE', 'BATCH_INIT');
             
             // Also register them as interactables for accessibility
             monsters.forEach(m => {
                 this.sm.registerInteractable({
                     id: m.id || Math.random().toString(36),
                     x: m.x,
                     y: m.y,
                     type: 'monster',
                     name: m.name || 'Unknown Monster',
                     action: 'Attack'
                 });
             });
        }
    }

    processTurn() {
        // Logic Tick for Monsters
        const state = this.sm.get();
        if (state.monsters) {
            state.monsters.forEach(m => {
                if (m.health > 0) {
                    this.updateMonsterAI(m);
                }
            });
        }
    }


    // --- Game Loop & Movement ---

    initGameLoop() {
        if (this._loopRunning) return;
        this._loopRunning = true;
        this._lastFrame = this._now();
        requestAnimationFrame(() => this._tick());
    }

    _tick() {
        if (!this._loopRunning) return;
        const now = this._now();
        const dt = Math.min(now - this._lastFrame, 100); // Cap dt
        this._lastFrame = now;

        const state = this.sm.get();
        if (state.gameMode === 'REALTIME') {
            this._updateRealtime(dt);
        } else {
            // Turn based, wait for input
        }
        
        requestAnimationFrame(() => this._tick());
    }

    _updateRealtime(dt) {
        // 1. Handle Autopilot (Fluid Move)
        if (this.autopilot && this.autopilot.path.length > 0) {
            this._processAutopilot(dt);
        }

        // 2. Monster Realtime Updates (slower tick)
        // Only if player is moving or we want a living world
        this._monsterTickAccumulator = (this._monsterTickAccumulator || 0) + dt;
        if (this._monsterTickAccumulator > 100) { // logic tick 10hz
            this.processTurn(); // Reuse turn logic, but scaled
            this._monsterTickAccumulator = 0;
        }
        
        // 3. Check Interactions/Encounters to switch mode
        this._checkModeSwitch();
    }

    // Start robust fluid movement to a tile
    startAutopilot(targetX, targetY) {
        const state = this.sm.get();
        // Simple BFS to find path
        const path = this._bfsPath(state.player.x, state.player.y, targetX, targetY);
        if (path && path.length > 0) {
            this.autopilot = {
                path: path,
                nextTile: path[0],
                progress: 0, // 0..1 between current (virtual) and next
                speed: 0.005 // tiles per ms
            };
            this.sm.setGameMode('REALTIME');
        }
    }

    _processAutopilot(dt) {
        const p = this.autopilot;
        
        // Move progress
        p.progress += p.speed * dt;
        
        if (p.progress >= 1.0) {
            // Arrived at next tile
            const tile = p.path.shift();
            // Update State (logical position)
            this.sm.movePlayer(tile.x, tile.y);
            
            p.progress = 0;
            if (p.path.length > 0) {
                p.nextTile = p.path[0];
            } else {
                this.autopilot = null; // Done
            }
        }
    }

    _checkModeSwitch() {
        const state = this.sm.get();
        const monsters = state.monsters;
        
        // Switch to turn based if any hostile monster is very close or line of sight
        let danger = false;
        monsters.forEach(m => {
            if (m.health > 0 && m.hostileState === 'HOSTILE') {
                const dist = this._dist(m.x, m.y, state.player.x, state.player.y);
                if (dist < 8) danger = true; // Close proximity
            }
        });
        
        if (danger && state.gameMode === 'REALTIME') {
            this.sm.setGameMode('TURN_BASED');
            this.sm.log("⚠️ Encounter! Switching to Turn-Based Mode.", 'danger');
            this.autopilot = null; // Stop moving
        }
    }

    // Basic BFS returning array of {x,y}
    _bfsPath(sx, sy, ex, ey) {
        const map = this.sm.get().map;
        // reuse existing rebuildPath logic or similar
        // ... (simplified implementation for brevity)
        // If start==end return []
         if (sx === ex && sy === ey) return [];

        const q = [{x: sx, y: sy}];
        const cameFrom = new Map();
        const key = (x,y) => `${x},${y}`;
        cameFrom.set(key(sx, sy), null);
        
        let found = null;
        let steps = 0;
        
        while(q.length > 0 && steps < 500) {
             const curr = q.shift();
             if (curr.x === ex && curr.y === ey) { found = curr; break; }
             
             [[0,1], [0,-1], [1,0], [-1,0]].forEach(([dx, dy]) => {
                const nx = curr.x + dx;
                const ny = curr.y + dy;
                if (!map[ny] || !map[ny][nx]) return;
                if (map[ny][nx].type === '#') return;
                
                const k = key(nx, ny);
                if (!cameFrom.has(k)) {
                    cameFrom.set(k, curr);
                    q.push({x: nx, y: ny});
                }
             });
             steps++;
        }
        
        if (found) {
            const path = [];
            let curr = found;
            while (curr) { path.push(curr); curr = cameFrom.get(key(curr.x, curr.y)); }
            return path.reverse().slice(1);
        }
        return null;
    }

    // --- Reference Helpers ---
    _dist(ax, ay, bx, by) { 
        return Math.hypot(ax - bx, ay - by); 
    }
    
    _now() { return performance.now(); }

    _smoothstep(e0, e1, x) { 
        const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); 
        return t * t * (3 - 2 * t); 
    }

    // --- AI Core ---

    updateMonsterAI(monster) {
        try {
            const state = this.sm.get();
            const player = state.player;

            this._wakeCheck(monster, player);
            if (!monster._sleeping && this._shouldSleep(monster, player)) { 
                monster._sleeping = true; 
                return; 
            }
            if (monster._sleeping) return;

            this._updatePerception(monster, player);
            this._updateState(monster);

            // Behavior
            const now = this._now();
            
            if (monster.hostileState === 'HOSTILE') {
                this._handleHostileBehavior(monster, player, now);
            } else if (monster.hostileState === 'SEARCHING') {
                this._handleSearchingBehavior(monster, now);
            } else if (monster.hostileState === 'INACTIVE') {
                this._handleIdleBehavior(monster);
            }

            // Sync legacy state if needed
            if (!monster.aiState) monster.aiState = this.MONSTER_STATES.IDLE;
            if (monster.hostileState === 'HOSTILE') monster.aiState = this.MONSTER_STATES.HOSTILE;
            else if (monster.hostileState === 'SEARCHING') monster.aiState = this.MONSTER_STATES.SEARCHING;
            else monster.aiState = this.MONSTER_STATES.IDLE;

            this.sm.updateMonster(monster.id, { 
                hostileState: monster.hostileState, 
                aiState: monster.aiState,
                x: monster.x,
                y: monster.y,
                facingAngle: monster.facingAngle
            });

        } catch (e) {
            console.warn('DungeonMaster: AI Error', e);
        }
    }

    _updatePerception(monster, player) {
        if (monster._fuzzyInit !== true) {
            monster._perception = 0;
            monster._lastSeenPlayer = null;
            monster._lastPerceptionUpdate = this._now();
            monster._fuzzyInit = true;
        }

        const now = this._now();
        const dtMs = now - monster._lastPerceptionUpdate;
        monster._lastPerceptionUpdate = now;

        // Decay
        monster._perception *= Math.pow(1 - this.CONFIG.PERCEPTION_DECAY, dtMs / 200);

        const vision = this._calcVisionScore(monster, player);
        // Sound not implemented fully yet, assume silent for now or pass in sound events
        const sound = 0; 

        let composite = vision + sound;
        if (monster.wasHitRecently) {
            composite += this.CONFIG.DAMAGE_PERCEPTION_BOOST;
            monster.wasHitRecently = false;
        }
        
        monster._perception = Math.min(1, monster._perception * 0.55 + composite * 0.65);
        
        if (vision > 0) {
            monster._lastSeenPlayer = { x: player.x, y: player.y, ts: now };
        }
    }

    _calcVisionScore(monster, player) {
        const d = this._dist(monster.x, monster.y, player.x, player.y);
        if (d > this.CONFIG.SOFT_SIGHT_RANGE) return 0;
        
        // Check Line of Sight
        if (!this._checkLOS(monster.x, monster.y, player.x, player.y)) return 0;

        const angleToPlayer = Math.atan2(player.x - monster.x, player.y - monster.y);
        let fa = monster.facingAngle || 0;
        let angDiff = Math.abs(angleToPlayer - fa);
        angDiff = Math.min(angDiff, Math.PI * 2 - angDiff);

        let facingMult = this.CONFIG.BACK_SIGHT_MULT;
        if (angDiff <= this.CONFIG.PERIPHERAL_ANGLE * 0.5) facingMult = 1.0;
        else if (angDiff <= this.CONFIG.SIDE_ANGLE * 0.5) facingMult = this.CONFIG.SIDE_SIGHT_MULT;

        const distNorm = this._smoothstep(0, this.CONFIG.SOFT_SIGHT_RANGE, d);
        return (1 - distNorm) * facingMult * this.CONFIG.FACING_WEIGHT;
    }

    _updateState(monster) {
        // Logic to switch between Idle, Searching, Hostile based on _perception
        const p = monster._perception;
        const now = this._now();

        if (monster.stateLockUntil && now < monster.stateLockUntil) return;

        if (monster.hostileState === 'HOSTILE') {
            const last = monster._lastSeenPlayer;
            // Lost player for > 3s
            if (!last || (now - last.ts) > 3000) {
                if (p < this.CONFIG.DISENGAGE_THRESHOLD) {
                    monster.hostileState = 'SEARCHING';
                    monster.stateLockUntil = now + 1000;
                    this.sm.log(`${monster.name} is searching...`, 'warning');
                }
            }
        } else if (p >= this.CONFIG.HOSTILE_THRESHOLD) {
            monster.hostileState = 'HOSTILE';
            monster.stateLockUntil = now + 2000;
            this.sm.log(`${monster.name} becomes hostile!`, 'danger');
        } else if (p >= this.CONFIG.ALERT_THRESHOLD) {
            if (monster.hostileState !== 'SEARCHING') {
                monster.hostileState = 'SEARCHING';
                this.sm.log(`${monster.name} is alert.`, 'warning');
            }
        } else {
             if (monster.hostileState !== 'INACTIVE') {
                 monster.hostileState = 'INACTIVE';
             }
        }
    }

    _handleHostileBehavior(monster, player, now) {
        // Simple chase
        const last = monster._lastSeenPlayer;
        let target = last ? {x: last.x, y: last.y} : {x: player.x, y: player.y};
        
        // Re-path
        if (!monster._lastPathCalc || now - monster._lastPathCalc > this.CONFIG.PATH_REPLAN_MS) {
            this._rebuildPath(monster, target);
            monster._lastPathCalc = now;
        }

        // Move
        const cd = this.CONFIG.MOVE_COOLDOWN_BASE / this.CONFIG.HOSTILE_SPEED_MULT;
        if (!monster._lastMoveAt || now - monster._lastMoveAt > cd) {
            this._advanceAlongPath(monster, player);
            monster._lastMoveAt = now;
        }

        // Face Player
        const ang = Math.atan2(player.x - monster.x, player.y - monster.y);
        monster.facingAngle = ang;
    }

    _handleSearchingBehavior(monster, now) {
         // Go to last seen
         const last = monster._lastSeenPlayer;
         if (last) {
              if (now - monster._lastPathCalc > this.CONFIG.PATH_REPLAN_MS) {
                  this._rebuildPath(monster, last);
                  monster._lastPathCalc = now;
              }
              const cd = this.CONFIG.MOVE_COOLDOWN_BASE / this.CONFIG.SEARCH_SPEED_MULT;
              if (now - monster._lastMoveAt > cd) {
                  this._advanceAlongPath(monster, null); // Null player means no attack check
                  monster._lastMoveAt = now;
              }
         }
    }

    _handleIdleBehavior(monster) {
        // Wander check
        if (Math.random() < this.CONFIG.RANDOM_IDLE_WANDER_CHANCE) {
            monster.facingAngle = (monster.facingAngle || 0) + (Math.random() * Math.PI / 2 - Math.PI / 4);
        }
    }

    _rebuildPath(monster, target) {
        // Placeholder simple line or BFS
        // Ideally access map from StateManager
        const map = this.sm.get().map; 
        if (!map || map.length === 0) return;

        // BFS
        const q = [{x: monster.x, y: monster.y}];
        const cameFrom = new Map();
        const key = (x,y) => `${x},${y}`;
        cameFrom.set(key(monster.x, monster.y), null);
        
        let found = null;
        let steps = 0;

        while (q.length > 0 && steps < this.CONFIG.MAX_BFS_STEPS) {
            const curr = q.shift();
            steps++;
            if (curr.x === target.x && curr.y === target.y) { found = curr; break; }
            
            [[0,1], [0,-1], [1,0], [-1,0]].forEach(([dx, dy]) => {
                const nx = curr.x + dx;
                const ny = curr.y + dy;
                // Boundary check
                if (nx < 0 || ny < 0 || ny >= map.length || nx >= map[0].length) return;
                // Wall check (assuming map structure)
                const tile = map[ny][nx];
                if (tile.type === '#' || tile.type === 'WALL') return; // TILE.WALL
                
                const k = key(nx, ny);
                if (!cameFrom.has(k)) {
                    cameFrom.set(k, curr);
                    q.push({x: nx, y: ny});
                }
            });
        }
        
        // Reconstruct
        if (found) {
            const path = [];
            let curr = found;
            while (curr) {
                path.push(curr);
                curr = cameFrom.get(key(curr.x, curr.y));
            }
            monster._path = path.reverse().slice(1); // Remove start
        }
    }

    _advanceAlongPath(monster, player) {
        if (!monster._path || monster._path.length === 0) return;
        const next = monster._path[0];
        
        // Check collision with player
        if (player && next.x === player.x && next.y === player.y) {
            // Attack!
            this.sm.log(`${monster.name} attacks you!`, 'danger');
            // Trigger combat logic
            return;
        }

        // Move
        monster.x = next.x;
        monster.y = next.y;
        monster._path.shift();
    }
    
    _shouldSleep(monster, player) {
        if (monster.hostileState === 'HOSTILE') return false;
        return this._dist(monster.x, monster.y, player.x, player.y) > this.CONFIG.SLEEP_DISTANCE;
    }

    _wakeCheck(monster, player) {
        if (this._dist(monster.x, monster.y, player.x, player.y) <= this.CONFIG.WAKE_DISTANCE) {
            monster._sleeping = false;
        }
    }

    // Grid-based Line of Sight (Bresenham's)
    _checkLOS(x1, y1, x2, y2) {
        const state = this.sm.get();
        const map = state.map;
        if (!map) return true;

        let x0 = Math.floor(x1);
        let y0 = Math.floor(y1);
        const xlen = Math.floor(x2);
        const ylen = Math.floor(y2);

        const dx = Math.abs(xlen - x0);
        const dy = Math.abs(ylen - y0);
        const sx = (x0 < xlen) ? 1 : -1;
        const sy = (y0 < ylen) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            // Check Current Tile
            if (map[y0] && map[y0][x0]) {
                const type = map[y0][x0].type;
                if (type === '#' || type === 'WALL') return false;
            } else {
                return false; // Out of bounds
            }

            if (x0 === xlen && y0 === ylen) break;

            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
        return true;
    }
}
