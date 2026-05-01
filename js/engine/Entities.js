export const EntitiesMixin = {
initControls() {
                this.autoWalkPath = []; // Init autowalk array

                // Receive keyboard polling state from the Shell
                window.addEventListener('message', (event) => {
                    const data = event.data;
                    if (!data || !data.type) return;

                    if (data.type === 'KEY_DOWN') {
                        this.clearAutoWalk(); // Interrupt autowalk
                        const k = data.key.toLowerCase();
                        if (k === 'w' || data.key === 'ArrowUp') {
                            if (!this.handleHaltedAttack()) {
                                this.keys.w = true;
                                if (this.combatState === 'player_turn') this.combatState = 'idle';
                            }
                        }
                        if (k === 'a' || data.key === 'ArrowLeft') {
                            this.keys.a = true;
                            if (this.combatState === 'player_turn') this.combatState = 'idle';
                        }
                        if (k === 's' || data.key === 'ArrowDown') {
                            this.keys.s = true;
                            if (this.combatState === 'player_turn') this.combatState = 'idle';
                        }
                        if (k === 'd' || data.key === 'ArrowRight') {
                            this.keys.d = true;
                            if (this.combatState === 'player_turn') this.combatState = 'idle';
                        }
                        if (k === 'q' || data.key === 'q') {
                            this.keys.q = true;
                            if (this.combatState === 'player_turn') this.combatState = 'idle';
                        }
                        if (k === 'e' || data.key === 'e') {
                            this.keys.e = true;
                            if (this.combatState === 'player_turn') this.combatState = 'idle';
                        }
                        if (k === 'g' || data.key === 'g') {
                            this.keys.g = true;
                        }
                    } else if (data.type === 'KEY_UP') {
                        const k = data.key.toLowerCase();
                        if (k === 'w' || data.key === 'ArrowUp') {
                            this.keys.w = false;
                            this.player.autoTurnTarget = null;
                        }
                        if (k === 'a' || data.key === 'ArrowLeft') this.keys.a = false;
                        if (k === 's' || data.key === 'ArrowDown') this.keys.s = false;
                        if (k === 'd' || data.key === 'ArrowRight') this.keys.d = false;
                        if (k === 'q' || data.key === 'q') this.keys.q = false;
                        if (k === 'e' || data.key === 'e') this.keys.e = false;
                        if (k === 'g' || data.key === 'g') this.keys.g = false;
                    }
                });

                // Click to dismiss Chat Bubble or Walk
                window.addEventListener('pointerdown', (e) => {
                    if (this.activeChat && !this.activeChat.fading) {
                        this.activeChat.fading = true;
                        this._haltPlayer = false; // Release movement lock
                    } else if (e.target === this.renderer.domElement) {
                        // Click-to-move disabled by user request. 
                        // "stop autorun, dont autorun"
                    }
                });

                // Add local keyboard listeners in case the FPV iframe receives direct focus
                window.addEventListener('keydown', (e) => {
                    const k = e.key.toLowerCase();
                    this.clearAutoWalk(); // Interrupt autowalk
                    if (k === 'w' || e.key === 'ArrowUp') {
                        if (!this.handleHaltedAttack()) {
                            this.keys.w = true;
                            if (this.combatState === 'player_turn') this.combatState = 'idle';
                        }
                    }
                    if (k === 'a' || e.key === 'ArrowLeft') {
                        this.keys.a = true;
                        if (this.combatState === 'player_turn') this.combatState = 'idle';
                    }
                    if (k === 's' || e.key === 'ArrowDown') {
                        this.keys.s = true;
                        if (this.combatState === 'player_turn') this.combatState = 'idle';
                    }
                    if (k === 'd' || e.key === 'ArrowRight') {
                        this.keys.d = true;
                        if (this.combatState === 'player_turn') this.combatState = 'idle';
                    }
                });
                
                window.addEventListener('keyup', (e) => {
                    const k = e.key.toLowerCase();
                    if (k === 'w' || e.key === 'ArrowUp') {
                        this.keys.w = false;
                        this.player.autoTurnTarget = null;
                    }
                    if (k === 'a' || e.key === 'ArrowLeft') this.keys.a = false;
                    if (k === 's' || e.key === 'ArrowDown') this.keys.s = false;
                    if (k === 'd' || e.key === 'ArrowRight') this.keys.d = false;
                });
                
                window.addEventListener('blur', () => {
                    this.keys = { w: false, a: false, s: false, d: false };
                    this.player.autoTurnTarget = null;
                });
            },

clearAutoWalk() {
                this.autoWalkPath = [];
                if (this.player.autoTurnTarget !== null && this.keys.w === false) {
                    this.player.autoTurnTarget = null;
                }
                if (this.pathVisualsGroup) {
                    while (this.pathVisualsGroup.children.length > 0) {
                        this.pathVisualsGroup.remove(this.pathVisualsGroup.children[0]);
                    }
                }
            },

findPath(startX, startZ, endX, endZ, precomputedEntityMap = null) {
                // Optimized A* Algorithm
                const startNode = { x: Math.round(startX), z: Math.round(startZ), g: 0, h: 0, f: 0, parent: null };
                const endNode = { x: Math.round(endX), z: Math.round(endZ), g: 0, h: 0, f: 0, parent: null };
                
                if (endNode.x < 0 || endNode.x >= this.mapWidth || endNode.z < 0 || endNode.z >= this.mapHeight) return [];
                if (this.mapData[endNode.x]?.[endNode.z]?.type === 'wall') return [];
                
                // Pre-calculate entity occupancy for O(1) collision checks during pathfinding
                let entityMap = precomputedEntityMap;
                if (!entityMap) {
                    entityMap = new Map();
                    if (this.worldGroup) {
                        for (const child of this.worldGroup.children) {
                            if (child.userData && child.userData.id && !child.userData.type?.startsWith('loot') && !child.userData.isDead) {
                                const eX = Math.round(child.position.x / this.gridSize);
                                const eZ = Math.round(child.position.z / this.gridSize);
                                entityMap.set(`${eX},${eZ}`, true);
                            }
                        }
                    }
                }
                
                let openList = [startNode];
                let openMap = new Map();
                openMap.set(`${startNode.x},${startNode.z}`, startNode);
                let closedMap = new Set();
                
                const getH = (curr, end) => Math.abs(curr.x - end.x) + Math.abs(curr.z - end.z);
                
                let maxIter = 800; // Safe limit
                while (openList.length > 0 && maxIter-- > 0) {
                    let lowestIdx = 0;
                    for (let i = 0; i < openList.length; i++) {
                        if (openList[i].f < openList[lowestIdx].f) lowestIdx = i;
                    }
                    
                    let currNode = openList.splice(lowestIdx, 1)[0];
                    const currKey = `${currNode.x},${currNode.z}`;
                    openMap.delete(currKey);
                    closedMap.add(currKey);
                    
                    if (currNode.x === endNode.x && currNode.z === endNode.z) {
                        let path = [];
                        let curr = currNode;
                        while (curr != null) {
                            path.push({ x: curr.x, z: curr.z });
                            curr = curr.parent;
                        }
                        return path.reverse();
                    }
                    
                    const neighbors = [
                        { x: currNode.x, z: currNode.z - 1 }, // N
                        { x: currNode.x, z: currNode.z + 1 }, // S
                        { x: currNode.x - 1, z: currNode.z }, // W
                        { x: currNode.x + 1, z: currNode.z }  // E
                    ];
                    
                    for (let n of neighbors) {
                        if (n.x < 0 || n.x >= this.mapWidth || n.z < 0 || n.z >= this.mapHeight) continue;
                        if (this.mapData[n.x]?.[n.z]?.type === 'wall') continue;
                        
                        const nKey = `${n.x},${n.z}`;
                        if (closedMap.has(nKey)) continue;
                        
                        // Treat entities as obstacles, unless it's the target destination (like the player)
                        if (entityMap.has(nKey) && !(n.x === endNode.x && n.z === endNode.z)) continue;
                        
                        let gScore = currNode.g + 1;
                        let gScoreIsBest = false;
                        
                        let inOpen = openMap.get(nKey);
                        if (!inOpen) {
                            gScoreIsBest = true;
                            n.h = getH(n, endNode);
                            openList.push(n);
                            openMap.set(nKey, n);
                        } else if (gScore < inOpen.g) {
                            gScoreIsBest = true;
                            n = inOpen;
                        }
                        
                        if (gScoreIsBest) {
                            n.parent = currNode;
                            n.g = gScore;
                            n.f = n.g + n.h;
                        }
                    }
                }
                return [];
            },

setWaypointPath(targetGridX, targetGridZ) {
                this.clearAutoWalk();
                
                const sx = Math.round(this.player.x / this.gridSize);
                const sz = Math.round(this.player.z / this.gridSize);
                
                const path = this.findPath(sx, sz, targetGridX, targetGridZ);
                if (path.length > 1) {
                    // Shift off the current tile
                    path.shift();
                    // this.autoWalkPath = path; // Autowalk DISABLED per user request
                    
                    // Render path visuals
                    const wayGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
                    const destGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 32);
                    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5, depthWrite: false });
                    
                    for (let i = 0; i < path.length; i++) {
                        const pt = path[i];
                        const isDest = (i === path.length - 1);
                        const mesh = new THREE.Mesh(isDest ? destGeo : wayGeo, mat);
                        mesh.position.set(pt.x * this.gridSize, 0.05, pt.z * this.gridSize);
                        mesh.layers.set(1);
                        mesh.layers.enable(3); // Visible in PiP too
                        this.pathVisualsGroup.add(mesh);
                    }
                }
            },

checkCollision(gx, gz, radiusInGridUnits) {                
                // Check 4 corners of bounding box around (gx, gz)
                const points = [
                    { x: gx - radiusInGridUnits, z: gz - radiusInGridUnits },
                    { x: gx + radiusInGridUnits, z: gz - radiusInGridUnits },
                    { x: gx - radiusInGridUnits, z: gz + radiusInGridUnits },
                    { x: gx + radiusInGridUnits, z: gz + radiusInGridUnits },
                ];
                let hitEntity = null;
                for (let p of points) {
                    let cx = Math.round(p.x);
                    let cz = Math.round(p.z);
                    const validation = this.isValidGridSpace(cx, cz);
                    
                    if (validation === false) return true; // Hard wall collision
                    if (validation !== true && typeof validation === 'object') {
                        hitEntity = validation; // We struck a specific entity Mesh
                    }
                }
                return hitEntity ? hitEntity : false; // Return the entity if hit, otherwise False means space is clear
            },

processMonsterTurn() {
                if (!this.worldGroup || !this.player) return;

                const pX = Math.round(this.player.x / this.gridSize);
                const pZ = Math.round(this.player.z / this.gridSize);

                // --- [ARCHITECTURE OPTIMIZATION] ---
                // Precompute the global occupancy map ONCE per turn rather than inside EVERY A* pathfinding request.
                // This eliminates the O(N^2) stuttering caused by iterating 5,000 decor items for every step of every monster's pathfinding.
                const sharedOccupancyMap = new Map();
                for (const child of this.worldGroup.children) {
                    if (child.userData && child.userData.id && !child.userData.type?.startsWith('loot') && !child.userData.isDead) {
                        const eX = Math.round(child.position.x / this.gridSize);
                        const eZ = Math.round(child.position.z / this.gridSize);
                        sharedOccupancyMap.set(`${eX},${eZ}`, true);
                    }
                }

                this.worldGroup.children.forEach(child => {
                    if (!child.userData || !child.userData.ai || child.userData.isDead) return;

                    const ai = child.userData.ai;
                    const eX = Math.round(child.position.x / this.gridSize);
                    const eZ = Math.round(child.position.z / this.gridSize);
                    const distToPlayer = Math.hypot(pX - eX, pZ - eZ);

                    // Skip action if they are already moving
                    if (ai.targetMove) return;

                    // 1. Room Learning (Forensics)
                    let currentRoom = null;
                    if (this.rooms) {
                        for (let r of this.rooms) {
                            if (eX >= r.x && eX < r.x + r.w && eZ >= r.y && eZ < r.y + r.h) {
                                currentRoom = r;
                                break;
                            }
                        }
                        // PREVENT MOVEMENT/AI IN ROOM 0 (Intro Room) UNLESS HOSTILE
                        if (currentRoom && this.rooms.length > 0 && currentRoom.id === this.rooms[0].id) {
                            if (!child.userData.isHostile) {
                                ai.state = 'IDLE';
                                return; 
                            }
                        }
                        
                        if (currentRoom && !ai.memory.knownRooms.has(currentRoom.id)) {
                            ai.memory.knownRooms.add(currentRoom.id);
                            // Smart monsters announce learning
                            if (ai.intelligence > 0.7 && distToPlayer < 8) {
                                window.parent.postMessage({ type: 'LOG_EVENT', logType: 'system', text: `[AI Forensics] ${child.userData.name} mapped the layout of Room ${currentRoom.id}.` }, '*');
                            }
                        }
                    }

                    // 2. Memory Updates
                    if (distToPlayer < 10) {
                        ai.memory.lastPlayerSeenAt = { x: pX, z: pZ };
                    }

                    // 3. FUZZY STATE EVALUATION
                    const hpRatio = child.userData.hp / child.userData.maxHp;
                    
                    if (ai.state !== 'GAMBLING') {
                        if (hpRatio < 0.4 && ai.fear > 0.3) {
                            ai.state = 'FLEEING';
                        } else if (distToPlayer < 8 || child.userData.isHostile) {
                            if (ai.greed > 0.7 && distToPlayer < 4 && child.userData.type !== 'enemy' && !child.userData.isHostile) {
                                ai.state = 'GAMBLING';
                            } else if (ai.aggression > 0.2 || child.userData.isHostile) {
                                ai.state = 'CHASING';
                            } else {
                                ai.state = 'EVALUATING';
                            }
                        } else {
                            ai.state = 'IDLE';
                        }
                    }

                    // 4. EXECUTE TURN ACTIONS
                    switch(ai.state) {
                        case 'IDLE':
                            if (Math.random() < ai.intelligence) {
                                const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
                                const [dx, dz] = dirs[Math.floor(Math.random() * dirs.length)];
                                const isClear = this.isValidGridSpace(eX + dx, eZ + dz);
                                if (isClear === true) {
                                    ai.targetMove = { x: (eX + dx) * this.gridSize, z: (eZ + dz) * this.gridSize };
                                    if (child.userData.walkAction && !child.userData.walkAction.isRunning()) {
                                        child.userData.walkAction.reset().play();
                                    }
                                }
                            }
                            break;
                            
                        case 'CHASING':
                            if (distToPlayer <= 1.5) {
                                // Nethack Combat Turn: Melee Strike Sequence
                                const tx = this.player.x * this.gridSize;
                                const tz = this.player.z * this.gridSize;
                                if (Math.hypot(tx - child.position.x, tz - child.position.z) > 0.01) {
                                    child.lookAt(tx, child.position.y, tz);
                                }
                                
                                // Play animation sequence: Bow -> Walk Forward -> Attack
                                if (child.userData.mixer) {
                                    child.userData.mixer.stopAllAction();
                                    
                                    let seqDelay = 0;
                                    
                                    if (child.userData.bowAction) {
                                        child.userData.bowAction.reset().setLoop(THREE.LoopOnce, 1).play();
                                        seqDelay += 600; // Bow duration
                                    }
                                    
                                    // 1. Walk forward slightly
                                    setTimeout(() => {
                                        if (!child.parent || child.userData.isDead) return;
                                        child.userData.mixer.stopAllAction();
                                        if (child.userData.walkAction) child.userData.walkAction.reset().play();
                                        
                                        // Visually step towards player (30% of the way)
                                        const stepX = child.position.x + (tx - child.position.x) * 0.3;
                                        const stepZ = child.position.z + (tz - child.position.z) * 0.3;
                                        child.position.set(stepX, child.position.y, stepZ);
                                    }, seqDelay);
                                    
                                    // 2. Attack and deal damage
                                    setTimeout(() => {
                                        if (!child.parent || child.userData.isDead) return;
                                        child.userData.mixer.stopAllAction();
                                        if (child.userData.attackAction) child.userData.attackAction.reset().setLoop(THREE.LoopOnce, 1).play();
                                        
                                        const strikeDmg = Math.floor(5 + (ai.aggression * 10)); // Aggression boosts damage
                                        if (window.CombatEngine) window.CombatEngine.resolveMeleeStrike(child.userData.name || 'Monster', strikeDmg);
                                        this.player.hp = Math.max(0, this.player.hp - strikeDmg);
                                        this.syncPlayerStats();
                                        const weaponName = child.userData.weapon || 'Fists';
                                        window.parent.postMessage({ type: 'LOG_EVENT', logType: 'damage', text: `${child.userData.name} aggressively strikes with their ${weaponName} for ${strikeDmg} DMG!` }, '*');
                                        this.addCameraTrauma(0.4 * ai.aggression);
                                        
                                        // 3. Step back to grid center
                                        setTimeout(() => {
                                            if (!child.parent || child.userData.isDead) return;
                                            child.position.set(eX * this.gridSize, child.position.y, eZ * this.gridSize);
                                            child.userData.mixer.stopAllAction();
                                            if (child.userData.idleAction) child.userData.idleAction.reset().play();
                                        }, 500);
                                        
                                    }, seqDelay + 400); // Delay after walk
                                }
                            } else {
                                // Advanced Pathfinding (Intelligence affects path quality)
                                let targetX = pX;
                                let targetZ = pZ;
                                
                                if (distToPlayer >= 10 && ai.intelligence > 0.5 && ai.memory.lastPlayerSeenAt) {
                                    targetX = ai.memory.lastPlayerSeenAt.x;
                                    targetZ = ai.memory.lastPlayerSeenAt.z;
                                }
                                
                                const path = this.findPath(eX, eZ, targetX, targetZ, sharedOccupancyMap);
                                if (path && path.length > 1) {
                                    const nextNode = path[1];
                                    const isClear = this.isValidGridSpace(nextNode.x, nextNode.z);
                                    if (isClear === true || (typeof isClear === 'object' && isClear.userData.id === child.userData.id)) {
                                        ai.targetMove = { x: nextNode.x * this.gridSize, z: nextNode.z * this.gridSize };
                                        if (child.userData.walkAction && !child.userData.walkAction.isRunning()) {
                                            child.userData.walkAction.reset().play();
                                        }
                                    }
                                }
                            }
                            break;
                            
                        case 'FLEEING':
                            const runDirs = [
                                [Math.sign(eX - pX), 0],
                                [0, Math.sign(eZ - pZ)]
                            ];
                            let ran = false;
                            for (let d of runDirs) {
                                if (d[0] === 0 && d[1] === 0) continue;
                                const isClear = this.isValidGridSpace(eX + d[0], eZ + d[1]);
                                if (isClear === true) {
                                    ai.targetMove = { x: (eX + d[0]) * this.gridSize, z: (eZ + d[1]) * this.gridSize };
                                    ran = true;
                                    
                                    if (child.userData.walkAction && !child.userData.walkAction.isRunning()) {
                                        child.userData.walkAction.reset().play();
                                    }
                                    break;
                                }
                            }
                            if (ran && ai.fear > 0.8 && Math.random() < 0.2) {
                                window.parent.postMessage({ type: 'LOG_EVENT', logType: 'system', text: `${child.userData.name} flees in terror!` }, '*');
                            }
                            break;
                            
                        case 'GAMBLING':
                            if (distToPlayer > 5) {
                                ai.state = 'IDLE'; // Player left the table
                            } else if (Math.random() < 0.2) {
                                window.parent.postMessage({ type: 'LOG_EVENT', logType: 'system', text: `${child.userData.name} rattles some dice. "Double or nothing?"` }, '*');
                                
                            }
                            break;
                    }
                });
                
                // Allow player to take their next turn after monsters finish
                setTimeout(() => {
                    if (this.activeTarget && !this.activeTarget.userData.isDead) {
                        this.combatState = 'player_turn';
                        window.parent.postMessage({ type: 'COMBAT_STATE_UPDATE', state: 'player_turn' }, '*');
                    } else {
                        this.combatState = 'idle';
                    }
                }, 300); // 300ms is enough time to let visual tweening finish
            },

processFuzzyAI(delta) {
                if (!this.worldGroup || !this.player) return;

                this.worldGroup.children.forEach(child => {
                    if (!child.userData || !child.userData.ai || child.userData.isDead) return;

                    const ai = child.userData.ai;
                    
                    // ALL MODELS TURN TO PLAYER ALWAYS (Use World Coordinates)
                    const tx = this.player.x;
                    const tz = this.player.z;
                    if (Math.hypot(tx - child.position.x, tz - child.position.z) > 0.01) {
                        child.lookAt(tx, child.position.y, tz);
                    }
                    
                    // 1. Smooth Visual Tweening (Executes every frame if moving)
                    if (ai.targetMove) {
                        const dx = ai.targetMove.x - child.position.x;
                        const dz = ai.targetMove.z - child.position.z;
                        if (Math.hypot(dx, dz) < 0.1) {
                            child.position.x = ai.targetMove.x;
                            child.position.z = ai.targetMove.z;
                            ai.targetMove = null;
                        } else {
                            child.position.x += dx * 5 * delta;
                            child.position.z += dz * 5 * delta;
                        }
                    }
                });
            },

isValidGridSpace(cx, cz) {
                if(cx < 0 || cx >= this.mapWidth || cz < 0 || cz >= this.mapHeight) return false;
                if(this.mapData[cx]?.[cz]?.type === 'wall') return false;
                
                // Entity collision check
                if (this.worldGroup) {
                    for (const child of this.worldGroup.children) {
                        if (child.userData && child.userData.id && !child.userData.type?.startsWith('loot')) {
                            const eX = Math.round(child.position.x / this.gridSize);
                            const eZ = Math.round(child.position.z / this.gridSize);
                            if(cx === eX && cz === eZ) return child; // Return the exact object hit instead of boolean block
                        }
                    }
                }
                
                return true;
            },

checkGridLoS(x1, z1, x2, z2) {
                // Digital Differential Analyzer (DDA) for mathematically pure grid traversal
                let x = Math.round(x1);
                let z = Math.round(z1);
                const endX = Math.round(x2);
                const endZ = Math.round(z2);

                const dx = x2 - x1;
                const dz = z2 - z1;

                const stepX = Math.sign(dx);
                const stepZ = Math.sign(dz);

                // Infinity prevents division by zero if ray is perfectly straight
                const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
                const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;

                // Grid boundaries are at 0.5 offsets because cells are integer aligned
                let tMaxX = stepX === 0 ? Infinity : (stepX > 0 ? (x + 0.5 - x1) * tDeltaX : (x1 - (x - 0.5)) * tDeltaX);
                let tMaxZ = stepZ === 0 ? Infinity : (stepZ > 0 ? (z + 0.5 - z1) * tDeltaZ : (z1 - (z - 0.5)) * tDeltaZ);

                let maxSteps = 100;

                while (maxSteps-- > 0) {
                    if (x >= 0 && x < this.mapWidth && z >= 0 && z < this.mapHeight) {
                        if (this.mapData[x] && this.mapData[x][z] && this.mapData[x][z].type === 'wall') {
                            return false;
                        }
                    } else {
                        return false; // Out of bounds
                    }

                    if (x === endX && z === endZ) return true; // Safely reached target

                    if (tMaxX < tMaxZ) {
                        tMaxX += tDeltaX;
                        x += stepX;
                    } else {
                        tMaxZ += tDeltaZ;
                        z += stepZ;
                    }
                }
                return true;
            },

flattenGoblin(mesh, damage) {
                if (!mesh || mesh.userData.isDead) return;

                mesh.userData.hp = Math.max(0, mesh.userData.hp - damage);
                window.parent.postMessage({
                    type: 'SHOW_COMBAT',
                    health: mesh.userData.hp,
                    maxHp: mesh.userData.maxHp ?? 50,
                    name: mesh.userData.name || 'Yakuza Goblin',
                    entityType: 'enemy'
                }, '*');
                this.spawnDamageText(damage, mesh.position, false);
                window.parent.postMessage({ type: 'LOG_EVENT', logType: 'damage', text: `\u{1FAA8} BOULDER crushes for ${damage} DMG!` }, '*');
                this.addCameraTrauma(0.9);
                this.triggerHitStop(100);

                if (mesh.userData.ai && !mesh.userData.isHostile) {
                    this.triggerRoomAggro(mesh);
                }

                if (mesh.userData.mixer) mesh.userData.mixer.stopAllAction();
                const lethal = mesh.userData.hp <= 0;
                if (lethal) mesh.userData.isDead = true;

                const childMeshes = [];
                mesh.traverse(n => { if (n.isMesh) childMeshes.push(n); });
                const origScale = { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z };
                const flatStart = performance.now();
                const flatDur   = lethal ? 380 : 230;

                const flatAnim = () => {
                    if (!mesh.parent) return;
                    const t = Math.min(1.0, (performance.now() - flatStart) / flatDur);
                    const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
                    mesh.scale.x = origScale.x * (1.0 + e * 2.4);
                    mesh.scale.y = origScale.y * Math.max(0.04, 1.0 - e * 0.97);
                    mesh.scale.z = origScale.z * (1.0 + e * 2.4);
                    childMeshes.forEach(cm => {
                        if (cm.material && cm.material.emissive) {
                            cm.material.emissive.setHex(0xdd4400);
                            cm.material.emissiveIntensity = 4.0 * (1.0 - e);
                        }
                    });
                    if (t < 1.0) {
                        requestAnimationFrame(flatAnim);
                    } else if (lethal) {
                        // Fade out flat corpse and sink through floor, then trigger AI_DEATH cleanup
                        window.parent.postMessage({ type: 'LOG_EVENT', logType: 'system', text: `Monster ${mesh.userData.name || 'Yakuza Goblin'} has been killed. EXP gained. -1 Karma` }, '*');
                        const fadeStart = performance.now();
                        const fadeDur   = 1200; // slightly longer to watch it sink
                        const initialY  = mesh.position.y;
                        const fadeAnim  = () => {
                            if (!mesh.parent) return;
                            const ft = Math.min(1.0, (performance.now() - fadeStart) / fadeDur);
                            
                            mesh.position.y = initialY - (ft * 1.5); // Sink down through floor
                            
                            childMeshes.forEach(cm => {
                                if (cm.material && cm.material.transparent) {
                                    cm.material.opacity = Math.max(0, 0.55 * (1.0 - ft));
                                }
                            });
                            if (ft < 1.0) requestAnimationFrame(fadeAnim);
                            else window.postMessage({ type: 'AI_DEATH', id: mesh.userData.id }, '*');
                        };
                        requestAnimationFrame(fadeAnim);
                    } else {
                        // Survived — spring back to original scale over 350ms
                        const bnStart = performance.now();
                        const bnDur   = 350;
                        const bounceAnim = () => {
                            if (!mesh.parent) return;
                            const bt  = Math.min(1.0, (performance.now() - bnStart) / bnDur);
                            const inv = 1.0 - bt;
                            mesh.scale.x = origScale.x * (1.0 + inv * 2.4);
                            mesh.scale.y = origScale.y * Math.max(0.04 + bt * 0.96, 0.04);
                            mesh.scale.z = origScale.z * (1.0 + inv * 2.4);
                            if (bt < 1.0) {
                                requestAnimationFrame(bounceAnim);
                            } else {
                                mesh.scale.set(origScale.x, origScale.y, origScale.z);
                                // Resume idle animation
                                if (mesh.userData.mixer && mesh.userData.actions && mesh.userData.actions.length > 0) {
                                    const idle = mesh.userData.actions[0];
                                    idle.reset(); idle.setLoop(THREE.LoopRepeat); idle.play();
                                }
                            }
                        };
                        requestAnimationFrame(bounceAnim);
                    }
                };
                requestAnimationFrame(flatAnim);
            },

triggerRoomAggro(hitMesh) {
                if (!hitMesh || !this.worldGroup || !this.rooms) return;
                
                const mX = Math.round(hitMesh.position.x / this.gridSize);
                const mZ = Math.round(hitMesh.position.z / this.gridSize);
                
                let currentRoom = null;
                for (let r of this.rooms) {
                    if (mX >= r.x && mX < r.x + r.w && mZ >= r.y && mZ < r.y + r.h) {
                        currentRoom = r;
                        break;
                    }
                }
                
                // If the hit mesh isn't in a defined room, just aggro the hit mesh itself
                const targets = currentRoom ? this.worldGroup.children.filter(child => {
                    if (!child.userData || !child.userData.ai || child.userData.isDead) return false;
                    const cX = Math.round(child.position.x / this.gridSize);
                    const cZ = Math.round(child.position.z / this.gridSize);
                    return (cX >= currentRoom.x && cX < currentRoom.x + currentRoom.w && cZ >= currentRoom.y && cZ < currentRoom.y + currentRoom.h);
                }) : [hitMesh];

                targets.forEach(mesh => {
                    mesh.userData.isHostile = true;
                    if (mesh.userData.ai) {
                        mesh.userData.ai.aggression = Math.min(1.0, mesh.userData.ai.aggression + 0.5);
                        mesh.userData.ai.state = 'CHASING';
                    }
                    
                    // Turn border visually red persistently
                    if (mesh.userData.fpvBorderMesh) {
                        mesh.userData.fpvBorderMesh.material.color.setHex(0xff0000);
                        mesh.userData.fpvBorderMesh.material.emissive.setHex(0x550000);
                    }
                });
                
                window.parent.postMessage({ type: 'LOG_EVENT', logType: 'system', text: `The room has turned hostile!` }, '*');
            },

checkTriggers() {
                // Calculate the exact grid coordinate 1 tile directly in front of the player
                const dirX = Math.round(-Math.sin(this.player.rot));
                const dirZ = Math.round(-Math.cos(this.player.rot));
                const playerGridX = Math.round(this.player.x / this.gridSize);
                const playerGridZ = Math.round(this.player.z / this.gridSize);
                
                const targetX = playerGridX + dirX;
                const targetZ = playerGridZ + dirZ;

                // Exit Stairs Logic Check
                if (this.mapData[playerGridX] && this.mapData[playerGridX][playerGridZ] && this.mapData[playerGridX][playerGridZ].type === 'stairs') {
                    if (!this.playerSteppedOnStairs) {
                        this.playerSteppedOnStairs = true;
                        window.parent.postMessage({ type: 'SHOW_EXIT' }, '*');
                    }
                } else {
                    if (this.playerSteppedOnStairs) {
                        this.playerSteppedOnStairs = false;
                        // Hiding is natively handled by the Panels UI when PLAYER_MOVE_STATE triggers, 
                        // but resetting this flag allows the exit modal to pop up again if they step back on it.
                    }
                }

                let foundNPC = null;
                let foundMonster = null;
                let closestDist = Infinity;
                let glowingTargets = []; // Array to hold targets that should glow
                let anyEnemyActive = false; // Tracks if any enemy is in combat/proximity
                
                // Scan worldGroup for entities at the target location (forgiving distance check)
                if (this.worldGroup) {
                    for (const child of this.worldGroup.children) {
                        if (child.userData && child.userData.id) {
                            const eX = child.position.x / this.gridSize;
                            const eZ = child.position.z / this.gridSize;
                            
                            // Check distance instead of exact grid match since models sit at exact center
                            const dist = Math.hypot((this.player.x / this.gridSize) - eX, (this.player.z / this.gridSize) - eZ);
                            
                            // True 3D FPV calculations utilizing Global vectors to prevent GC spills
                            this._ct_mPos.copy(child.position);
                            this._ct_mPos.y += 1.0;
                            this._ct_cPos.copy(this.camera.position);
                            const dist3D = this._ct_cPos.distanceTo(this._ct_mPos);
                            
                            this._ct_dirFromPlayer3D.subVectors(this._ct_mPos, this._ct_cPos).normalize();
                            this.camera.getWorldDirection(this._ct_camDir);
                            const dot = this._ct_camDir.dot(this._ct_dirFromPlayer3D);
                            
                            let panelHasLoS = false;
                            
                            // Tactical RPG Distance Rules:
                            // 1. The combat panels ready themselves when a monster is close (<= 10.0 tiles)
                            // 2. You must be facing the monster (dot > 0.4)
                            let makesCombat = false;
                            
                            // Once locked, it stays locked up to 12.0 tiles for retreat/recoil, but ONLY if still in view
                            const isActiveTarget = this.activeTarget && this.activeTarget.userData.id === child.userData.id;
                            
                            if (isActiveTarget && dist <= 12.0 && dot > 0.25) {
                                makesCombat = true; 
                            } else if (dist <= 4.0 && dot > 0.4) {
                                makesCombat = true; 
                            }
                            
                            // 20-Foot Chat Bubble Halt (2 tiles = 20 feet)
                            if (dist <= 2.0 && dot > 0.707 && child.userData.type === 'enemy') {
                                if (!child.userData.chatSpawned) {
                                    child.userData.chatSpawned = true;
                                        window.parent.postMessage({ type: 'LOG_EVENT', text: `Stop Fool!  Where do you think you're going?   Make a wager or duel - your choice.  Its a fool's wager! [止まれ、愚か者め！どこへ行くつもりだ？ 賭けをするか、決闘をするか…選べ。 愚か者の賭けだがな！]`, logType: 'chat' }, '*');
                                    // Halt forward movement at interaction
                                    this._haltPlayer = true;
                                    this.keys.w = false;
                                    this.keys.a = false;
                                    this.keys.s = false;
                                    this.keys.d = false;
                                }
                            }

                            // Eerie Ghost Glow triggers when interacting with player (<= 2.0 tiles / 20 feet)
                            let makesGlow = false;
                            if (dist <= 2.0 && dot > 0.707) {
                                makesGlow = true;
                            } else if (makesCombat) {
                                makesGlow = true; // Always glow in combat
                            }
                            if (child.userData.type === 'enemy') {
                                // Add continuous ethereal floating bob in FPV
                                child.userData.floatOffset = (child.userData.floatOffset || Math.random() * Math.PI * 2) + 0.035;
                                child.position.y = Math.sin(child.userData.floatOffset) * 0.12;

                                if (makesGlow) anyEnemyActive = true;
                                
                                if (!child.userData.glowMeshes) {
                                    child.userData.glowMeshes = [];
                                    let foundSkinned = false;
                                    child.traverse(n => {
                                        if (n.isSkinnedMesh) {
                                            child.userData.glowMeshes.push(n);
                                            foundSkinned = true;
                                        }
                                    });
                                    // Fallback if no skinned mesh found
                                    if (!foundSkinned) child.userData.glowMeshes.push(child);
                                }
                                
                                // GPU OPTIMIZATION: Only add to the expensive OutlinePass if the player is actively interacting/fighting
                                if (makesGlow) {
                                    glowingTargets.push(...child.userData.glowMeshes);
                                }
                            }

                            if (makesCombat) {
                                panelHasLoS = true;
                                
                                if (dist < closestDist) {
                                    closestDist = dist;
                                    if (child.userData.type === 'gambler') {
                                        foundNPC = child;
                                    } else if (child.userData.type === 'enemy') {
                                        foundMonster = child;
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Dynamically assign which enemies get the ethereal outline glow
                if (this.outlinePass) {
                    if (anyEnemyActive) {
                        this.outlinePass.edgeThickness = 0.5;
                        this.outlinePass.edgeStrength = 8.0;
                        this.outlinePass.edgeGlow = 0.8;
                        this.outlinePass.visibleEdgeColor.setRGB(0, 4.0, 3.0);
                    } else {
                        // Distant ethereal thin outline
                        this.outlinePass.edgeThickness = 0.1;
                        this.outlinePass.edgeStrength = 2.0;
                        this.outlinePass.edgeGlow = 0.0;
                        this.outlinePass.visibleEdgeColor.setRGB(0, 1.0, 1.0);
                    }

                    let changed = false;
                    if (this.outlinePass.selectedObjects.length !== glowingTargets.length) {
                        changed = true;
                    } else {
                        for(let i=0; i<glowingTargets.length; i++) {
                            if (this.outlinePass.selectedObjects[i] !== glowingTargets[i]) {
                                changed = true; break;
                            }
                        }
                    }
                    if (changed) {
                        this.outlinePass.selectedObjects = glowingTargets;
                    }
                }
                
                let currentCmd = 'HIDE_COMBAT';
                let currentExitCmd = 'HIDE_EXIT';
                let newTargetId = null;

                if (foundNPC) {
                    this.activeTarget = foundNPC;
                    this.activeTargetDist = closestDist;
                    newTargetId = foundNPC.userData.id;
                    currentCmd = 'SHOW_GAMBLING';
                } else if (foundMonster) {
                    this.activeTarget = foundMonster;
                    this.activeTargetDist = closestDist;
                    newTargetId = foundMonster.userData.id;
                    currentCmd = 'SHOW_COMBAT';
                } else {
                    this.activeTarget = null;
                    this.activeTargetDist = Infinity;
                }
                
                // Only postMessage if the active UI state actually changed, avoiding 60FPS DOM spam
                if (this._lastCombatCmd !== currentCmd || this._lastTargetId !== newTargetId) {
                    this._lastCombatCmd = currentCmd;
                    this._lastTargetId = newTargetId;
                    this._lastSentDist = this.activeTargetDist;
                    
                    if (currentCmd === 'SHOW_GAMBLING') {
                        this.combatState = 'idle';
                        window.parent.postMessage({ type: 'SHOW_GAMBLING' }, '*');
                    } else if (currentCmd === 'SHOW_COMBAT') {
                        if (this.combatState === 'idle') this.combatState = 'player_turn';
                        // Trigger combat float altitude
                        // We rely entirely on model.position.y lerping now to prevent the targeting circle from lifting
                        window.parent.postMessage({ 
                            type: 'SHOW_COMBAT', 
                            health: foundMonster.userData.hp ?? 50,
                            maxHp: foundMonster.userData.maxHp ?? 50,
                            name: foundMonster.userData.name || 'Yakuza Goblin',
                            entityType: foundMonster.userData.type || 'enemy',
                            distance: this.activeTargetDist 
                        }, '*');
                    } else {
                        this.combatState = 'idle';
                        // Reset all monster altitudes when combat drops
                        window.parent.postMessage({ type: 'HIDE_COMBAT' }, '*');
                    }
                } else if (currentCmd === 'SHOW_COMBAT' && Math.abs(this._lastSentDist - this.activeTargetDist) > 0.1) {
                    // Update distance dynamically if it changes significantly while UI is open
                    this._lastSentDist = this.activeTargetDist;
                    window.parent.postMessage({ 
                        type: 'SHOW_COMBAT', 
                        health: foundMonster.userData.hp ?? 50,
                        maxHp: foundMonster.userData.maxHp ?? 50,
                        name: foundMonster.userData.name || 'Yakuza Goblin',
                        entityType: foundMonster.userData.type || 'enemy',
                        distance: this.activeTargetDist 
                    }, '*');
                }
                
                // --- Exit Dungeon Trigger ---
                // The entrance is always at x = Math.floor(this.mapWidth / 2), y = this.mapHeight - 2
                const entranceX = Math.floor(this.mapWidth / 2);
                const entranceZ = this.mapHeight - 2;
                
                if (playerGridX === entranceX && playerGridZ === entranceZ) {
                    // Check if player is facing the stairs (+Z direction)
                    const fZ = -Math.cos(this.player.rot); 
                    if (fZ < -0.8) { // Facing deeply south
                        currentExitCmd = 'SHOW_EXIT';
                    }
                }
                
                if (this._lastExitCmd !== currentExitCmd) {
                    this._lastExitCmd = currentExitCmd;
                    window.parent.postMessage({ type: currentExitCmd }, '*');
                }
            },

syncPlayerStats() {
                window.parent.postMessage({ 
                    type: 'SYNC_STATS', 
                    hp: this.player.hp, 
                    maxHp: this.player.maxHp,
                    gold: this.player.gold, 
                    playerLevel: this.player.level,
                    xp: this.player.xp,
                    maxXp: this.player.nextXp,
                    str: this.player.str, dex: this.player.dex, con: this.player.con, 
                    int: this.player.int, wis: this.player.wis, cha: this.player.cha,
                    karma: this.player.karma
                }, '*');
            },

addXP(amount) {
                this.player.xp += amount;
                window.parent.postMessage({ type: 'LOG_EVENT', logType: 'system', text: `You gained ${amount} XP.` }, '*');
                
                if (this.player.xp >= this.player.nextXp) {
                    this.player.level++;
                    this.player.xp -= this.player.nextXp;
                    this.player.nextXp = Math.floor(this.player.nextXp * 1.5);
                    
                    // Nethack style stat increment
                    const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
                    const boostStat = stats[Math.floor(Math.random() * stats.length)];
                    this.player[boostStat]++;
                    
                    // HP boost based on CON
                    const hpBoost = 10 + Math.floor((this.player.con - 10) / 2);
                    this.player.maxHp += hpBoost;
                    this.player.hp = this.player.maxHp; // Full heal on level up
                    
                    window.parent.postMessage({ type: 'LOG_EVENT', logType: 'system', text: `*** LEVEL UP! You are now Level ${this.player.level}! Your ${boostStat.toUpperCase()} increased! ***` }, '*');
                }
                this.syncPlayerStats();
            },

generateRoomDescription(roomId) {
                const room = this.rooms.find(r => r.id === roomId);
                if (!room) return null;

                let desc = `[ROOM ${roomId}] `;

                if (roomId === 99) {
                    desc += "You have entered a strange, makeshift shop. Odd wares and ancient relics are scattered about.";
                } else if (roomId === 1) {
                    desc += `You stand at the entrance of Level ${this.level || 1}. The ancestral spirits watch you.`;
                } else {
                    const dojoDescs = [
                        "You step onto the woven tatami mats of a silent training hall. The smell of incense lingers.",
                        "Faded banners of forgotten samurai clans hang from the wooden rafters.",
                        "Bamboo practice swords lie scattered across the polished wooden floor.",
                        "A serene meditation chamber. Dust dances in the shafts of dim light.",
                        "The floor here is scarred with deep katana strikes from ancient duels.",
                        "A grand dojo room with a master's elevated platform at the far end.",
                        "Paper sliding doors (shoji) line the walls, though many are torn.",
                        "A martial arts weapons rack stands empty against the wall."
                    ];
                    desc += dojoDescs[roomId % dojoDescs.length];
                }

                // Check for stairs
                const hasStairsUp = this.mapData[room.center.x]?.[room.center.y - 2]?.type === 'stairs_up';
                const hasStairsDown = this.mapData[room.center.x]?.[room.center.y]?.type === 'stairs_down';
                if (hasStairsUp) {
                    desc += " A set of stone stairs leads back up.";
                }
                if (hasStairsDown) {
                    desc += " A dark stairwell descends deeper into the dungeon.";
                }

                // Check for mobs
                const mobsInRoom = this.mobs.filter(m => m.hp > 0 && Math.abs(m.x - room.center.x) < room.w/2 + 2 && Math.abs(m.z - room.center.y) < room.h/2 + 2);
                if (mobsInRoom.length > 0) {
                    const names = mobsInRoom.map(m => m.name || 'a monster');
                    const counts = {};
                    names.forEach(n => counts[n] = (counts[n] || 0) + 1);
                    const mobStrings = Object.entries(counts).map(([name, count]) => `${count} ${name}${count > 1 && !name.endsWith('s') ? 's' : ''}`);
                    
                    desc += ` You notice ${mobStrings.join(', ')} lurking nearby.`;
                } else if (roomId !== 99 && roomId !== 1) {
                    desc += " The room appears to be empty... for now.";
                }

                return desc;
            }
};
