# NewOrigami v8 — Battleplan
*The "Tower of Oni-Baba" Vertical Slice*
*Drafted 2026-05-13*

---

## North Star

> **Stop building features. Finish one 20-minute experience.**

Current state of the codebase scores **61/100** in critical review. Every advertised
system in [NEWORIGAMI_V8_DESIGN.md](NEWORIGAMI_V8_DESIGN.md) is at roughly 60%
completion. The game ships silently, the climactic boss is a ghost, monsters
slide like hockey pucks, and the Fuzzy Orchestrator / LLM Bridge exist only on
paper.

The cure is not 26 separate fixes spread across 7 floors. The cure is to cut
scope to **3 hand-authored floors** and bring every system to **100%** inside
that scope. Floors 4–7 become content drops afterward (v8.1 – v8.4), not
engineering work.

A 3-floor demo that brings a kid to tears at the Mercy Scroll reveal is a
better game than a 7-floor demo where every floor feels half-built.

---

## The Slice — Three Floors, Three Promises

| Floor | Name | Promise to the Player |
|---|---|---|
| 1 | **Mushroom Garden** | "The world reacts to how I move." (tutorial; no death; teaches karma) |
| 2 | **Oni Shrine** | "These monsters are alive." (rigged meshes, layered audio, MVP orchestrator) |
| 3 | **The Folded Throne** | "My choices mattered." (3-phase boss, LLM bridge, fold transition, Mercy Scroll payoff) |

Anything that doesn't serve one of those three promises is deferred to v8.1+.

---

## Definition of Done for v8.0

A new player launches [NewOrigami.8.html](NewOrigami.8.html), plays through 3
floors in ~20 minutes, and at the end:

1. **They heard the world.** Layered ambient audio shifted with karma + combat.
2. **They felt the monsters.** Rigged meshes that walked, attacked, dodged, bowed, fled.
3. **They felt watched.** Oni-Baba spoke at least 4 times with dialogue conditioned by their behavior, at least one line from the LLM.
4. **They felt their choices.** The Mercy Scroll shows every monster they spared. The boss reads it aloud at the climax.
5. **They saw the origami.** One fold transition between two floors made the metaphor literal.
6. **Nothing crashed.** A try/catch around the RAF tick caught and logged any throw without ending the session.
7. **They can come back.** Save state persists between floors via localStorage.

If any of those seven items is missing, v8.0 is not shipped.

---

## Phase 0 — Foundation (Technical Bedrock)

**Goal:** make the codebase capable of holding the slice. No gameplay work here.

### 0.1 Modularize [NewOrigami.Engine8.html](NewOrigami.Engine8.html)
The 6,053-line monolith mixes renderer, world-gen, AI, combat, PiP, input.
Extract into `js/v8/` modules, leaving Engine8.html as a thin loader.

| Extract from Engine8.html | Into | Approx. lines |
|---|---|---|
| Renderer setup, fog, scene, lights | `js/v8/core/Renderer.js` | ~400 |
| Player controller, camera, input | `js/v8/core/PlayerController.js` | ~500 |
| Fixed-timestep RAF loop | `js/v8/core/Clock.js` | ~80 |
| Dungeon gen (rooms, MST, spawns) | `js/v8/map/MapGen.js` | ~800 |
| InstancedMesh wall/floor renderer | `js/v8/map/MapRenderer3D.js` | ~300 |
| PiP top-down camera | `js/v8/map/PiPCamera.js` | ~500 |
| Monster registry + AI | `js/v8/entities/EntityManager.js` | ~700 |
| Pathfinding | `js/v8/entities/PathFinder.js` | ~200 |
| Projectile physics | `js/v8/combat/ProjectileSystem.js` | ~400 |
| Melee + hit-stop | `js/v8/combat/MeleeSystem.js` | ~250 |
| Card → effect translator | `js/v8/combat/CardExecutor.js` | ~300 |

After extraction, Engine8.html should be under **600 lines** (HTML shell +
module imports + RAF bootstrap).

### 0.2 Wrap the RAF tick in `try/catch`
Currently any throw kills the game. In [Engine8.html](NewOrigami.Engine8.html)'s
main loop, catch and `console.error`; show a one-line fallback overlay.

### 0.3 Save/load
On stair descent and floor entry, persist to localStorage:
```js
{ floor, px, pz, rot, hp, karma, deck, mapSeed, monstersAlive }
```
9 fields. ~40 lines. Loads on engine ready (`ENGINE8_READY`).

### 0.4 Memory leak fix
Spells and boulders push to `activeSpells` / `activeBoulders` arrays
([Engine8.html:5090+](NewOrigami.Engine8.html#L5090)) but never dispose. On
impact:
```js
scene.remove(mesh);
mesh.geometry.dispose();
mesh.material.dispose();
arr.splice(idx, 1);
```

### 0.5 Collision substepping
Replace single `canWalk()` per frame with N substeps of ≤ 0.3 × GRID. Fixes
phase-through bug at high frame deltas.

**Phase 0 acceptance:** game still plays identically to today, but Engine8.html
is < 600 lines, throws are caught, state persists across reload, and the
walk-through-walls bug is gone.

---

## Phase 1 — Floor 1: Mushroom Garden

**Goal:** prove the karma loop teaches itself.

### 1.1 Hand-authored room layout
Replace random BSP for floor 1 with a 5-room scripted layout:
1. **Entry grove** — 3 sleeping mushroom-folk, glowing spores
2. **Crossroads** — first pleading monster (1 HP, surrenders on sight)
3. **Choice chamber** — two doors, neither punished, both lead forward
4. **Reflection pool** — quiet room, Oni-Baba's first line of dialogue
5. **Stair room** — first fold transition (locked until karma > 0 OR all monsters spared)

### 1.2 Mercy Scroll UI (new panel in [NewOrigami.Panels.html](NewOrigami.Panels.html))
A persistent right-edge scroll that records:
- Every monster spared (with name + kanji + 1-line haiku)
- Every monster killed (with name + small `χ` mark)
- Current karma totals
Stored in localStorage, persists across floors.

### 1.3 Spare feedback (closes issue #8)
On SPARE: halo VFX on monster, kanji "**慈**" (compassion) fades in for 1.5s,
soft chime via Web Audio, +20 karma popup with calligraphy brush stroke.

### 1.4 Telegraphed monster attacks (closes issue #1)
0.4s wind-up animation (or geometric pulse if no rigged mesh yet) before any
strike. Adds skill-floor; 1-tile sidestep cancels the hit.

### 1.5 Floor 1 audio (pre-rigged delivery from Phase 2.1)
Just the **base loop** layer. Mushroom-themed: low drone, distant water drip.

**Phase 1 acceptance:** a fresh player walks floor 1 without combat tutorial
prompts and *figures out* that sparing makes the next door open. They see
their first Mercy Scroll entry. Oni-Baba speaks once.

---

## Phase 2 — Floor 2: Oni Shrine

**Goal:** prove monsters feel alive.

### 2.1 AudioSystem ([js/v8/audio/AudioSystem.js](js/v8/audio/AudioSystem.js))
Web Audio API, 5 layers, all driven by the MVP orchestrator (Phase 2.3):
- `base.ogg` — always on
- `tension.ogg` — volume = orchestrator.musicTension
- `combat.ogg` — fade in on monster spotted
- `wind.ogg` — corridor proximity
- `water.ogg` — near water tiles
Each file ≤ 200KB. Total budget: 1MB.

### 2.2 Two rigged GLB monsters
- `assets/models/goblin.glb` — Mixamo or Quaternius goblin with idle/walk/attack/flee/bow clips
- `assets/models/oni.glb` — same skeleton with retargeted clips

Drop-in replacement for the geometric pedestals
([Engine8.html:2470](NewOrigami.Engine8.html#L2470)). AnimationMixer is already
wired at [Engine8.html:4139](NewOrigami.Engine8.html#L4139).

### 2.3 MVP Fuzzy Orchestrator ([js/v8/ai/FuzzyOrchestrator.js](js/v8/ai/FuzzyOrchestrator.js))
Not the full doc spec — minimum viable: **5 inputs, 5 outputs, 8 rules,
~150 lines.**

Inputs: `karma, playerHpPct, monsterCount, recentKills, combatIntensity`
Outputs: `spawnPressure, musicTension, oniBabaMood, fogDensity, lootGenerosity`
Rules: 8 hand-picked from the design doc's example set.

Wire outputs to:
- AudioSystem (musicTension → tension layer gain)
- SceneManager (fogDensity → scene fog)
- [OniBaba8.js](js/v8/OniBaba8.js) mood (replaces hardcoded mood math)
- [EntityManager](js/v8/entities/EntityManager.js) spawnPressure
- Loot roll multiplier in [Engine8.html:3154](NewOrigami.Engine8.html#L3154) — **closes dead-code issue #15**

### 2.4 Monster flee that actually flees (closes #13)
When `aiState==='flee'`, A* to the farthest reachable cell. Current code at
[Engine8.html:5331](NewOrigami.Engine8.html#L5331) just freezes them.

### 2.5 Better Hive Mind adaptation (closes #14)
Track:
- Player attack *cadence* (intervals between actions)
- Player approach side (left vs right of monster facing)

After `adaptationLevel > 40`, monsters circle to the player's weak side. ~80
extra lines in [OniBaba8.js](js/v8/OniBaba8.js).

### 2.6 Hit feedback variety (closes #9)
Damage text color/size by event type:
- white = normal hit
- gold = critical
- blue = dodge
- pink = parry

**Phase 2 acceptance:** the player can hear the music tighten when they enter
a fight, see a rigged goblin telegraph an attack, sidestep it, watch the
goblin retreat when wounded, and hear Oni-Baba's mood shift in the audio
mix. The dodge-spam exploit no longer trivially works.

---

## Phase 3 — Floor 3: The Folded Throne

**Goal:** prove the player's choices mattered.

### 3.1 Fold transition between Floor 2 → 3 (closes #23)
A 1.5s shader effect: walls visibly crease along their seams and re-unfold
into the next layout. Three.js custom material with a `foldProgress` uniform.
This is the only floor transition that uses it — that's enough to make the
origami metaphor *feel* real.

### 3.2 Three-phase boss encounter
Reuses existing projectile + room-trigger + AnimationMixer systems.

**Phase 1 — The Approach.** Boss form determined by karma:
- karma < −30 → **Black Dragon** (chaotic, fire projectiles)
- karma > +30 → **White Naga** (graceful, ice projectiles)
- otherwise → **Hybrid** (alternates)

**Phase 2 — The Reading of the Scroll.** Boss pauses combat, the Mercy
Scroll opens, the boss reads back the player's sparings as haiku, line by
line. Each spared monster shifts the next phase's difficulty down 5%; each
kill shifts it up 5%.

**Phase 3 — The Verdict.** Determined by final karma:
- low → fight to the death (existing projectile system, scaled HP)
- high → boss kneels; player chooses to spare or strike (terminal karma swing)

### 3.3 LLMBridge ([js/v8/ai/LLMBridge.js](js/v8/ai/LLMBridge.js))
Single non-blocking `fetch('/api/llm')` with 3s `AbortSignal.timeout`. Falls
back to the existing `ONIBABA_LINES` template bank in
[OniBaba8.js:652](js/v8/OniBaba8.js#L652). Used for:
- Boss Phase 2 transition line (1 generated line)
- Boss Phase 3 verdict (1 generated line)
- Up to 2 ambient Oni-Baba lines during floors 1–2 if the endpoint is reachable

If the endpoint is unreachable, the template bank covers everything. The LLM
is an *enhancement*, never a dependency.

### 3.4 Boss dialogue tree
4 lines per phase × 3 phases × 3 forms = 36 lines hand-written for the
template bank. (LLM substitutes when reachable.)

### 3.5 Thematic loot mapping (closes #25)
Each monster type drops a thematically-linked card:
- goblin → SHURIKEN
- oni → BOULDER
- naga → POISON
- mushroom-folk → SLEEP DUST
Already trivial with current `CardDB` schema.

### 3.6 PiP readback removal (closes #18)
Replace `renderer.readRenderTargetPixels()` at
[Engine8.html:3771](NewOrigami.Engine8.html#L3771) with a direct
WebGLRenderTarget → 2D canvas blit. Removes the 50ms GPU stall.

**Phase 3 acceptance:** the player reaches the throne, hears their sparings
read back, faces a boss whose form reflects their karma, and ends the run
with a verdict that feels earned. The slice closes.

---

## Phase 4 — Polish & Ship

### 4.1 Mobile pass (closes #22)
Pointer-event handlers on the D-pad in
[NewOrigami.Panels.html](NewOrigami.Panels.html). Pinch on PiP for zoom.
One playtest on iPhone Safari and one on Pixel Chrome. Fix only what
*breaks* — full mobile parity is v8.2.

### 4.2 Card hand + cooldowns (closes #3)
- Hand cap: 5 cards
- Per-card cooldown: 1–4 turns based on card power
- Weighted draw from collected deck
- Cooldown ring rendered on the card face

### 4.3 Auto-walk to next decision (closes #2)
Replace the timer-toggle at [Engine8.html:482](NewOrigami.Engine8.html#L482).
New rule: auto-walk continues until junction, monster, loot, or stairs.

### 4.4 Hit-stop scoping (closes #7)
Apply hit-stop only to the attacking entity's AnimationMixer timescale, not
the global frame loop. Camera + input stay live.

### 4.5 Performance audit
Profile in Chrome DevTools. Confirm:
- Main view ≥ 60fps on M1 / mid-tier Android
- No allocations > 1MB / frame
- JS heap stable across a full slice playthrough (no growth > 5MB / 5 min)

### 4.6 Tagged release
`git tag v8.0-slice` after all seven Definition-of-Done items verified.

---

## Sequencing & Rough Effort

| Phase | Calendar weeks | Why this order |
|---|---|---|
| 0 — Foundation | 1.5 | Everything else depends on the modularization and try/catch |
| 1 — Floor 1 | 1.5 | Smallest scope, validates the Mercy Scroll loop before investing in audio/models |
| 2 — Floor 2 | 2.5 | Audio + rigged meshes + MVP orchestrator — the meatiest phase |
| 3 — Floor 3 | 2.5 | Boss + LLM + fold transition — the payoff |
| 4 — Polish | 1.0 | Mobile, cooldowns, perf, tag |
| **Total** | **~9 weeks** | One developer, focused |

Two developers in parallel could compress to ~6 weeks if Phase 0 finishes
first and Phase 2 audio/models work splits cleanly from Phase 2 orchestrator work.

---

## What's Explicitly Deferred to v8.1+

These are good ideas. They are **not** in v8.0:

- Floors 4–7 (content, not engineering — quick once the slice is shipped)
- Full 40-rule Fuzzy Orchestrator (8 rules is enough for the slice)
- Multiple boss forms beyond the 3 karma branches
- Networked co-op
- Procedural special-room library beyond the 5 hand-authored
- Mobile touch parity beyond "doesn't break"
- WebLLM / Ollama local-first LLM (remote endpoint with template fallback is enough)
- Positional audio
- Monster footstep sounds
- Save state versioning / migration

Each is a temptation to scope-creep. The discipline is to ship the slice
first.

---

## The 26 Issues from Review — Where Each is Resolved

| # | Issue | Resolved in |
|---|---|---|
| 1 | No positioning/dodging in combat | Phase 1.4 (telegraphs + sidestep) |
| 2 | Auto-walk cancels in hostile rooms | Phase 4.3 |
| 3 | No card hand / deck / cooldown | Phase 4.2 |
| 4 | Floors have no identity | Phases 1.1, 2 (Shrine), 3 (Throne) |
| 5 | No audio | Phase 2.1 |
| 6 | Monsters are geometric pedestals | Phase 2.2 |
| 7 | Hit-stop pauses global frame | Phase 4.4 |
| 8 | Spare lacks emotional feedback | Phase 1.3 |
| 9 | Damage text has no variety | Phase 2.6 |
| 10 | Fuzzy Orchestrator is vaporware | Phase 2.3 |
| 11 | LLMBridge is vaporware | Phase 3.3 |
| 12 | Boss is a ghost | Phase 3.2 |
| 13 | Flee state doesn't move monsters | Phase 2.4 |
| 14 | Hive Mind is shallow | Phase 2.5 |
| 15 | `lootGenerosity` is dead code | Phase 2.3 (wire-up) |
| 16 | 6,053-line monolith | Phase 0.1 |
| 17 | Memory leak in spell/boulder arrays | Phase 0.4 |
| 18 | GPU stall in PiP readback | Phase 3.6 |
| 19 | Collision phase-through bug | Phase 0.5 |
| 20 | No error handling | Phase 0.2 |
| 21 | No save/load | Phase 0.3 |
| 22 | Mobile untested | Phase 4.1 |
| 23 | Origami is cosmetic | Phase 3.1 (fold transition) |
| 24 | Sparing has no emotional payoff | Phases 1.2 (Scroll) + 3.2 (boss reading) |
| 25 | Loot disconnected from monsters | Phase 3.5 |
| 26 | Boss has no dialogue | Phase 3.4 |

---

## Closing — The Emotional Test

Every task in this battleplan passes the [NEWORIGAMI_V8_DESIGN.md](NEWORIGAMI_V8_DESIGN.md)
non-negotiable:

> *"Does this make the world feel more alive for a kid playing with their parent?"*

If a task doesn't survive that test, it doesn't ship in v8.0.

The slice is the game. The game is the slice. Ship it.

---

*Battleplan v1 — 2026-05-13*
*Owner: Mark Postlethwaite*
*Next step: Phase 0.1 — start extracting [NewOrigami.Engine8.html](NewOrigami.Engine8.html) into `js/v8/` modules.*
