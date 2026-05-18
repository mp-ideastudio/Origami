# NewOrigami v8 — Design & Architecture Brief
*"The Living Engine"*
*Brainstorm Draft — May 2026*

---

## Vision Statement

v8 is the first version where the **world feels alive before you touch it**.
The map breathes. Monsters think. The Goddess watches.
The card system IS the physics engine.
120fps is the floor, not the goal.

This is the version that honors the project's origin story — a son building the game
his father loved, for everyone's family to play.

---

## What v7 Got Right (Keep Everything)

- **Iframe isolation** — Panels / FPV / Launcher separation is correct. Keep it.
- **postMessage bus** — clean contract layer. v8 extends it, never breaks it.
- **Mixin composition** (CoreMixin + WorldGenMixin + EntitiesMixin etc.) — good pattern, continue.
- **InstancedMesh walls** — 1 draw call for the entire dungeon. Keep.
- **Single shared WebGLRenderer** for card icons — keep, already correct.
- **Oni-Baba karma/mutation bus** — the emotional soul of the game. Expand massively.
- **Card-as-physics** — cards ARE spells ARE projectiles ARE stats. Beautiful, keep.
- **UXAI** — localStorage usage tracking to sort cards. Keep and expand.
- **Loot card 3D models** — keep, just pre-warm better.

---

## What v8 Fixes

| v7 Pain Point | v8 Solution |
|---|---|
| Two parallel engine codebases (js/engine + js/fpv) | One unified engine module |
| WorldGen.js is 162kb in a single file | Split into Map / Spawn / Lights / Triggers modules |
| Top-down map is just the PiP scissor render | Dedicated 2D canvas map system, separate from 3D |
| No LLM integration | Fuzzy Logic Orchestrator + LLM bridge |
| Projectile physics are frame-rate dependent | Fixed timestep physics at 60hz independent of render |
| NewOrigami.Cards.js has all type:'WIND' bug | Rebuild canonical card DB |
| No fog-of-war or vision system | Shadowcasting visibility |
| Monsters have no memory between rooms | Hive Mind persistent state |
| Engine.js in js/engine/ is dead code | Remove |

---

## Architecture: NewOrigami v8

```
NewOrigami.8.html  (Parent Launcher — message router + mutation bus)
├── NewOrigami.Panels.html  (UI Shell — unchanged API surface)
└── NewOrigami.Engine8.html  (Unified 3D Engine iframe)
    ├── /js/v8/core/
    │   ├── Engine8.js         ← main init + RAF loop
    │   ├── Renderer.js        ← Three.js WebGLRenderer setup, layers, PiP scissor
    │   ├── SceneManager.js    ← scene, fog, lights manager
    │   ├── PlayerController.js← movement, camera bob, rotation, input
    │   └── Clock.js           ← fixed 60hz physics tick, uncapped render
    ├── /js/v8/map/
    │   ├── MapGen.js          ← procedural BSP dungeon generator (keep v7 logic, cleaned)
    │   ├── MapRenderer3D.js   ← InstancedMesh walls/floors/ceiling (upgrade from v7)
    │   ├── MapRenderer2D.js   ← OffscreenCanvas top-down at 120fps (NEW)
    │   ├── FogOfWar.js        ← shadowcasting visibility mask (NEW)
    │   └── TriggerSystem.js   ← room entry events, stairs, traps (NEW)
    ├── /js/v8/entities/
    │   ├── EntityManager.js   ← all live entities: monsters, NPCs, loot, projectiles
    │   ├── PathFinder.js      ← A* (keep v7, move to worker)
    │   └── Spawner.js         ← monster/loot placement rules
    ├── /js/v8/combat/
    │   ├── ProjectileSystem.js← fixed-timestep physics (upgrade from js/fpv/Physics.js)
    │   ├── MeleeSystem.js     ← melee hit detection + VFX
    │   └── CardExecutor.js    ← translates FPV_ACTION card name → physics effect
    ├── /js/v8/cards/
    │   └── CardDB.js          ← canonical card database (fix type bug, unify v7 two DBs)
    └── /js/v8/ai/
        ├── FuzzyOrchestrator.js  ← THE BIG NEW BRAIN (see below)
        ├── OniBaba8.js           ← karma + mood (upgrade from root OniBaba.js)
        ├── HiveMind.js           ← cross-room monster memory + adaptation
        └── LLMBridge.js          ← async LLM call manager (non-blocking)
```

---

## The Map System — v8 "Living Map"

### Philosophy
The top-down map in v7 is just the 3D scene re-rendered from above through a scissor viewport.
This creates coupling: map FPS = engine FPS, no fog of war possible, no UI-layer annotations.

v8 separates them entirely.

### MapRenderer2D — OffscreenCanvas
```javascript
// Runs on its own OffscreenCanvas transferred to a Web Worker
// Receives MapData + player pos + visibility mask as typed arrays
// Renders at native resolution, independent of 3D frame budget
// Draws to a DOM canvas element overlaid on the PiP circle via ImageBitmap

class MapRenderer2D {
    constructor(canvas) {
        this.offscreen = canvas.transferControlToOffscreen();
        this.worker = new Worker('/js/v8/map/map.worker.js');
        this.worker.postMessage({ type: 'INIT', canvas: this.offscreen }, [this.offscreen]);
    }

    update(mapData, playerPos, rot, entities, visibilityMask) {
        this.worker.postMessage({ type: 'RENDER', mapData, playerPos, rot, entities, visibilityMask });
    }
}
```

**Map renders at 120fps independently** — the 3D engine renders at its own pace.
The player arrow, enemy blips, loot dots, stairs pulse — all drawn in the worker.

### FogOfWar — Recursive Shadowcasting (Permissive)
Standard roguelike shadowcasting (same algorithm as NetHack, Brogue):
- On each grid move, cast visibility rays outward from player
- Visited tiles permanently revealed (classic roguelike)
- Monsters only visible when in line-of-sight AND within fog radius
- Result stored as `Uint8Array(mapWidth * mapHeight)` — trivially fast

### Map Tile Types (v8 canonical)
```
wall, floor, door_closed, door_open, stairs_up, stairs_down,
chest, altar, trap_hidden, trap_sprung, water, lava, 
pillar, statue, bookshelf, shop_counter
```

### Room Generation — Keep BSP, Add Templates
- Keep v7's BSP corridor logic (it works great)
- Add 12 hand-designed "special rooms" that can be placed by the generator:
  - Goblin War Camp, Merchant Alcove, Oni Shrine, Puzzle Chamber,
    Trophy Room, Prison Cell, Mushroom Garden, Dragon Nest, etc.
- Special rooms have pre-defined loot tables, narrative triggers, and atmosphere

---

## Renderer — 120fps Architecture

### Fixed Physics, Uncapped Render
```javascript
// Clock.js
const PHYSICS_HZ = 60;
const PHYSICS_STEP = 1 / PHYSICS_HZ;
let accumulator = 0;

function gameLoop(timestamp) {
    const delta = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = timestamp;
    accumulator += delta;

    while (accumulator >= PHYSICS_STEP) {
        physicsWorld.tick(PHYSICS_STEP);   // deterministic, frame-rate independent
        aiOrchestrator.tick(PHYSICS_STEP); // fuzzy logic runs at physics rate
        accumulator -= PHYSICS_STEP;
    }

    const alpha = accumulator / PHYSICS_STEP; // interpolation factor
    renderer3D.render(alpha);  // interpolate visual positions for smoothness
    requestAnimationFrame(gameLoop);
}
```

**This gives 120fps render with 60hz game logic. Projectiles hit exactly the same every run.**

### WebGL Renderer Settings (v8)
```javascript
renderer = new THREE.WebGLRenderer({
    antialias: false,        // MSAA off — use FXAA post-pass instead (cheaper, works with bloom)
    powerPreference: 'high-performance',
    precision: 'mediump',    // mediump vs highp saves ~15% GPU on mobile
    stencil: false,          // no stencil buffer needed
    depth: true,
    logarithmicDepthBuffer: false, // not needed at dungeon scales
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // Allow up to 1.5 for retina clarity
renderer.outputColorSpace = THREE.SRGBColorSpace; // r152+ API
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap; // VSM = blurry soft shadows, single pass, faster than PCFSoft
```

### Lighting Strategy
- **1 DirectionalLight** above player (ambient dungeon fill)
- **1 PointLight** on player (headlamp / torch effect)
- **Room PointLights** — one per special prop (altar glow, fire pit, magic lantern)
- **Monster emissive** — monsters have emissiveMaterial so they glow subtly in the dark
- NO SpotLights (expensive shadow maps)
- Dynamic light count capped at 8 total in scene

---

## The Fuzzy Logic Orchestrator

This is the new brain. Not just karma tracking — a full **fuzzy inference system** that manages every interaction in the universe.

### Core Concept
Fuzzy logic replaces hard booleans with **degrees of truth** (0.0–1.0).
Instead of `if (karma < -30) { angry = true }`, we get:
```javascript
// "How angry is Oni-Baba right now?"
angryDegree = FuzzySet.trapezoid(-100, -50, -20, 0).membership(karma);
// Returns 0.0 (not angry) to 1.0 (fully enraged), smoothly
```

Multiple fuzzy rules fire simultaneously and their outputs are blended.

### FuzzyOrchestrator.js — Architecture
```javascript
class FuzzyOrchestrator {
    // INPUT UNIVERSE (sensed state of the game world)
    inputs = {
        karma:          new FuzzyVariable('karma',     -100, 100),
        playerHpPct:    new FuzzyVariable('hp',           0, 1),
        monsterCount:   new FuzzyVariable('monsters',     0, 20),
        timeInDungeon:  new FuzzyVariable('time',         0, 3600),
        roomsExplored:  new FuzzyVariable('rooms',        0, 50),
        combatIntensity:new FuzzyVariable('combat',       0, 1),
        recentKills:    new FuzzyVariable('kills',        0, 10),
        lootCollected:  new FuzzyVariable('loot',         0, 30),
        llmMoodIndex:   new FuzzyVariable('llmMood',      0, 1),  // LLM output
    };

    // OUTPUT UNIVERSE (what the orchestrator controls)
    outputs = {
        spawnPressure:  new FuzzyVariable('spawn',    0, 1),   // how aggressively to spawn
        musicTension:   new FuzzyVariable('music',    0, 1),   // drive ambient audio
        oniBabaMood:    new FuzzyVariable('mood',    -1, 1),   // goddess temperament
        fogDensity:     new FuzzyVariable('fog',      0, 1),   // scene fog
        lootGenerosity: new FuzzyVariable('loot',     0, 1),   // loot quality/qty
        narrativeTone:  new FuzzyVariable('tone',    -1, 1),   // dark vs hopeful log text
        monsterAggro:   new FuzzyVariable('aggro',    0, 1),   // pathfinding urgency
        karmaDecay:     new FuzzyVariable('decay',   -1, 1),   // passive karma drift
    };

    // RULE BASE (fuzzy if-then rules — all fire simultaneously)
    rules = [
        // "IF player is low HP AND monsters are many THEN spawn pressure is low (give them a break)"
        rule('hp.low AND monsters.high → spawn.low', weight: 0.8),
        
        // "IF karma is very negative THEN fog is thick AND music is tense"
        rule('karma.veryNeg → fog.dense AND music.tense', weight: 1.0),
        
        // "IF many rooms explored AND loot is low THEN loot generosity is high"
        rule('rooms.many AND loot.low → lootGen.high', weight: 0.7),
        
        // "IF LLM is in 'curious' mood AND player hasn't killed recently THEN narrative is hopeful"
        rule('llmMood.curious AND kills.none → tone.hopeful', weight: 0.6),
        
        // ... 40+ rules total
    ];
    
    tick(dt) {
        this.fuzzify();     // Convert crisp inputs → fuzzy degrees
        this.infer();       // Apply all rules (Mamdani inference)
        this.defuzzify();   // Centroid method → crisp output values
        this.actuate();     // Apply outputs to the game world
    }
}
```

### What the Orchestrator Controls

Every 60hz tick it pushes output values to subscribers:
- **Engine** — fog density, spawn rate, ambient light warmth
- **OniBaba8** — goddess mood/temperament
- **HiveMind** — monster aggression, adaptation speed
- **LLMBridge** — narrative tone to inject into LLM prompts
- **AudioSystem** (v8 new) — music tension layer volumes
- **MapGen** — loot quality on new floor generation

### LLMBridge — Non-Blocking

```javascript
class LLMBridge {
    constructor(orchestrator) {
        this.queue = [];
        this.pending = false;
        this.lastResponse = null;
        this.orchestrator = orchestrator;
    }

    // Called by game events — non-blocking, fire and forget
    async requestNarrative(context) {
        if (this.pending) return; // Never stall the game loop
        this.pending = true;

        const prompt = this.buildPrompt(context); // includes fuzzy outputs as tone hint
        
        try {
            // Local first (Ollama/WebLLM) — fallback to remote API
            const response = await fetch('/api/llm', {
                method: 'POST',
                body: JSON.stringify({ prompt, maxTokens: 80 }),
                signal: AbortSignal.timeout(3000) // Hard 3s timeout
            });
            
            const text = await response.json();
            this.lastResponse = text;
            this.orchestrator.inputs.llmMoodIndex.value = this.parseMoodIndex(text);
            
            // Push narrative text to event log
            window.postMessage({ type: 'LOG_EVENT', text: text.message, logType: 'narrative' }, '*');
        } catch(e) {
            // Graceful degradation — use pre-written templates
            this.lastResponse = this.pickTemplate(context);
        } finally {
            this.pending = false;
        }
    }

    buildPrompt(ctx) {
        // Orchestrator's fuzzy outputs guide the LLM's tone
        const tone = this.orchestrator.outputs.narrativeTone.value;
        const toneStr = tone > 0.3 ? 'hopeful and whimsical' : tone < -0.3 ? 'ominous and foreboding' : 'neutral';
        
        return `You are Oni-Baba, the Dragon Princess of the underworld.
Tone: ${toneStr}. Karma: ${ctx.karma}. Location: ${ctx.roomDesc}.
Player just: ${ctx.recentAction}. 
Respond in 1-2 sentences as Oni-Baba commenting on this moment. Max 80 tokens.`;
    }
}
```

### LLM Strategy — Local First
1. **WebLLM** (browser WASM, Phi-3-mini or Gemma-2B) — zero latency, works offline
2. **Ollama** (local API at localhost:11434) — larger models if running locally
3. **OpenAI / Anthropic API** — remote fallback if configured
4. **Template bank** — 200 pre-written Oni-Baba lines as final fallback

---

## HiveMind — Cross-Room Monster Memory

In v7, each monster is stateless. In v8:

```javascript
class HiveMind {
    // Persists across the entire dungeon session
    memory = {
        playerLastKnownPos: null,
        playerPreferredCard: null,       // what they spam most
        playerWeakSide: null,            // left vs right approach detection
        totalKillCount: 0,
        totalSpareCount: 0,
        adaptationLevel: 0,              // 0-100, how "learned" the hive is
        alertedRooms: new Set(),         // rooms that know player is nearby
        fearLevel: 0,                    // high fear → monsters flee/cower
    };

    // Called when a monster spots the player
    onSpotPlayer(monster, playerPos) {
        this.memory.playerLastKnownPos = playerPos;
        // Alert adjacent rooms via "sound propagation"
        this.propagateAlert(monster.roomId, 2); // 2 rooms radius
    }
    
    // Called when player uses a card
    onPlayerAction(cardName) {
        const prev = this.memory.playerPreferredCard;
        this.memory.playerPreferredCard = cardName;
        
        // If player uses same card 3+ times, monsters start dodging
        if (cardName === prev) {
            this.memory.adaptationLevel = Math.min(100, this.memory.adaptationLevel + 5);
        }
    }
    
    // Returns aggro modifier for a given monster's pathfinding
    getAggroModifier(monster) {
        if (this.memory.fearLevel > 70) return 0.3; // slowed, frightened
        if (this.memory.adaptationLevel > 60) return 1.4; // more aggressive, faster
        return 1.0;
    }
}
```

---

## Card System v8 — Unified Database

Fix the `type:'WIND'` bug and unify the two card databases (Cards.js + CardRegistry.js):

```javascript
// /js/v8/cards/CardDB.js — single source of truth
export const CardDB = {
    'BOULDER': {
        id: 'boulder',
        name: 'BOULDER',
        element: 'EARTH',          // display element
        type: 'spell',             // spell | melee | ranged | item | passive
        kanji: '地',
        desc: 'Heavy impact.',
        attr: '(STUN * 2DICE)',
        deckCategory: 'EARTH',     // which deck tab it appears in
        isSkillCard: true,         // duplicate pickup → +1 STR
        linkedStat: 'str',
        icon3D: 'EARTH',           // which 3D icon to render
        fx: {
            type: 'projectile',
            geometry: 'dodecahedron',
            size: 0.8,
            color: 0x5C4033,
            speed: 16.0,
            damage: 25,
            roll: true,
            pierce: true,
        },
        fpvTrauma: 0.6,
        fpvRange: 5.0,
    },
    // ... all cards follow same schema
};

// AMMO_CARDS — stacks badges, never duplicates
export const AMMO_CARDS = new Set(['SHURIKEN','SHORT BOW','LONG BOW','CROSSBOW','DAGGER']);

// SKILL_CARDS — first pickup adds card, duplicate = +1 stat
export const SKILL_CARDS = Object.fromEntries(
    Object.entries(CardDB)
        .filter(([,c]) => c.isSkillCard)
        .map(([name, c]) => [name, c.linkedStat])
);
```

---

## Top-Down Map — 2D Canvas at 120fps

The new top-down view lives entirely in a Web Worker drawing to OffscreenCanvas.
**Zero impact on the 3D render budget.**

### Visual Design
Inspired by Brogue/Cogmind — clean ASCII-adjacent pixel art on dark background:
- Floors: dark grey `#1a1a1a` fill + subtle tile grid
- Walls: `#3a3a3a` with a 1px bright top edge (`#666`) for depth
- Player: glowing white arrow `▲` always at center, rotates with camera
- Enemy blips: red pulsing `◆` (size = threat level)
- Loot blips: amber `✦` with shimmer
- Stairs: cyan `⊕` with slow ring pulse
- Unexplored: pure black — **shadowcasting reveals tiles permanently**
- Current room: subtle `rgba(255,255,255,0.03)` background tint
- Fog at room edge: 3-pixel gaussian fade

### Map Legend (bottom of moondial)
Tiny `E`=enemy `L`=loot `S`=stairs key, color-coded, 8px font

---

## Audio System (NEW in v8)

v7 has no audio. v8 adds a layered ambient system using the Web Audio API:

```javascript
class AudioSystem {
    layers = {
        base:    loadAudio('dungeon_base_loop.ogg'),    // always on, looping
        tension: loadAudio('tension_pulse.ogg'),         // driven by orchestrator
        combat:  loadAudio('combat_stinger.ogg'),        // on enemy spotted
        wind:    loadAudio('dungeon_wind.ogg'),          // in corridors
        water:   loadAudio('water_drip.ogg'),            // near water tiles
    };
    
    // Orchestrator drives tension volume smoothly
    setTension(value) { // 0-1 from fuzzy output
        this.layers.tension.gainNode.gain.linearRampToValueAtTime(value, ctx.currentTime + 0.5);
    }
}
```

Sound files kept tiny (<200kb each), loaded lazily.
No positional audio in v1 — just global layer mixing.
Monster footsteps as v8.1 feature.

---

## Entry Point: NewOrigami.8.html

```html
<!-- Same iframe sandwich, cleaner routing -->
<div id="fpv-viewport">
    <iframe id="fpv-iframe" src="NewOrigami.Engine8.html"></iframe>
</div>
<div id="ui-viewport">
    <iframe id="panels-iframe" src="NewOrigami.Panels.html"></iframe>
</div>

<!-- Orchestrator lives in parent, sees all messages -->
<script type="module">
    import { FuzzyOrchestrator }  from './js/v8/ai/FuzzyOrchestrator.js';
    import { OniBaba8 }           from './js/v8/ai/OniBaba8.js';
    import { HiveMind }           from './js/v8/ai/HiveMind.js';
    import { LLMBridge }          from './js/v8/ai/LLMBridge.js';
    import { MessageRouter }      from './js/v8/core/MessageRouter.js';

    const orchestrator = new FuzzyOrchestrator();
    const oniBaba = new OniBaba8(orchestrator);
    const hiveMind = new HiveMind(orchestrator);
    const llm = new LLMBridge(orchestrator);
    const router = new MessageRouter({ orchestrator, oniBaba, hiveMind, llm });

    // Orchestrator ticks independently via RAF — no blocking
    function orchestratorLoop(t) {
        orchestrator.tick(1/60);
        requestAnimationFrame(orchestratorLoop);
    }
    requestAnimationFrame(orchestratorLoop);
</script>
```

---

## Build Phases

### Phase 1 — Foundation (Engine8 shell, renderer, clock)
- [ ] Create `NewOrigami.Engine8.html` with clean Three.js r165+ setup
- [ ] `Clock.js` with fixed-timestep physics loop
- [ ] `Renderer.js` — WebGLRenderer, layers, scissor PiP
- [ ] `SceneManager.js` — fog, lights, scene setup
- [ ] Port `PlayerController.js` from v7 Core.js (movement, bob, rot)
- [ ] Verify 120fps baseline on target hardware

### Phase 2 — Map System
- [ ] Port `MapGen.js` from WorldGen.js (keep BSP logic, add special room templates)
- [ ] `MapRenderer3D.js` — InstancedMesh walls/floors (upgrade from v7 World.js)
- [ ] `FogOfWar.js` — shadowcasting
- [ ] `MapRenderer2D.js` + `map.worker.js` — OffscreenCanvas top-down
- [ ] `TriggerSystem.js` — room entry, stair detection

### Phase 3 — Entities & Combat
- [ ] `EntityManager.js` — unified monster/loot/projectile registry
- [ ] `PathFinder.js` moved to Web Worker (no main thread blocking)
- [ ] `ProjectileSystem.js` — fixed-timestep physics from Physics.js
- [ ] `CardDB.js` — unified card database, fix type bug

### Phase 4 — AI & Orchestrator
- [ ] `FuzzyOrchestrator.js` — core fuzzy system (inputs/outputs/rules/inference)
- [ ] `OniBaba8.js` — karma + mood, consuming orchestrator outputs
- [ ] `HiveMind.js` — cross-room memory, player adaptation
- [ ] `LLMBridge.js` — async LLM with graceful fallback

### Phase 5 — Polish
- [ ] `AudioSystem.js` — layered ambient Web Audio
- [ ] Special room templates (at least 6 for launch)
- [ ] `NewOrigami.8.html` — clean parent launcher with module imports
- [ ] Update `NewOrigami.Panels.html` to consume new ORCHESTRATOR_STATE message type
- [ ] Full regression test of all v7 postMessage contracts

---

## Performance Targets

| Metric | v7 | v8 Target |
|---|---|---|
| Render FPS | 60 (capped) | 120 uncapped |
| Physics tick | frame-coupled | 60hz fixed |
| Wall draw calls | 1 (InstancedMesh) | 1 |
| Top-down render cost | ~20% of 3D frame | 0% (worker) |
| Map gen time | ~800ms sync | <100ms (same thread, faster BSP) |
| First loot pickup stall | 200-400ms | 0ms (pre-warmed) |
| LLM response time | N/A | non-blocking, 0ms stall |
| Monster pathfinding | main thread | worker thread |
| Memory (JS heap) | ~120MB | <80MB (geometry pooling) |

---

## What Makes v8 Revolutionary

1. **The world IS the LLM's body** — Oni-Baba isn't just a karma counter. She reads fuzzy outputs and speaks through the LLM. The dungeon's fog density, music tension, monster aggression and loot generosity are ALL controlled by one coherent fuzzy brain. The world responds to how you play, not just what you click.

2. **120fps separation of concerns** — render is completely decoupled from physics and AI. The game never stutters. The map never steals from the dungeon.

3. **Card IS physics IS AI input** — the card you play:
   - Fires a projectile in the 3D world
   - Feeds into HiveMind (monsters learn your pattern)
   - Feeds into the Orchestrator (combat intensity input)
   - Triggers an LLM narrative beat
   All from one `FPV_ACTION` message.

4. **Non-violent path is first-class** — PARLEY, SPARE, WAGER are not consolation prizes. The Orchestrator gives them equal weight in karma/loot/narrative outputs. The player who never kills can unlock the richest Oni-Baba dialogue and the best loot generosity.

5. **The Fuzzy Orchestrator replaces all hard-coded if/else** — no more magic numbers. The game's "feel" is tunable by adjusting fuzzy set shapes and rule weights. Designers don't write code — they tune membership functions.

---

## Emotional Core (Non-Negotiable)

Every technical decision in v8 passes this test:
*"Does this make the world feel more alive for a kid playing with their parent?"*

The Oni Baba name, the Japanese kanji on every card, the non-violent karma path,
the hopeful/whimsical narrative tone when you spare enemies —
these are not features. They are the reason the game exists.

v8 builds the best engine in the world **in service of that story**.

---

*Last updated: May 2026*
*Next step: Phase 1 kickoff — create NewOrigami.Engine8.html*
