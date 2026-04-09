/**
 * ai.worker.js
 * 
 * This script is a pure Web Worker that calculates
 * pathfinding, states, and behavior for all non-player entities in the game.
 * 
 * It runs entirely on a separate CPU thread from the Three.js renderer,
 * receiving messages from the Core Engine and posting results back without 
 * blocking the DOM or 60FPS render loop.
 */

class EntitiesManager {
    constructor() {
        this.entities = new Map(); // Store by ID
        this.gridSize = 2; // Map unit size (matches Three.js FPV setup)
        this.playerPos = { x: 0, z: 0 };
        this.globalHostility = false;
        this.wagerWon = false;
        
        // Set up listener for the main engine
        self.addEventListener('message', (e) => this.handleEngineMessage(e));
        
        // Tick AI every 1000ms for testing
        setInterval(() => this.tickAI(), 1000);
    }

    handleEngineMessage(e) {
        if (!e.data || !e.data.type) return;

        switch(e.data.type) {
            case 'INIT_ENTITIES':
                // Engine passes the raw level layout and initial enemy spots
                this.mapData = e.data.mapData;
                this.mapWidth = this.mapData.length;
                this.mapHeight = this.mapData[0].length;
                this.initEntities(e.data.spawns);
                break;
            case 'PLAYER_MOVE':
                // Updating AI awareness
                this.playerPos = { x: e.data.x, z: e.data.z };
                break;
            case 'PLAYER_ATTACK':
                // The Game Engine has forwarded an attack command from the UI
                const dmg = e.data.damage || 25; 
                // Only this specific monster becomes hostile
                const t = this.entities.get(e.data.targetId);
                if (t && t.state !== 'HOSTILE') {
                    t.state = 'HOSTILE';
                }
                this.applyDamage(e.data.targetId, dmg);
                break;
            case 'WAGER_RESULT':
                if (e.data.won) {
                    this.wagerWon = true;
                } else {
                    this.globalHostility = true; // Lost wager makes them hostile
                }
                break;
        }
    }

    initEntities(spawns) {
        spawns.forEach(s => {
            this.entities.set(s.id, {
                id: s.id,
                type: s.type, // 'monster' or 'npc'
                x: s.x,
                z: s.z,
                spawnX: s.x,
                spawnZ: s.z,
                hp: s.type === 'monster' || s.type === 'goblin' ? 50 : 100, // Enforce 50 HP limit
                state: 'IDLE', // IDLE, STALKING, HOSTILE, SEARCHING, TALKING
                moveEnergy: 0,
                searchTurns: 0
            });
        });
        console.log("[AI Worker] Initialized Entities:", this.entities);
    }

    // The main AI loop
    tickAI() {
        if (this.entities.size === 0) return;

        const updates = [];
        
        this.entities.forEach(entity => {
            // Very basic AI logic for testing
            if (entity.state === 'DEAD') return;

            const dx = this.playerPos.x - entity.x;
            const dz = this.playerPos.z - entity.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            const prevState = entity.state;
            
            if (entity.type === 'monster') {
                // Global hostility overrides regular states
                if (this.globalHostility && entity.state !== 'HOSTILE') {
                    entity.state = 'HOSTILE';
                    updates.push({ id: entity.id, action: 'STATE', state: 'HOSTILE' });
                }

                // AI State Machine
                if (entity.state === 'IDLE') {
                    if (!this.globalHostility && !this.wagerWon && dist < 6) {
                        entity.state = 'STALKING';
                        updates.push({ id: entity.id, action: 'STATE', state: 'STALKING' });
                    } else if (this.wagerWon) {
                        // Walk around randomly
                        if (Math.random() < 0.2) {
                            const nx = entity.x + (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.5 ? 1 : 0);
                            const nz = entity.z + (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.5 ? 1 : 0);
                            if (this.isWalkable(nx, nz)) {
                                entity.x = nx;
                                entity.z = nz;
                                updates.push({ id: entity.id, action: 'MOVE', x: entity.x, z: entity.z, state: 'IDLE' });
                            }
                        }
                    } else if (entity.x !== entity.spawnX || entity.z !== entity.spawnZ) {
                        // Walk back to spawn point
                        const path = this.findPath({x: entity.x, z: entity.z}, {x: entity.spawnX, z: entity.spawnZ});
                        if (path && path.length > 0) {
                            entity.x = path[0].x;
                            entity.z = path[0].z;
                            updates.push({ id: entity.id, action: 'MOVE', x: entity.x, z: entity.z, state: 'IDLE' });
                        }
                    }
                } else if (entity.state === 'STALKING') {
                    if (dist < 2) {
                        entity.state = 'HOSTILE';
                        updates.push({ id: entity.id, action: 'STATE', state: 'HOSTILE' });
                    } else if (dist > 8) {
                        entity.state = 'IDLE';
                        updates.push({ id: entity.id, action: 'STATE', state: 'IDLE' });
                    } else {
                        // Move sideways relative to player
                        entity.moveEnergy += 0.5;
                        if (entity.moveEnergy >= 1) {
                            entity.moveEnergy -= 1;
                            // Target roughly 3 tiles away from player to try to flank
                            const flankX = this.playerPos.x + (Math.random() > 0.5 ? 3 : -3);
                            const flankZ = this.playerPos.z + (Math.random() > 0.5 ? 3 : -3);
                            const path = this.findPath({x: entity.x, z: entity.z}, {x: flankX, z: flankZ});
                            if (path && path.length > 0) {
                                entity.x = path[0].x;
                                entity.z = path[0].z;
                                updates.push({ id: entity.id, action: 'MOVE', x: entity.x, z: entity.z, state: 'STALKING' });
                            }
                        }
                    }
                } else if (entity.state === 'HOSTILE') {
                    if (!this.globalHostility && dist > 7) {
                        entity.state = 'SEARCHING';
                        entity.searchTurns = 0;
                        updates.push({ id: entity.id, action: 'STATE', state: 'SEARCHING' });
                    } else {
                        // Slowed down slightly to allow player kiting
                        entity.moveEnergy += 0.65;
                        if (entity.moveEnergy >= 1) {
                            entity.moveEnergy -= 1;
                            const path = this.findPath({x: entity.x, z: entity.z}, {x: this.playerPos.x, z: this.playerPos.z});
                            if (path && path.length > 0) {
                                entity.x = path[0].x;
                                entity.z = path[0].z;
                                updates.push({ id: entity.id, action: 'MOVE', x: entity.x, z: entity.z, state: 'HOSTILE' });
                            }
                        }
                    }
                } else if (entity.state === 'SEARCHING') {
                    if (dist < 6) {
                        entity.state = 'HOSTILE';
                        updates.push({ id: entity.id, action: 'STATE', state: 'HOSTILE' });
                    } else {
                        entity.searchTurns++;
                        if (entity.searchTurns > 3) {
                            entity.state = 'IDLE';
                            updates.push({ id: entity.id, action: 'STATE', state: 'IDLE' });
                        } else {
                            // Trigger a random 90 degree turn visually in the 3D Engine
                            updates.push({ id: entity.id, action: 'SEARCH_TURN', state: 'SEARCHING' });
                        }
                    }
                }
            } else if (entity.type === 'npc') {
                // NPCs stay still and wait for player interaction
                if (dist < 2 && entity.state !== 'TALKING') {
                    entity.state = 'TALKING';
                    updates.push({ id: entity.id, action: 'TALK', text: "Hey! Want to gamble?" });
                } else if (dist >= 2 && entity.state === 'TALKING') {
                    entity.state = 'IDLE';
                }
            }
        });

        // Batch send updates back to the rendering engine so it can animate them
        if (updates.length > 0) {
            this.sendToEngine({ type: 'AI_UPDATES', updates });
        }
    }

    // --- A* Pathfinding Logic ---
    isWalkable(x, z) {
        if(!this.mapData || x < 0 || x >= this.mapWidth || z < 0 || z >= this.mapHeight) return false;
        if(this.mapData[x][z] === 1) return false; // Legacy structural check
        if(this.mapData[x][z] && this.mapData[x][z].type === 'wall') return false;
        
        // Do not walk through other entities
        let blockedByEntity = false;
        this.entities.forEach(e => {
            if (e.state !== 'DEAD' && e.x === x && e.z === z) blockedByEntity = true;
        });
        return !blockedByEntity;
    }

    findPath(start, end) {
        if (!this.mapData) return null;
        
        const openSet = [{...start, g: 0, h: 0, f: 0, parent: null}];
        const openMap = new Map();
        openMap.set(`${start.x},${start.z}`, openSet[0]);
        const closedSet = new Set();
        const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

        const MAX_STEPS = 200;
        let steps = 0;

        while (openSet.length > 0) {
            if (steps++ >= MAX_STEPS) break;

            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            openMap.delete(`${current.x},${current.z}`);

            if (current.x === end.x && current.z === end.z) {
                const path = [];
                let temp = current;
                while(temp.parent) {
                    path.unshift({x: temp.x, z: temp.z});
                    temp = temp.parent;
                }
                return path;
            }

            closedSet.add(`${current.x},${current.z}`);

            const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // Manhatten cross
            for (const [dx, dz] of neighbors) {
                const nextX = current.x + dx;
                const nextZ = current.z + dz;
                const key = `${nextX},${nextZ}`;

                // We consider the actual player location walkable for the algorithm to succeed
                const isPlayerTile = (nextX === this.playerPos.x && nextZ === this.playerPos.z);
                if (closedSet.has(key) || (!this.isWalkable(nextX, nextZ) && !isPlayerTile)) {
                    continue;
                }

                const gScore = current.g + 1;
                let neighborNode = openMap.get(key);
                
                if (!neighborNode) {
                    neighborNode = {
                        x: nextX, z: nextZ, g: gScore,
                        h: heuristic({x: nextX, z: nextZ}, end),
                        f: gScore + heuristic({x: nextX, z: nextZ}, end),
                        parent: current
                    };
                    openSet.push(neighborNode);
                    openMap.set(key, neighborNode);
                } else if (gScore < neighborNode.g) {
                    neighborNode.parent = current;
                    neighborNode.g = gScore;
                    neighborNode.f = gScore + neighborNode.h;
                }
            }
        }
        return null;
    }

    applyDamage(id, amt) {
        const e = this.entities.get(id);
        if (!e || e.state === 'DEAD') return;
        
        e.hp -= amt;
        console.log(`[AI Worker] Entity ${id} took ${amt} damage. HP is now ${e.hp}`);
        
        if (e.hp <= 0) {
            e.state = 'DEAD';
            this.sendToEngine({ type: 'AI_DEATH', id: e.id });
        } else {
            // Send back the new HP so the 3D Engine can update the UI panel
            this.sendToEngine({ type: 'COMBAT_UPDATE', id: e.id, newHp: e.hp });
        }
    }

    sendToEngine(msg) {
        self.postMessage(msg);
    }
}

// Initialize AI manager in the worker
const AIBrain = new EntitiesManager();
