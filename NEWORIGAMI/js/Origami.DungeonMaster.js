class DungeonMaster {
    constructor(game) {
        this.game = game;
        this.monsters = [];
        this.updateInterval = 100; // Update AI every 100ms (10 ticks/sec)
        this.lastUpdate = 0;
        
        // Configuration from global scope (assuming these are available)
        this.config = window.MONSTER_AI_CONFIG || {
            DETECTION_ANGLES: { FRONT: Math.PI / 4, SIDE: Math.PI / 2 },
            VISION_FRONT_RANGE: 12,
            VISION_SIDE_RANGE: 8,
            HEARING_RANGE: 15,
            SEARCH_TURNS: 5
        };
        
        this.states = window.MONSTER_STATES || {
            IDLE: 'IDLE',
            ALERTED: 'ALERTED',
            HOSTILE: 'HOSTILE',
            SEARCHING: 'SEARCHING',
            RETURNING_HOME: 'RETURNING_HOME'
        };
    }

    init(monsters) {
        this.monsters = monsters;
        console.log(`🧠 DungeonMaster initialized with ${this.monsters.length} monsters.`);
    }

    update(time, delta) {
        // Rate limit AI updates for performance
        if (time - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = time;

        this.monsters.forEach(monster => {
            if (!monster.alive || monster.health <= 0) return;
            this.updateMonster(monster);
        });
    }

    updateMonster(monster) {
        // 1. Detection
        const detection = this.detectPlayer(monster);
        
        // 2. State Machine
        switch (monster.aiState) {
            case this.states.IDLE:
                this.handleIdleState(monster, detection);
                break;
            case this.states.ALERTED:
                this.handleAlertedState(monster, detection);
                break;
            case this.states.HOSTILE:
                this.handleHostileState(monster, detection);
                break;
            case this.states.SEARCHING:
                this.handleSearchingState(monster, detection);
                break;
            case this.states.RETURNING_HOME:
                this.handleReturningHomeState(monster, detection);
                break;
        }

        // 3. Update Visuals (Indicators)
        if (window.updateMonsterIndicators) {
            window.updateMonsterIndicators(monster);
        }
    }

    detectPlayer(monster) {
        // Access global player object
        const player = window.player;
        if (!player) return { canSee: false, canHear: false, distance: Infinity };

        const dx = player.x - monster.x;
        const dy = player.y - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Optimization: Early exit if too far
        if (distance > this.config.HEARING_RANGE && distance > this.config.VISION_FRONT_RANGE) {
            return { canSee: false, canHear: false, distance };
        }

        const angleToPlayer = Math.atan2(dx, dy);
        const facingAngle = monster.facingAngle || 0;
        let angleDiff = Math.abs(angleToPlayer - facingAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        // Vision cone detection
        let inVisionCone = false;
        let detectionRange = 0;

        if (angleDiff <= this.config.DETECTION_ANGLES.FRONT) {
            detectionRange = this.config.VISION_FRONT_RANGE;
            inVisionCone = distance <= detectionRange;
        } else if (angleDiff <= this.config.DETECTION_ANGLES.SIDE) {
            detectionRange = this.config.VISION_SIDE_RANGE;
            inVisionCone = distance <= detectionRange;
        }

        // Hearing detection
        const canHear = distance <= this.config.HEARING_RANGE;

        // Line of sight check (expensive, so only do it if potentially visible)
        let hasLOS = false;
        if (inVisionCone) {
            // Use global hasLineOfSight if available
            if (window.hasLineOfSight) {
                hasLOS = window.hasLineOfSight(monster.x, monster.y, player.x, player.y);
            } else {
                hasLOS = true; // Fallback
            }
        }

        return {
            canSee: inVisionCone && hasLOS,
            canHear: canHear,
            distance,
            angleToPlayer
        };
    }

    handleIdleState(monster, detection) {
        if (detection.canSee || detection.canHear) {
            this.transitionState(monster, this.states.ALERTED);
            monster.lastKnownPlayerPos = { x: window.player.x, y: window.player.y };
        }
    }

    handleAlertedState(monster, detection) {
        // Immediately transition to hostile (or add a delay if desired)
        this.transitionState(monster, this.states.HOSTILE);
        monster.lastKnownPlayerPos = { x: window.player.x, y: window.player.y };
        
        // Play alert sound
        if (window.playMonsterAlertSound) {
            window.playMonsterAlertSound(monster);
        }
        
        // Alert other monsters in the same room
        if (window.alertRoomMonsters) {
            window.alertRoomMonsters(monster);
        }
    }

    handleHostileState(monster, detection) {
        if (detection.canSee) {
            // Update last known position
            monster.lastKnownPlayerPos = { x: window.player.x, y: window.player.y };
            
            // Movement logic is typically handled by the game loop / turn manager
            // But we can update the target here
            monster.targetX = window.player.x;
            monster.targetY = window.player.y;

        } else {
            // Lost sight
            this.transitionState(monster, this.states.SEARCHING);
            monster.searchTurnsLeft = this.config.SEARCH_TURNS;
        }
    }

    handleSearchingState(monster, detection) {
        if (detection.canSee) {
            // Found player again
            this.transitionState(monster, this.states.HOSTILE);
            monster.lastKnownPlayerPos = { x: window.player.x, y: window.player.y };
            if (window.playMonsterAlertSound) window.playMonsterAlertSound(monster);
        } else {
            // Logic for decrementing search turns should be in the game turn loop, 
            // but we can check it here if it's time-based. 
            // For turn-based games, this might need to be hooked into the turn manager.
            // Assuming real-time or hybrid:
            // We'll leave the decrementing to the turn manager or a separate logic
            // For now, just check if we should give up
            if (monster.searchTurnsLeft <= 0) {
                this.transitionState(monster, this.states.RETURNING_HOME);
            }
        }
    }

    handleReturningHomeState(monster, detection) {
        // Check if back in spawn room
        const map = window.map;
        const currentTile = map && map[monster.y] && map[monster.y][monster.x];
        
        if (currentTile && currentTile.roomId === monster.homeRoom) {
            this.transitionState(monster, this.states.IDLE);
            monster.flashCounter = 2;
        } else if (detection.canSee) {
            // Player spotted during return - re-engage
            this.transitionState(monster, this.states.HOSTILE);
            monster.lastKnownPlayerPos = { x: window.player.x, y: window.player.y };
            if (window.playMonsterAlertSound) window.playMonsterAlertSound(monster);
        }
    }

    transitionState(monster, newState) {
        const oldState = monster.aiState;
        monster.aiState = newState;
        
        // Call global handler for side effects (visuals, logs)
        if (window.onMonsterStateChange) {
            window.onMonsterStateChange(monster, oldState, newState);
        }
    }
}

// Export to global scope
window.DungeonMaster = DungeonMaster;
