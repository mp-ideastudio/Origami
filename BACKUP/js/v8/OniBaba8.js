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
            fogDensity:     0.06,
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

        console.log('🐉 Oni-Baba v8 awakens. All pipelines are HERS.');
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
                    text: `Oni-Baba seals ${sealed} passage${sealed>1?'s':''} with dark stone.` });
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

        // FOG: thick when corrupted + tense, thin when benevolent
        const targetFog = _lerp(0.03, 0.14,
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
            case 'INIT_ENTITIES':
                this._onInitEntities(d);
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
        }
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
                text: 'CRUELTY! Oni-Baba watches you strike a surrendered foe.' });
            this._updateMood();
        }

        // Dodge check from hive mind
        const dodge = Math.min(0.5, this.hive.adaptationLevel / 200);
        if (Math.random() < dodge) {
            this._post({ type: 'LOG_EVENT', logType: 'combat',
                text: `The Hive anticipated your ${atk}! Monster DODGED!` });
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
                text: 'The monster drops its weapon and begs for mercy!' });
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
                    text: `Monster retaliates for ${dmg} damage!` });
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
            text: 'Oni-Baba witnesses the kill. −1 Karma.' });
        this._updateMood();
    }

    _onPlayerAction(data) {
        const action = data.action || '';
        this.sensors.silence = 0;
        // Track aggressive pattern
        const aggressive = ['SLASH','THRUST','HEAVY ATTACK','FIREBALL','SHURIKEN','CROSSBOW'];
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
                text: 'You share understanding. Oni-Baba is pleased.' });
            this._updateMood();
            this._post({ type: 'AI_DEATH', targetId: id, peace: true });
        } else {
            this._post({ type: 'LOG_EVENT', logType: 'combat',
                text: 'The monster ignores your words and attacks!' });
            this._monsterRetaliate(id);
        }
    }

    _onSpare(data) {
        const id = data.targetId;
        if (!this.monsters[id]) return;
        const mon = this.monsters[id];
        if (!mon.isPleading) {
            this._post({ type: 'LOG_EVENT', logType: 'karma',
                text: 'The monster is not surrendering.' });
            return;
        }
        this.karma = Math.min(100, this.karma + 20);
        this._post({ type: 'LOG_EVENT', logType: 'karma',
            text: 'Oni-Baba smiles upon your mercy. Your spirit grows.' });
        this._updateMood();
        this._post({ type: 'AI_DEATH', targetId: id, peace: true });
    }

    _onInitEntities(data) {
        this.monsters = {};
        this._post({ type: 'LOG_EVENT', logType: 'karma',
            text: 'You enter the domain of Oni-Baba...' });
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
            this._post({ type: 'REALITY_SHIFT', mood: this.mood });
            this._post({ type: 'LOG_EVENT', logType: 'karma',
                text: `The Underworld trembles. Oni-Baba is now ${this.mood}...` });

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
                        ? 'A black dragon\'s shadow falls across the temple vault. Level 7 awaits.'
                        : 'A white naga\'s blessing kindles in the temple vault. Level 7 awaits.'
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
        this._post({ type: 'LOG_EVENT', logType: 'karma', text: `🐉 "${text}"` });
        if (context) this._post({ type: 'LCD_EVENT', text, context });
    }

    _roomFlavour(roomId) {
        const flavours = [
            'The torches flicker as you enter.',
            'Something watches from the shadows.',
            'A cold wind carries whispers.',
            'The stone here is darker, older.',
            'Oni-Baba\'s presence intensifies.',
            'Dust swirls at your feet.',
            'The air smells of iron and incense.',
            'An ancient ward hums underfoot.',
        ];
        return flavours[(roomId || 0) % flavours.length];
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
                text: `⚠ Oni-Baba detects instability: ${code}` });
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
    getAutoTarget(px, pz, wrappers, cardName, dmg) {
        if (!wrappers || wrappers.length === 0) return null;

        // Find nearest live monster — no range limit (auto-aim for ranged)
        let best = null, bestDist = Infinity;
        for (const w of wrappers) {
            if (w.userData?.isDead) continue;
            const dx = w.position.x - px;
            const dz = w.position.z - pz;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < bestDist) { bestDist = d; best = w; }
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
