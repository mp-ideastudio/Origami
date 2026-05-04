/**
 * The Goddess Underworld Karma Engine
 * 
 * Orchestrates Turn-Based Combat, Hive-Mind Monster Learning, 
 * and Dynamic Karma-based reality adaptation.
 */

class GoddessAIEngine {
    constructor() {
        this.karmaScore = 0; // -100 (Sadistic) to +100 (Benevolent)
        this.hiveMind = {
            playerPreferredAttack: null,
            attackHistory: [],
            monsterAdaptationLevel: 0 // 0 to 100
        };
        this.monsters = {}; // Tracking health, morale, and states
        
        window.addEventListener('message', this.handleMessage.bind(this));
        console.log("👁️ The Goddess AI has awakened.");
    }

    handleMessage(e) {
        if (!e.data || !e.data.type) return;

        switch (e.data.type) {
            case 'INIT_ENTITIES':
                this.seedDungeon(e.data.mapData);
                break;
                
            case 'PLAYER_ATTACK':
            case 'COMBAT_ATTACK':
                this.processCombatTurn(e.data);
                break;
                
            case 'PARLEY':
                this.processParley(e.data);
                break;
                
            case 'SPARE':
                this.processSpare(e.data);
                break;
        }
    }

    post(msg) {
        // Since GoddessAIEngine now runs in the master shell, post to window directly
        window.postMessage(msg, '*');
    }

    logToPlayer(message, type = 'combat') {
        this.post({ type: 'LOG_EVENT', message, logType: type });
    }

    seedDungeon(mapData) {
        // Evaluate Karma and alter the dungeon logic here
        let mood = "neutral";
        if (this.karmaScore <= -30) mood = "wrathful";
        if (this.karmaScore >= 30) mood = "benevolent";
        
        this.logToPlayer(`The Underworld senses your arrival. The Goddess is ${mood}...`, 'karma');
        this.monsters = {}; // Reset tracking
    }

    processCombatTurn(data) {
        // The player has taken a turn (attacked a monster)
        const targetId = data.targetId;
        const damage = data.damage || 1;
        const attackType = data.attackType || 'melee';
        
        if (!this.monsters[targetId]) {
            this.monsters[targetId] = { hp: data.targetHp || 4, maxHp: data.targetHp || 4, isPleading: false };
        }
        
        const monster = this.monsters[targetId];
        
        // 1. Hive Mind Learning
        this.hiveMind.attackHistory.push(attackType);
        if (this.hiveMind.attackHistory.length > 5) this.hiveMind.attackHistory.shift();
        
        const recentSpam = this.hiveMind.attackHistory.filter(t => t === attackType).length;
        if (recentSpam >= 3) {
            this.hiveMind.monsterAdaptationLevel += 10;
        }

        // 2. Goddess Intervention & Karma (Did you attack a pleading monster?)
        if (monster.isPleading) {
            this.karmaScore -= 10; // Major wrongness!
            this.logToPlayer("CRUELTY! The Goddess watches you strike a surrendered foe.", 'karma');
        } else {
            this.karmaScore -= 1; // Standard combat is slightly negative karma (violence)
        }

        // 3. Process Damage & Monster AI Response
        // Did the Hive mind learn enough to dodge?
        const dodgeChance = Math.min(this.hiveMind.monsterAdaptationLevel, 50) / 100;
        
        if (Math.random() < dodgeChance) {
            // Monster dodged!
            this.logToPlayer(`The Hive Mind anticipated your ${attackType}! The monster DODGED!`, 'combat');
            this.post({ type: 'COMBAT_UPDATE', targetId, action: 'dodged' });
            this.monsterCounterAttack(targetId);
            return; // Player misses
        }

        monster.hp -= damage;
        this.post({ type: 'COMBAT_UPDATE', targetId, action: 'hit', damage: damage });
        
        // 4. Morale Check (Pleading)
        if (monster.hp <= 1 && monster.hp > 0 && !monster.isPleading) {
            monster.isPleading = true;
            this.logToPlayer("The monster drops its weapon and begs for mercy!", 'karma');
            this.post({ type: 'COMBAT_UPDATE', targetId, action: 'pleading' });
            return; // Turn ends, monster doesn't counter-attack while pleading
        }

        if (monster.hp <= 0) {
            // Monster dead
            this.post({ type: 'AI_DEATH', targetId });
            return;
        }

        // 5. Monster Counter-Attack (Turn-Based Retaliation)
        this.monsterCounterAttack(targetId);
    }

    monsterCounterAttack(targetId) {
        // Simple AI Retaliation
        const aggression = this.karmaScore < -20 ? 2 : 1; // Sadistic players face harder hitting monsters
        setTimeout(() => {
            if (this.monsters[targetId] && this.monsters[targetId].hp > 0) {
                this.logToPlayer(`The monster strikes back for ${aggression} damage!`, 'damage');
                this.post({ type: 'COMBAT_UPDATE', targetId, action: 'attack', damage: aggression });
            }
        }, 600); // 600ms delay to feel like a "Turn"
    }

    processParley(data) {
        const targetId = data.targetId;
        if (!this.monsters[targetId]) return;

        const monster = this.monsters[targetId];
        
        // Parley success depends on Karma
        if (this.karmaScore >= 10 || monster.isPleading) {
            this.karmaScore += 15; // Rightness!
            this.logToPlayer("You share a moment of understanding. The monster steps aside.", 'karma');
            monster.hp = 0; // Remove from combat gracefully
            this.post({ type: 'AI_DEATH', targetId, peace: true }); // A peaceful end
        } else {
            this.logToPlayer("The monster ignores your words and attacks!", 'combat');
            this.monsterCounterAttack(targetId);
        }
    }
    
    processSpare(data) {
        const targetId = data.targetId;
        if (!this.monsters[targetId]) return;
        const monster = this.monsters[targetId];
        
        if (monster.isPleading) {
            this.karmaScore += 20; // Ultimate Rightness
            this.logToPlayer("The Goddess smiles upon your mercy. Inner Power grows.", 'karma');
            monster.hp = 0;
            this.post({ type: 'AI_DEATH', targetId, peace: true });
        }
    }
}

// Initialize the Goddess
window.goddessAI = new GoddessAIEngine();
