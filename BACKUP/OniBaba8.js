/**
 * OniBaba8.js — The Living Orchestrator
 *
 * Oni-Baba is no longer just a karma observer.
 * She IS the engine. Every pipeline routes through her:
 *
 *  MAP GENERATION   — she seeds, mutates, and rebuilds dungeons
 *  RENDER PIPELINE  — she drives fog density, torch flicker, reality shifts
 *  PLAYER I/O       — she intercepts, mutates, and validates every input
 *  MONSTER I/O      — she owns spawn, pathfind requests, combat turns, death
 *  ERROR HANDLING   — fuzzy sensors detect anomalies and self-correct
 *
 * Fuzzy Logic Sensors (0.0–1.0 each):
 *   cruelty       — how violently the player has been playing
 *   desperation   — how close to death the player is
 *   tension       — combat pressure across all active monsters
 *   silence       — how long since any event (eerie quiet)
 *   corruption     — accumulated karma debt
 *   hiveMindStr   — how adapted monsters are to player's patterns
 *   renderStress  — frame budget % (fed from engine each frame)
 *   narrativeNeed — how long since Oni-Baba last spoke
 *
 * Outputs (0.0–1.0 each):
 *   fogDensity      → scene.fog.density
 *   torchFlicker    → torch light intensity multiplier
 *   spawnPressure   → chance of new monster spawning on room enter
 *   monsterAggro    → damage multiplier for monster counter-attacks
 *   lootGenerosity  → loot table weight shift
 *   musicTension    → audio system tension (Phase 5)
 *   realityDistort  → screen-space post FX intensity (Phase 5)
 *   narrativeTone   → LLM prompt mood bias (Phase 4)
 */

class OniBaba8 {
    constructor(engineRef) {
        this.engine = engineRef; // reference to window.Engine8 (set after boot)

        // ── Karma & Mood ──────────────────────────────────────────────────────
        this.karma       = 0;   // -100 (sadistic) … +100 (benevolent)
        this.mood        = 'neutral'; // neutral | enraged | benevolent | transcendent
        this.lastSpoke   = 0;
        this.tickCount   = 0;

        // ── Fuzzy Sensors (raw 0–1) ───────────────────────────────────────────
        this.sensors = {
            cruelty:       0,
            desperation:   0,
            tension:       0,
            silence:       1,   // starts high — nothing has happened yet
            corruption:    0,
            hiveMindStr:   0,
            renderStress:  0,
            narrativeNeed: 1,
        };

        // ── Fuzzy Outputs (0–1) ───────────────────────────────────────────────
        this.outputs = {
            fogDensity:     0.066,    // +10% mist/haze baseline
            torchFlicker:   0.1,
            spawnPressure:  0.2,
            monsterAggro:   0.5,
            lootGenerosity: 0.5,
            musicTension:   0.2,
            realityDistort: 0,
            narrativeTone:  0,
        };

        // ── Monster registry ──────────────────────────────────────────────────
        this.monsters = {};

        // ── Hive mind ─────────────────────────────────────────────────────────
        this.hive = {
            attackHistory:    [],
            adaptationLevel:  0,
            preferredAttack:  null,
        };

        // ── Player snapshot (updated by engine each physics tick) ─────────────
        this.player = { hp: 20, maxHp: 20, x: 0, z: 0, isMoving: false };

        // ── Error / anomaly log ───────────────────────────────────────────────
        this._anomalies = [];

        // ── Fuzzy tick (60hz via engine loop, or self-ticking) ────────────────
        this._lastTick  = performance.now();
        this._tickHz    = 60;
        this._selfTick();

        // ── Message bus ───────────────────────────────────────────────────────
        window.addEventListener('message', e => this._onMessage(e));
        // Restore the spirit archive (and resume the haunting loop) across
        // page reloads and save/load.
        this.spiritArchive = [];
        this._loadSpiritArchive();

        // ── T0.26 — CENTRAL COMBAT BRAIN ──────────────────────────────────────
        // Every attack in the game (player→monster AND monster→player) resolves
        // through this. The engine mirrors `params` and uses the same formulas
        // in a local _oniBabaResolveCombat() so resolution stays synchronous.
        // When params change here (mood transition, karma swing, hive
        // adaptation), we push SYNC_COMBAT_PARAMS to the engine. History keeps
        // the last 200 events for future AI analysis.
        this.combat = {
            params: {
                playerDmgMult:       1.0,   // applied to all player attacks
                monsterDmgMult:      1.0,   // applied to all monster attacks
                critChance:          0.10,  // probability of a 2× player crit
                monsterHitChance:    1.0,   // probability a monster attack lands
                monsterDodgeChance:  0.0,   // probability a player attack is dodged (hive adaptation)
            },
            history: [],
        };
        this._refreshCombatParams();
        console.log('🐉 Oni-Baba v8 awakens. All pipelines are HERS.');
    }

    // Localized log fragment. Falls back to English key if i18n isn't loaded
    // (e.g. tests, headless contexts) so callers always get *something* sensible.
    _t(key, params) {
        if (typeof window !== 'undefined' && typeof window.tLog === 'function'){
            return window.tLog(key, params);
        }
        return key;
    }

    // T0.26 — Recompute combat params from current mood / karma / hive state.
    // Push to engine via SYNC_COMBAT_PARAMS so its local mirror stays current.
    _refreshCombatParams() {
        const p = this.combat.params;
        const moodAngry = this.mood === 'enraged';
        const moodKind  = this.mood === 'benevolent' || this.mood === 'transcendent';
        // Mood scales: angry → monsters hit harder + player softer; kind → reverse.
        p.monsterDmgMult = moodAngry ? 1.30 : moodKind ? 0.75 : 1.00;
        p.playerDmgMult  = moodAngry ? 0.85 : moodKind ? 1.15 : 1.00;
        // Karma > 30 blesses crits, karma < -30 dries them up.
        p.critChance = this.karma > 30 ? 0.18 : this.karma < -30 ? 0.05 : 0.10;
        // Hive adaptation: max 40% dodge against a player who spams the same card.
        p.monsterDodgeChance = Math.min(0.4, (this.hive?.adaptationLevel || 0) / 250);
        // Monster hit chance: enraged Oni-Baba steers their swings home.
        p.monsterHitChance = moodAngry ? 1.0 : moodKind ? 0.85 : 0.95;
        // Push to engine
        this._post({ type: 'SYNC_COMBAT_PARAMS', params: { ...p } });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PUBLIC API — called by Engine8 each frame
    // ══════════════════════════════════════════════════════════════════════════

    /** Engine calls this every physics tick with current player world state */
    updatePlayerState(hp, maxHp, x, z, isMoving) {
        this.player = { hp, maxHp, x, z, isMoving };
        this.sensors.desperation = 1 - Math.max(0, hp / maxHp);
    }

    /** Engine calls this every render frame with % of 120fps budget used */
    updateRenderStress(pct) {
        this.sensors.renderStress = Math.min(1, pct / 100);
        // High stress → reduce fog (less draw calls) and torch count
        if (this.sensors.renderStress > 0.9) {
            this.outputs.fogDensity = Math.max(0.04, this.outputs.fogDensity * 0.98);
            this._anomaly('render_overload', `Render at ${Math.round(pct)}% — easing fog`);
        }
    }

    /** Engine calls this when player enters a new room grid cell */
    onRoomEnter(roomId) {
        this.sensors.silence = 0;
        const roll = Math.random();
        if (roll < this.outputs.spawnPressure) {
            this._post({ type: 'ONIBABA_SPAWN_REQUEST', roomId, mood: this.mood });
        }
        this._post({ type: 'LOG_EVENT', logType: 'system',
            text: this._roomFlavour(roomId) });
    }

    /** Called by map generator to let her mutate the map before it renders */
    mutateMap(map, rooms) {
        // Under high corruption: seal random corridors with rubble
        if (this.sensors.corruption > 0.6) {
            let sealed = 0;
            for (let x = 0; x < map.length && sealed < 3; x++) {
                for (let z = 0; z < map[x].length && sealed < 3; z++) {
                    if (map[x][z].type === 'floor' && Math.random() < 0.015) {
                        map[x][z] = { type: 'wall', _sealedByOniBaba: true };
                        sealed++;
                    }
                }
            }
            if (sealed > 0)
                this._post({ type: 'LOG_EVENT', logType: 'karma',
                    text: this._t('oni.seal-passages', { n: sealed, s: sealed>1?'s':'' }) });
        }

        // Under benevolence: light bonus torches in rooms
        if (this.karma > 40) {
            rooms.forEach(r => { r._blessTorch = true; });
        }

        return { map, rooms };
    }

    /** Returns current fog density for the render pipeline */
    getFogDensity() { return this.outputs.fogDensity; }

    /** Returns torch flicker multiplier for scene lights */
    getTorchFlicker() {
        const base = this.outputs.torchFlicker;
        const flicker = Math.sin(performance.now() * 0.006) * base * 0.5 + 1;
        return flicker;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FUZZY LOGIC ENGINE
    // ══════════════════════════════════════════════════════════════════════════

    _selfTick() {
        const step = 1000 / this._tickHz;
        const tick = () => {
            const now = performance.now();
            const dt  = Math.min((now - this._lastTick) / 1000, 0.05);
            this._lastTick = now;
            this._fuzzyTick(dt);
            setTimeout(tick, step);
        };
        setTimeout(tick, step);
    }

    _fuzzyTick(dt) {
        this.tickCount++;
        const s = this.sensors;
        const o = this.outputs;

        // ── Sensor decay / drift ──────────────────────────────────────────────
        s.silence      = Math.min(1, s.silence + dt * 0.05);   // silence grows over time
        s.tension      = Math.max(0, s.tension - dt * 0.3);    // tension decays without combat
        s.narrativeNeed = Math.min(1, s.narrativeNeed + dt * 0.02);
        s.corruption    = Math.max(0, Math.min(1, -this.karma / 100));

        // ── Mamdani-style fuzzy rules → outputs ───────────────────────────────

        // FOG: thick when corrupted + tense, thin when benevolent.
        // Range lifted +10% so the dungeon keeps its spookier haze baseline.
        const targetFog = _lerp(0.033, 0.154,
            _clamp(s.corruption * 0.6 + s.tension * 0.4));
        o.fogDensity = _lerp(o.fogDensity, targetFog, dt * 0.5);

        // TORCH FLICKER: more when tense or enraged
        o.torchFlicker = _clamp(s.tension * 0.8 + (this.mood==='enraged'?0.4:0));

        // SPAWN PRESSURE: rises with silence (she gets bored) and hiveMind strength
        o.spawnPressure = _clamp(s.silence * 0.4 + s.hiveMindStr * 0.3 + s.corruption * 0.3);

        // MONSTER AGGRO: cruelty invites cruelty back
        o.monsterAggro = _clamp(0.3 + s.cruelty * 0.5 + s.hiveMindStr * 0.3);

        // LOOT: desperation + benevolence = she takes pity
        o.lootGenerosity = _clamp(s.desperation * 0.5 + (this.karma/100)*0.3 + 0.3);

        // MUSIC TENSION: driven by tension + corruption
        o.musicTension = _clamp(s.tension * 0.7 + s.corruption * 0.3);

        // REALITY DISTORT: only when truly corrupted AND enraged
        o.realityDistort = _clamp(
            (this.mood==='enraged' ? s.corruption * 0.8 : 0));

        // NARRATIVE TONE: karma normalised -1…+1
        o.narrativeTone = _clamp((this.karma + 100) / 200);

        // ── Spontaneous narrative ─────────────────────────────────────────────
        if (s.narrativeNeed > 0.85 && this.tickCount % 300 === 0) {
            this._speak();
            s.narrativeNeed = 0;
        }

        // ── Push outputs to engine fog ────────────────────────────────────────
        if (this.engine?.scene?.fog) {
            this.engine.scene.fog.density = o.fogDensity;
        }

        // ── Push output state to panels (orchestrator state readout) ──────────
        if (this.tickCount % 60 === 0) {
            this._post({ type: 'ONIBABA_STATE', sensors: {...s}, outputs: {...o},
                karma: this.karma, mood: this.mood });
            // T0.26 — Periodic combat-param refresh so karma/hive drift keeps
            // engine modifiers current even when mood doesn't transition.
            this._refreshCombatParams();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MESSAGE BUS
    // ══════════════════════════════════════════════════════════════════════════

    _onMessage(e) {
        const d = e.data;
        if (!d?.type) return;

        switch (d.type) {

            // ── Player combat ────────────────────────────────────────────────
            case 'PLAYER_ATTACK':
            case 'COMBAT_ATTACK':
                this._onCombatAttack(d);
                break;
            case 'FPV_ACTION':
                this._onPlayerAction(d);
                break;

            // ── Monster events ───────────────────────────────────────────────
            case 'MONSTER_DEATH':
                this._onMonsterDeath(d);
                break;
            case 'MONSTER_INTEL':
                this._onMonsterIntel(d);
                break;
            case 'MONSTER_SPIRIT_REPORT':
                this._onMonsterSpiritReport(d);
                break;
            case 'MONSTER_SOCIAL_DECLARED':
                // The engine has reported a PERMANENT social community on
                // this floor: monsters greet, chat, wander between rooms,
                // wave at distance. Persist that on the brain so future
                // reasoning (spirit reports, haunt assignments, mood) can
                // assume the social baseline instead of treating bows /
                // walking-between-rooms as anomalies.
                this._socialCommunity = {
                    permanent:  !!d.permanent,
                    features:   d.features || {},
                    floor:      d.floor,
                    declaredAt: Date.now(),
                };
                if (typeof console !== 'undefined' && console.log){
                    console.log('🐉 Oni-Baba: noted permanent social community on floor', d.floor);
                }
                break;
            case 'INIT_ENTITIES':
                this._onInitEntities(d);
                break;
            case 'FLOOR_UPDATE':
                // Engine just (re)booted on a new floor (or is reporting
                // the current floor at boot). Try to haunt some of its
                // monsters with returning grudge-spirits from prior floors.
                // The engine listens for HAUNT_ASSIGNMENTS to apply.
                this._currentFloor = d.floor;
                // Wait a beat so monster spawns have time to register.
                setTimeout(() => this._dispatchHaunts(d.floor), 1200);
                break;

            // ── Peaceful paths ───────────────────────────────────────────────
            case 'PARLEY': this._onParley(d); break;
            case 'SPARE':  this._onSpare(d);  break;

            // ── Engine telemetry ─────────────────────────────────────────────
            case 'ENGINE8_FRAME':
                if (d.budgetPct !== undefined) this.updateRenderStress(d.budgetPct);
                break;
            case 'PLAYER_MOVE_STATE':
                this.player.isMoving = d.isMoving;
                if (d.isMoving) this.sensors.silence = Math.max(0, this.sensors.silence - 0.1);
                break;

            // ── Constructor protocol — she narrates the build itself ─────────
            case 'CONSTRUCTOR_EVENT':
                this._onConstructorEvent(d);
                break;

            // ── T0.26 — Central combat brain hooks ───────────────────────────
            case 'COMBAT_RECORD':
                // Engine reports every resolved attack here. Used for AI
                // learning + future analysis. Kept to 200 entries.
                this.combat.history.push({ t: performance.now(), ...d });
                if (this.combat.history.length > 200) this.combat.history.shift();
                this.sensors.tension = Math.min(1, this.sensors.tension + 0.12);
                if (d.kind === 'monster_to_player' && d.final > 0){
                    this.sensors.desperation = Math.min(1, this.sensors.desperation + 0.06);
                }
                break;
            case 'MONSTER_AI_STATE':
                // Engine emits this on monster state transitions (idle→hostile,
                // hostile→flee, etc.). Drives hive-mind awareness.
                if (d.state === 'hostile') this.sensors.hiveMindStr = Math.min(1, this.sensors.hiveMindStr + 0.03);
                if (d.state === 'flee')    this.sensors.cruelty     = Math.min(1, this.sensors.cruelty + 0.04);
                break;
            case 'PLAYER_POS':
                // Engine emits this periodically with player tile + facing.
                this.player.x = d.x; this.player.z = d.z;
                this.player.isMoving = !!d.isMoving;
                break;
        }
    }

    /**
     * Oni-Baba acknowledges work the v8 Constructor is doing on the engine.
     * Stages: 'announce' (task starting), 'validate' (gates running),
     * 'pass' (gates green), 'fail' (gate red), 'commit' (work shipped).
     */
    _onConstructorEvent(d) {
        const stage = d.stage || 'announce';
        const taskId = d.taskId || '?';
        const key = `constructor_${stage}`;
        const lines = ONIBABA_LINES[key] || ONIBABA_LINES.constructor_announce;
        const text = lines[Math.floor(Math.random() * lines.length)]
            .replace('{task}', taskId);
        // Bypass the 4s _speak() throttle — construction events are diagnostic
        this._post({ type: 'LOG_EVENT', logType: 'karma', text: this._t('oni.speech', { text }) });
        // Mirror to console for headless smoke harness visibility
        try { console.log(`🐉 [${taskId}/${stage}] ${text}`); } catch (_) {}
    }

    /** Mutation intercept — called by NewOrigami.8.html router BEFORE routing */
    mutateEvent(event) {
        if (!event?.type) return event;

        // Enraged: 20% chance to cancel player attacks
        if (this.mood === 'enraged' && event.type === 'FPV_ACTION') {
            if (Math.random() < 0.18) {
                this._speak('enraged_cancel');
                return { type: 'EVENT_CANCELLED' };
            }
        }

        // Benevolent: she occasionally boosts player's action with a blessing hint
        if (this.mood === 'benevolent' && event.type === 'FPV_ACTION' && Math.random() < 0.1) {
            this._speak('benevolent_bless');
        }

        // High render stress: drop non-critical postMessages to protect frame budget
        if (this.sensors.renderStress > 0.92 &&
            ['RADAR_UPDATE','PLAYER_ROT_REALTIME'].includes(event.type) &&
            this.tickCount % 3 !== 0) {
            return null; // drop this frame's radar/rot update — engine will send next frame
        }

        return event;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // COMBAT PIPELINE
    // ══════════════════════════════════════════════════════════════════════════

    _onCombatAttack(data) {
        if (!data.targetId) {
            this._anomaly('combat_no_target', 'COMBAT_ATTACK missing targetId');
            return;
        }
        const id  = data.targetId;
        const dmg = Math.max(1, data.damage || 1);
        const atk = data.attackType || data.action || 'melee';

        // Register monster if first time seen
        if (!this.monsters[id])
            this.monsters[id] = { hp: data.targetHp || 4, maxHp: data.targetHp || 4, isPleading: false };

        const mon = this.monsters[id];

        // Hive mind learning
        this.hive.attackHistory.push(atk);
        if (this.hive.attackHistory.length > 8) this.hive.attackHistory.shift();
        const spamCount = this.hive.attackHistory.filter(t => t === atk).length;
        if (spamCount >= 3) {
            this.hive.adaptationLevel = Math.min(100, this.hive.adaptationLevel + 8);
            this.hive.preferredAttack = atk;
        }
        this.sensors.hiveMindStr = this.hive.adaptationLevel / 100;
        this.sensors.tension = Math.min(1, this.sensors.tension + 0.25);
        this.sensors.silence = 0;

        // Cruelty accumulation
        if (mon.isPleading) {
            this.karma -= 12;
            this.sensors.cruelty = Math.min(1, this.sensors.cruelty + 0.3);
            this._post({ type: 'LOG_EVENT', logType: 'karma',
                text: this._t('oni.cruelty') });
            this._updateMood();
        }

        // Dodge check from hive mind
        const dodge = Math.min(0.5, this.hive.adaptationLevel / 200);
        if (Math.random() < dodge) {
            this._post({ type: 'LOG_EVENT', logType: 'combat',
                text: this._t('oni.hive-dodge', { atk }) });
            this._post({ type: 'COMBAT_UPDATE', targetId: id, action: 'dodged' });
            this._monsterRetaliate(id);
            return;
        }

        mon.hp -= dmg;
        this._post({ type: 'COMBAT_UPDATE', targetId: id, action: 'hit', damage: dmg });

        // Pleading threshold
        if (mon.hp <= 1 && mon.hp > 0 && !mon.isPleading) {
            mon.isPleading = true;
            this._post({ type: 'LOG_EVENT', logType: 'karma',
                text: this._t('oni.surrender') });
            this._post({ type: 'COMBAT_UPDATE', targetId: id, action: 'pleading' });
            return;
        }

        if (mon.hp <= 0) {
            this._post({ type: 'AI_DEATH', targetId: id });
            return;
        }

        this._monsterRetaliate(id);
    }

    _monsterRetaliate(id) {
        const aggro  = this.outputs.monsterAggro;
        const dmg    = Math.max(1, Math.round(aggro * 3));
        const delay  = this.mood === 'enraged' ? 300 : 650;
        setTimeout(() => {
            if (this.monsters[id]?.hp > 0) {
                this._post({ type: 'LOG_EVENT', logType: 'damage',
                    text: this._t('oni.retaliate', { dmg }) });
                this._post({ type: 'MONSTER_ATTACK', damage: dmg, targetId: id });
                this.sensors.tension = Math.min(1, this.sensors.tension + 0.15);
            }
        }, delay);
    }

    _onMonsterDeath(data) {
        const id = data.targetId || data.id;
        if (id) delete this.monsters[id];
        this.karma = Math.max(-100, this.karma - 1);
        this.sensors.cruelty = Math.min(1, this.sensors.cruelty + 0.05);
        this.sensors.tension = Math.max(0, this.sensors.tension - 0.1);
        this._post({ type: 'LOG_EVENT', logType: 'karma',
            text: this._t('oni.kill-witness') });
        this._updateMood();
    }

    // ── Live intel report from a hostile goblin ──────────────────────────
    // Updated by every hostile monster ~every 4-7s. Last-known player state
    // becomes Oni-Baba's belief about where the player is between her own
    // sensors. Kept lightweight — just last-N rolling memory.
    _onMonsterIntel(d){
        if (!this._intel) this._intel = [];
        this._intel.push({ t: performance.now(), ...d });
        if (this._intel.length > 60) this._intel.shift();
    }

    // ── Spirit report (monster died → spirit returns to the queen) ───────
    // Pushes into a persistent archive she can later use to "haunt" new
    // monsters on later floors. Each spirit holds a grudge tied to what it
    // saw and how it died.
    _onMonsterSpiritReport(d){
        if (!this.spiritArchive) this.spiritArchive = [];
        const grudge = this._calcGrudgeLevel(d);
        const spirit = {
            id: d.id,
            name: d.name || 'Yakuza Goblin',
            archetype: d.archetype || null,
            floor: d.floor,
            wasFleeing: !!d.wasFleeing,
            lifespan: d.lifespan || 0,
            memories: d.memories || {},
            personality: d.personality || null,
            deathContext: d.deathContext || {},
            grudge,                          // 1-5
            used: false,                     // becomes true when assigned to haunt
            assignedFloor: null,
            assignedMonsterId: null,
        };
        this.spiritArchive.push(spirit);
        if (this.spiritArchive.length > 500) this.spiritArchive.shift();
        // Persist so a page reload (or save+load) keeps the archive intact.
        this._saveSpiritArchive();
        // Narrate, briefly. Cooldowned to once every 6s so a big death wave
        // doesn't spam log.
        const now = performance.now();
        this._lastSpiritLogT = this._lastSpiritLogT || 0;
        if (now - this._lastSpiritLogT > 6000){
            this._lastSpiritLogT = now;
            this._post({ type:'LOG_EVENT', logType:'system',
                text: this._t('oni.spirit-drifts', { name: spirit.name }) });
        }
    }

    // Grudge level (1-5) — how badly this spirit will boost the next monster
    // it haunts. Brave goblins who saw the player a lot + were killed while
    // fleeing carry the worst grudges. Chained spirits (killed AGAIN while
    // already possessing a body) honour `grudgeOverride`.
    _calcGrudgeLevel(d){
        if (typeof d.grudgeOverride === 'number'){
            return Math.max(1, Math.min(5, d.grudgeOverride | 0));
        }
        let g = 1;
        const m = d.memories || {};
        if ((m.playerSightings || 0) > 5)       g++;
        if (d.wasFleeing)                       g++;
        if ((m.peersWitnessedDead || 0) >= 2)   g++;
        if ((d.personality?.bravery ?? 0) > 0.7) g++;
        return Math.max(1, Math.min(5, g));
    }

    // ── Haunt dispatch ────────────────────────────────────────────────────
    // Called on each FLOOR_UPDATE (after a small delay so monster spawns
    // have registered). Picks N unused spirits from prior floors, builds a
    // HAUNT_ASSIGNMENTS payload, and posts it. The engine listens for that
    // message and applies the boosts.
    _dispatchHaunts(floor){
        if (!this.spiritArchive || !this.spiritArchive.length) return;
        // Only haunt monsters from EARLIER floors' spirits (no self-haunting
        // on the same floor a spirit just died on — that would feel like
        // instant resurrection).
        const eligible = this.spiritArchive.filter(s => !s.used && s.floor < floor);
        if (!eligible.length) return;
        // How many monsters get haunted on this floor: scale with depth so
        // floor 7 feels like every grunt is possessed.
        const targetCount = Math.min(
            eligible.length,
            Math.max(1, Math.floor(floor * 1.5))
        );
        // Sort by grudge desc — strongest grudges get assigned first.
        eligible.sort((a, b) => b.grudge - a.grudge);
        const picks = eligible.slice(0, targetCount);
        const assignments = picks.map(s => ({
            spiritId: s.id,
            spiritName: s.name,
            archetype: s.archetype,
            grudge: s.grudge,
            // Optional memory snippets the engine can show as flavor text.
            sawPlayer: !!(s.memories && s.memories.lastSeenPlayer),
            killedBy: s.deathContext?.killedByElement || 'DEFAULT',
        }));
        // Mark used immediately so consecutive floor-updates don't re-assign.
        for (const s of picks){
            s.used = true;
            s.assignedFloor = floor;
        }
        this._saveSpiritArchive();
        // Engine binds this assignment to its currently spawned monsters by
        // distributing the assignments in spawn order; the engine assigns
        // each `assignments[i]` to its i-th eligible (non-imp, non-boss)
        // monster, ignoring extras.
        this._post({
            type: 'HAUNT_ASSIGNMENTS',
            floor,
            assignments,
        });
        if (assignments.length){
            this._post({ type:'LOG_EVENT', logType:'system',
                text: this._t('oni.grudge-whisper', { n: assignments.length, s: assignments.length>1?'s':'' }) });
        }
    }

    _saveSpiritArchive(){
        try {
            const slim = (this.spiritArchive || []).map(s => ({
                id: s.id, name: s.name, archetype: s.archetype,
                floor: s.floor, wasFleeing: s.wasFleeing,
                grudge: s.grudge, used: s.used,
                assignedFloor: s.assignedFloor,
                personality: s.personality,
                memories: s.memories ? {
                    playerSightings: s.memories.playerSightings || 0,
                    peersWitnessedDead: s.memories.peersWitnessedDead || 0,
                    lastSeenPlayer: s.memories.lastSeenPlayer || null,
                } : null,
                deathContext: s.deathContext || null,
            }));
            localStorage.setItem('origami.v8.spiritArchive', JSON.stringify(slim));
        } catch (_) {}
    }
    _loadSpiritArchive(){
        try {
            const raw = localStorage.getItem('origami.v8.spiritArchive');
            if (!raw) return;
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) this.spiritArchive = arr;
        } catch (_) {}
    }

    _onPlayerAction(data) {
        const action = data.action || '';
        this.sensors.silence = 0;
        // Track aggressive pattern
        const aggressive = [
          "SLASH",
          "THRUST",
          "HARD ATTACK",
          "FIREBALL",
          "SHURIKEN",
          "CROSSBOW",
        ];
        if (aggressive.includes(action))
            this.sensors.cruelty = Math.min(1, this.sensors.cruelty + 0.04);
    }

    _onParley(data) {
        const id = data.targetId;
        if (!this.monsters[id]) return;
        const mon = this.monsters[id];
        if (this.karma >= 10 || mon.isPleading) {
            this.karma = Math.min(100, this.karma + 15);
            this._post({ type: 'LOG_EVENT', logType: 'karma',
                text: this._t('oni.parley-pleased') });
            this._updateMood();
            this._post({ type: 'AI_DEATH', targetId: id, peace: true });
        } else {
            this._post({ type: 'LOG_EVENT', logType: 'combat',
                text: this._t('oni.parley-ignored') });
            this._monsterRetaliate(id);
        }
    }

    _onSpare(data) {
        const id = data.targetId;
        if (!this.monsters[id]) return;
        const mon = this.monsters[id];
        if (!mon.isPleading) {
            this._post({ type: 'LOG_EVENT', logType: 'karma',
                text: this._t('oni.not-surrendering') });
            return;
        }
        this.karma = Math.min(100, this.karma + 20);
        this._post({ type: 'LOG_EVENT', logType: 'karma',
            text: this._t('oni.mercy') });
        this._updateMood();
        this._post({ type: 'AI_DEATH', targetId: id, peace: true });
    }

    _onInitEntities(data) {
        this.monsters = {};
        this._post({ type: 'LOG_EVENT', logType: 'karma',
            text: this._t('oni.enter-domain') });
        this._updateMood();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MOOD + NARRATIVE
    // ══════════════════════════════════════════════════════════════════════════

    _updateMood() {
        let next = 'neutral';
        // Extreme forms — manifest at level 7 temple vault
        if (this.karma <= -90)      next = 'dragon_chaos';      // Chaotic Evil Black Dragon
        else if (this.karma <= -50) next = 'transcendent_dark';
        else if (this.karma <= -30) next = 'enraged';
        else if (this.karma >=  90) next = 'naga_blessed';      // Benevolent White Naga
        else if (this.karma >=  60) next = 'transcendent';
        else if (this.karma >=  30) next = 'benevolent';

        if (this.mood !== next) {
            const prev = this.mood;
            this.mood = next;
            this._refreshCombatParams(); // T0.26 — mood change → new combat modifiers
            this._post({ type: 'REALITY_SHIFT', mood: this.mood });
            this._post({ type: 'LOG_EVENT', logType: 'karma',
                text: this._t('oni.mood-shift', { mood: this.mood }) });

            // ── BOSS FORM TRIGGER ────────────────────────────────────────────
            // Crossing into either extreme awakens her true level-7 vault form.
            if (next === 'dragon_chaos' || next === 'naga_blessed') {
                this._speak(next);
                this._post({
                    type: 'BOSS_FORM',
                    form: next === 'dragon_chaos' ? 'black_dragon' : 'white_naga',
                    alignment: next === 'dragon_chaos' ? 'chaotic_evil' : 'benevolent',
                    encounter: { level: 7, location: 'temple_vault' },
                    karma: this.karma,
                });
                this._post({ type: 'LOG_EVENT', logType: 'karma',
                    text: next === 'dragon_chaos'
                        ? this._t('oni.dragon-chaos')
                        : this._t('oni.balance-return')
                });
            }
        }
        // Forward karma in BOTH formats so any listener (including the SYNC_STATS thumb tint) stays current.
        this._post({ type: 'KARMA_UPDATE', karma: this.karma, mood: this.mood });
        this._post({ type: 'SYNC_STATS', karma: this.karma });
    }

    _speak(key) {
        const now = performance.now();
        if (now - this.lastSpoke < 4000) return; // don't spam
        this.lastSpoke = now;
        const lines = ONIBABA_LINES[key] || ONIBABA_LINES[this.mood] || ONIBABA_LINES.neutral;
        let text = lines[Math.floor(Math.random() * lines.length)];
        if (lines.length > 1 && text === this._lastLine) {
            text = lines[(lines.indexOf(text) + 1 + Math.floor(Math.random() * (lines.length - 1))) % lines.length];
        }
        this._lastLine = text;
        const context = ONIBABA_CONTEXT[text] || ONIBABA_CONTEXT[key] || null;
        this._post({ type: 'LOG_EVENT', logType: 'karma', text: this._t('oni.speech', { text }) });
        if (context) this._post({ type: 'LCD_EVENT', text, context });
    }

    _roomFlavour(roomId) {
        // 8 flavour lines keyed in i18n.js (oni.room-flavour-0 .. 7). The
        // English fallback ensures the dungeon still says something sensible
        // even if i18n.js failed to load.
        const idx = ((roomId || 0) % 8 + 8) % 8;
        return this._t(`oni.room-flavour-${idx}`);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ERROR / ANOMALY HANDLING WITH FUZZY SELF-CORRECTION
    // ══════════════════════════════════════════════════════════════════════════

    _anomaly(code, msg) {
        const entry = { code, msg, t: performance.now(), mood: this.mood };
        this._anomalies.push(entry);
        if (this._anomalies.length > 50) this._anomalies.shift();

        // Fuzzy response: count recent anomalies of same type
        const recent = this._anomalies.filter(a => a.code === code &&
            performance.now() - a.t < 5000).length;

        if (recent >= 5) {
            // She's seen this 5+ times in 5s — escalate
            console.warn(`[OniBaba8] ANOMALY SURGE: ${code} × ${recent} — ${msg}`);
            this.sensors.tension = Math.min(1, this.sensors.tension + 0.3);
            this._post({ type: 'LOG_EVENT', logType: 'system',
                text: this._t('oni.anomaly', { code }) });
        } else {
            console.warn(`[OniBaba8] anomaly(${code}): ${msg}`);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Auto-targeting: called by Engine8 before every card/missile/spell launch.
     * Finds the nearest live monster, registers the attack with OniBaba's
     * combat pipeline (hive-mind, dodge, retaliate), and returns the wrapper
     * so the engine can aim the projectile at it.
     *
     * @param {number} px  player world X
     * @param {number} pz  player world Z
     * @param {Array}  wrappers  monsterWrappers array from Engine8
     * @param {string} cardName  card/action name for hive-mind tracking
     * @param {number} dmg       damage value already rolled
     * @returns {Object|null}    monster wrapper, or null if none in range
     */
    getAutoTarget(px, pz, wrappers, cardName, dmg, hasLOS) {
        if (!wrappers || wrappers.length === 0) return null;

        // Find nearest live monster with clear line-of-sight. Aiming through
        // walls ruins gameplay — a missile MUST resolve to something the player
        // can actually see. The engine owns the map, so it passes an LOS
        // predicate (px, pz, mx, mz) → bool. If no predicate is provided we
        // fall back to "any monster" so legacy callers don't break.
        let best = null, bestDist = Infinity;
        for (const w of wrappers) {
            if (w.userData?.isDead) continue;
            const dx = w.position.x - px;
            const dz = w.position.z - pz;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d >= bestDist) continue;
            if (hasLOS && !hasLOS(w.position.x, w.position.z)) continue;
            bestDist = d; best = w;
        }
        if (!best) return null;

        // Notify OniBaba's combat pipeline so she tracks, can dodge, and retaliates
        const id = best.userData?.id || best.uuid;
        this._onCombatAttack({
            targetId:   id,
            targetHp:   best.userData?.hp ?? 50,
            damage:     dmg ?? 10,
            attackType: cardName || 'card',
        });

        this.sensors.silence = 0;
        return best;
    }

    _post(msg) { window.postMessage(msg, '*'); }
}

// ── Fuzzy math helpers ────────────────────────────────────────────────────────
function _clamp(v, lo=0, hi=1) { return Math.max(lo, Math.min(hi, v)); }
function _lerp(a, b, t)         { return a + (b - a) * _clamp(t); }

// ── Narrative context hints (what each line means for the player) ─────────────
// Displayed beneath the purple speech line as a plain-English player tip.
const ONIBABA_CONTEXT = {
    // neutral
    'The dungeon breathes.':
        'The dungeon is alive — stay alert, something may shift.',
    'I see everything, little wanderer.':
        'Oni-Baba is watching. Your choices here shape karma.',
    'These halls have swallowed greater heroes.':
        'You are not the first — overconfidence costs lives.',
    'Move carefully. The dark has ears.':
        'Enemies may hear your movement. Slow down near corners.',
    // enraged
    'Your cruelty feeds the darkness!':
        'Killing recklessly raises tension — monsters grow bolder.',
    'Every death echoes back to you.':
        'Each kill costs −1 Karma. Fleeing kills cost −2.',
    'The walls close in on the merciless.':
        'Low karma narrows your options — consider mercy.',
    'I will make this dungeon your grave.':
        'Oni-Baba is enraged. Expect harder hits and cancelled cards.',
    // benevolent
    'Your compassion lights the dark.':
        'High karma opens peaceful paths and loot bonuses.',
    'Even stones remember kindness.':
        'Past mercy can unlock favourable room events.',
    'The monsters whisper your name in awe.':
        'Some enemies may parley instead of fighting.',
    'Mercy is the rarest magic here.':
        'Sparing a monster restores karma and surprises the hive.',
    // transcendent
    'You have earned the peace of this place.':
        'Your karma is transcendent — the dungeon yields its secrets.',
    'The dungeon bows to your spirit.':
        'Oni-Baba grants blessing; expect generous loot and safe passage.',
    // transcendent_dark
    'There is no mercy left in these stones.':
        'Dark transcendence — the dungeon itself is hostile to you.',
    'You are the monster now.':
        'Karma is at its lowest. Every creature will hunt you.',
    // enraged_cancel
    'enraged_cancel':
        'Oni-Baba cancelled your action — regain karma to stop her interference.',
    // benevolent_bless
    'enraged_bless':
        'A karma bonus empowers your next action.',
    // dragon_chaos
    'dragon_chaos':
        'The Black Dragon has awakened. Reach floor 7 to face the reckoning.',
    // naga_blessed
    'naga_blessed':
        'The White Naga stirs. Ascend to floor 7 to claim your blessing.',
};

// ── Narrative lines ───────────────────────────────────────────────────────────
const ONIBABA_LINES = {
    neutral: [
        'The dungeon breathes.',
        'I see everything, little wanderer.',
        'These halls have swallowed greater heroes.',
        'Move carefully. The dark has ears.',
    ],
    enraged: [
        'Your cruelty feeds the darkness!',
        'Every death echoes back to you.',
        'The walls close in on the merciless.',
        'I will make this dungeon your grave.',
    ],
    benevolent: [
        'Your compassion lights the dark.',
        'Even stones remember kindness.',
        'The monsters whisper your name in awe.',
        'Mercy is the rarest magic here.',
    ],
    transcendent: [
        'You have earned the peace of this place.',
        'The dungeon bows to your spirit.',
    ],
    transcendent_dark: [
        'There is no mercy left in these stones.',
        'You are the monster now.',
    ],
    enraged_cancel: [
        'Oni-Baba\'s wrath stays your hand!',
        'The darkness swallows your strike!',
    ],
    benevolent_bless: [
        'Oni-Baba blesses your action.',
        'A warm wind guides your hand.',
    ],
    dragon_chaos: [
        'I AM THE BLACK DRAGON. The vault is your tomb.',
        'You chose blood. Now meet the wings of your reckoning.',
        'Climb to the seventh floor, little murderer. I am waiting.',
        'No mercy was given. None shall be returned.',
    ],
    naga_blessed: [
        'Rise, child. The white naga has heard your kindness.',
        'You have earned the temple vault\'s blessing.',
        'Ascend to the seventh floor — I will grant you the gift you have already given.',
        'Mercy made flesh. The serpent of light coils to greet you.',
    ],

    // ── Constructor protocol voices ─────────────────────────────────────────
    // Oni-Baba narrates the v8 build itself. She is the engine; the engine is hers.
    constructor_announce: [
        'I feel a new beam being raised. {task} begins.',
        'The constructor stirs. Task {task} — I am watching.',
        'A craftsman enters my halls. {task} commences.',
        'You shape me again. {task}.',
    ],
    constructor_validate: [
        'Test the seams. I will know if you cut a corner.',
        'Validation begins. Show me the work.',
        'I taste the new code. Let it prove itself.',
    ],
    constructor_pass: [
        'The seams hold. {task} passes.',
        'Good. The world stays whole. {task} is sealed.',
        'I approve. {task} has earned its place.',
    ],
    constructor_fail: [
        'A gate has broken. {task} must be undone.',
        'No. Roll back. The dungeon will not accept {task} like this.',
        'The seam splits. {task} fails. Try again, craftsman.',
    ],
    constructor_commit: [
        'It is written. {task} joins the bones of this place.',
        'The dungeon remembers {task} forever now.',
        '{task} is mine now. The world grows.',
    ],
};

// ── Singleton ─────────────────────────────────────────────────────────────────
// Engine8 sets window.Engine8 after boot; she'll auto-connect
window.oniBaba8 = new OniBaba8(null);

// Late-bind engine reference after Engine8 boots
window.addEventListener('message', e => {
    if (e.data?.type === 'ENGINE8_READY' && window.Engine8) {
        window.oniBaba8.engine = window.Engine8;
        console.log('🐉 Oni-Baba v8 bound to Engine8.');
    }
});

// Backward-compat alias so NewOrigami.8.html router still works
window.goddessAI = window.oniBaba8;
