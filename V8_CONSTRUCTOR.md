# NewOrigami v8 — Master AI Constructor
*Operating manual for autonomous, validated, phase-gated execution of [V8_BATTLEPLAN.md](V8_BATTLEPLAN.md)*
*Version 1.0 — 2026-05-13*

> **Purpose:** Any AI agent (Claude Code, future session, sub-agent) reading this document can execute the v8.0 slice end-to-end with no human in the loop, while validating at every step and surfacing blockers immediately.

---

## How to use this document

1. **Read** [V8_STATUS.md](V8_STATUS.md) to find the next pending task.
2. **Find** that task ID below (T0.1 … T4.6).
3. **Follow** the Operating Protocol verbatim.
4. **Update** [V8_STATUS.md](V8_STATUS.md) when done.
5. **Loop.**

Do not skip steps. Do not batch tasks. Do not "while I'm here, also fix…"
The doctrine is one task → one validation → one commit.

---

## 0. The Operating Protocol

Every task goes through these **8 steps**. No exceptions.

```
┌──────────────────────────────────────────────────────────────┐
│  1. SELECT       Read V8_STATUS.md → first pending task with │
│                  all deps satisfied                          │
│  2. PLAN         TodoWrite the task's validation checklist   │
│  3. CHECKPOINT   git tag pre-<TASK_ID>                       │
│  4. BRIEF        Read the task spec below in full            │
│  5. EXECUTE      Do the work — directly OR via subagent      │
│  6. VALIDATE     Run every gate — ALL must pass              │
│  7. COMMIT       git commit with the prescribed message      │
│  8. RECORD       Update V8_STATUS.md, mark TodoWrite done    │
└──────────────────────────────────────────────────────────────┘
```

### When validation fails

```
┌──────────────────────────────────────────────────────────────┐
│  IF the failure is small + understood:                       │
│    fix-forward → re-run validation → commit                  │
│  IF the failure is large OR unclear:                         │
│    git reset --hard pre-<TASK_ID>                            │
│    record the failure mode in V8_STATUS.md "Blockers"        │
│    STOP and request human review                             │
└──────────────────────────────────────────────────────────────┘
```

### When a task reveals a missing dependency

Do **not** silently inline the fix. Add a new task (`T0.6`, `T1.6`, etc.)
to this doc and to [V8_STATUS.md](V8_STATUS.md), mark it as a prereq for the
current task, and execute it first.

### When the smoke test breaks mid-task

`git reset --hard pre-<TASK_ID>`. No exceptions. The smoke test passing is
the single floor on which everything else stands.

---

## 1. Validation Gates — Definitions

All tasks validate against a subset of these. Each has a precise runner.

| Gate | What it checks | How to run |
|---|---|---|
| **G-STATIC** | File-level invariants (line count, file exists, grep absence/presence) | `wc -l`, `ls`, `grep` |
| **G-SMOKE** | Game loads in browser without console errors | `npm run smoke` (script below) |
| **G-PLAY-N** | A named manual playtest scenario (N = scenario id) | Documented in §4 |
| **G-PERF** | Main 3D view ≥ 60fps on dev machine | DevTools Performance tab, 10s capture |
| **G-NOERR** | No new uncaught throws in the 60s smoke session | DevTools Console |
| **G-HEAP** | JS heap growth < 5MB over 5min idle | DevTools Memory tab |
| **G-MODULE** | New module imports resolve, no circular deps | `npm run lint:imports` (script below) |
| **G-AUDIO** | Listed audio file plays back via `new Audio().play()` test | `npm run smoke:audio` |
| **G-VISUAL** | Screenshot diff < 5% from reference (where reference exists) | `npm run smoke:visual` |
| **G-SAVE** | localStorage write/read round-trip preserves state | `npm run smoke:save` |

### Smoke test runner

Add to [package.json](package.json) once, before T0.1 begins:

```json
"scripts": {
  "smoke":         "node scripts/smoke.js",
  "smoke:audio":   "node scripts/smoke-audio.js",
  "smoke:visual":  "node scripts/smoke-visual.js",
  "smoke:save":    "node scripts/smoke-save.js",
  "lint:imports":  "node scripts/lint-imports.js"
}
```

The scripts launch headless Chromium (Playwright is already available in
node_modules), load [NewOrigami.8.html](NewOrigami.8.html), wait for
`ENGINE8_READY`, then run the gate-specific assertion. See **§5 Validation
Harness** for implementation specs.

---

## 2. Subagent Briefing Template

When EXECUTE delegates to a subagent (Phase 0 module extractions, large
refactors), use this template verbatim. Fill `{{...}}` placeholders.

```
You are working in /Users/mark/Documents/ORIGAMI/NEW.ORIGAMI on the v8.0
vertical-slice constructor. Read these documents first, in order:
  1. V8_BATTLEPLAN.md (vision)
  2. V8_CONSTRUCTOR.md (operating manual — find task {{TASK_ID}})
  3. V8_STATUS.md (current state)

Your scope is **strictly** task {{TASK_ID}}: {{TASK_TITLE}}.

Do NOT:
  - Touch files outside the task spec
  - "Improve" code you incidentally read
  - Add new features beyond the spec
  - Skip validation

You MUST:
  - Run every validation gate listed in the task spec
  - Report which gates passed and which failed with output
  - If a gate fails, attempt one fix-forward, then stop and report
  - Commit with the prescribed message format if all gates pass
  - Return a one-paragraph result summary plus the commit SHA

Hard constraint: the smoke test (G-SMOKE) must pass at the end. If you
cannot make it pass, do NOT commit — report the failure and stop.
```

---

## 3. Task Catalog

### Conventions

- **ID** — `T<phase>.<subphase>`
- **Deps** — list of task IDs that must be complete first
- **Touch** — files this task is allowed to modify (whitelist)
- **Gates** — validation gates that must pass
- **Commit** — exact message format
- **Effort** — rough hours for a focused session

---

### T0.0 — Validation Harness Bootstrap
**Phase:** 0 Foundation · **Deps:** none · **Effort:** 3h

**Goal:** Make every gate runnable from `npm run`.

**Touch:**
- [package.json](package.json) (add scripts)
- `scripts/smoke.js` (new)
- `scripts/smoke-audio.js` (new)
- `scripts/smoke-visual.js` (new)
- `scripts/smoke-save.js` (new)
- `scripts/lint-imports.js` (new)

**Spec:**
1. Install Playwright if not present (`npm i -D playwright`).
2. `smoke.js` launches Chromium headless, opens `file://.../NewOrigami.8.html`, waits for `window.postMessage` type `ENGINE8_READY`, listens for console errors for 30s, exits 0 if no errors, 1 otherwise.
3. `lint-imports.js` walks `js/v8/`, builds an import graph from ES module statements, fails if a cycle is found.
4. The other scripts can be stubs that exit 0 — they're filled in as later tasks need them.

**Gates:**
- [ ] G-STATIC: `package.json` has all 5 scripts
- [ ] G-SMOKE: `npm run smoke` exits 0 against current (pre-refactor) game
- [ ] G-MODULE: `npm run lint:imports` exits 0 (no v8 modules yet → trivially passes)

**Commit:** `chore(v8): bootstrap validation harness for constructor protocol`

---

### T0.1 — Engine8.html Module Extraction
**Phase:** 0 Foundation · **Deps:** T0.0 · **Effort:** 8h

**Goal:** Reduce [NewOrigami.Engine8.html](NewOrigami.Engine8.html) from 6,053 lines to < 600 by extracting concerns into `js/v8/` modules.

**Touch:**
- [NewOrigami.Engine8.html](NewOrigami.Engine8.html) (shrink)
- `js/v8/core/Renderer.js` (new, ~400 lines)
- `js/v8/core/PlayerController.js` (new, ~500 lines)
- `js/v8/core/Clock.js` (new, ~80 lines)
- `js/v8/map/MapGen.js` (new, ~800 lines)
- `js/v8/map/MapRenderer3D.js` (new, ~300 lines)
- `js/v8/map/PiPCamera.js` (new, ~500 lines)
- `js/v8/entities/EntityManager.js` (new, ~700 lines)
- `js/v8/entities/PathFinder.js` (new, ~200 lines)
- `js/v8/combat/ProjectileSystem.js` (new, ~400 lines)
- `js/v8/combat/MeleeSystem.js` (new, ~250 lines)
- `js/v8/combat/CardExecutor.js` (new, ~300 lines)

**Spec:**
1. Each module is an ES module exporting one default class or factory.
2. The HTML file becomes `<script type="module">` that imports + wires.
3. Shared state (camera, scene, px/pz/rot) lives in a single `GameState` object passed by reference — NOT globals.
4. Behavior is **identical** to pre-refactor. This task moves code, it does not change it.
5. Use **subagent** for the extraction work. Briefing template §2.

**Gates:**
- [ ] G-STATIC: `wc -l NewOrigami.Engine8.html` < 600
- [ ] G-STATIC: all 11 new files exist
- [ ] G-MODULE: `npm run lint:imports` passes
- [ ] G-SMOKE: passes
- [ ] G-PLAY-1 (walk-around): player can walk forward, turn, enter a room, look at a monster (no combat) — manual or scripted
- [ ] G-PERF: ≥ 60fps after 30s
- [ ] G-HEAP: stable across 5min walking

**Commit:** `refactor(v8): extract Engine8.html into js/v8/ modules`

**Rollback:** `git reset --hard pre-T0.1` if any gate fails.

---

### T0.2 — RAF tick try/catch
**Phase:** 0 · **Deps:** T0.1 · **Effort:** 1h

**Goal:** No uncaught throw in the game loop crashes the session.

**Touch:**
- `js/v8/core/Clock.js`
- `js/v8/core/Renderer.js`

**Spec:** Wrap the per-frame body in `try/catch`. On catch: `console.error`, increment a counter, render a single-line overlay `"v8 error — see console (N caught)"` for 3s, then keep running.

**Gates:**
- [ ] G-STATIC: `grep -c "try {" js/v8/core/Clock.js` ≥ 1
- [ ] G-SMOKE: passes
- [ ] G-PLAY-2 (forced throw): inject `throw new Error('test')` in a monster update, confirm game continues + overlay shows + console logs it

**Commit:** `feat(v8): guard RAF tick with error recovery overlay`

---

### T0.3 — Save/Load
**Phase:** 0 · **Deps:** T0.1 · **Effort:** 3h

**Goal:** Game state persists across reload.

**Touch:**
- `js/v8/core/SaveSystem.js` (new)
- `js/v8/core/PlayerController.js` (wire load)
- `js/v8/map/MapGen.js` (accept seed)

**Spec:**
- Schema (v1): `{ schemaVersion: 1, floor, px, pz, rot, hp, karma, deck, mapSeed, monstersAlive: number[], savedAt }`
- Write on: stair-descent, every 30s, before unload
- Read on: `ENGINE8_READY`
- Slot key: `origami.v8.save.slot0`

**Gates:**
- [ ] G-STATIC: `SaveSystem.js` exports `save()`, `load()`, `clear()`
- [ ] G-SAVE: round-trip preserves all 9 fields
- [ ] G-PLAY-3 (persistence): walk to a known position, reload, end up in the same position with same HP/karma
- [ ] G-SMOKE: passes

**Commit:** `feat(v8): localStorage save/load between floors`

---

### T0.4 — Spell/Boulder Disposal
**Phase:** 0 · **Deps:** T0.1 · **Effort:** 1h

**Goal:** Plug the long-session memory leak.

**Touch:**
- `js/v8/combat/ProjectileSystem.js`

**Spec:** On impact or out-of-bounds, call `scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose();` and splice from the active array.

**Gates:**
- [ ] G-STATIC: `grep "geometry.dispose" js/v8/combat/ProjectileSystem.js` matches
- [ ] G-HEAP: fire 100 projectiles, idle 30s — heap growth < 2MB

**Commit:** `fix(v8): dispose projectile meshes on impact`

---

### T0.5 — Collision Substepping
**Phase:** 0 · **Deps:** T0.1 · **Effort:** 2h

**Goal:** No phase-through walls at high frame deltas.

**Touch:**
- `js/v8/core/PlayerController.js`

**Spec:** Split each movement vector into N substeps of length ≤ 0.3 × GRID, `canWalk()` checks at each substep, halt on the last walkable substep.

**Gates:**
- [ ] G-STATIC: `grep -E "substep|N steps" js/v8/core/PlayerController.js` matches
- [ ] G-PLAY-4 (high-delta): force `delta = 0.1s` (5× normal), walk into a wall — confirm player stops, doesn't pass through
- [ ] G-SMOKE: passes

**Commit:** `fix(v8): substep collision to prevent phase-through at high delta`

---

### T0.6 — Monster Smart-Chase Pathfinding
**Phase:** 0 Foundation · **Deps:** T0.0 · **Effort:** 2h
**Inserted:** 2026-05-13 — pre-extraction polish, user-reported playtest issue

**Goal:** Hostile monsters chase the player around walls, not into them.

**Touch:** [NewOrigami.Engine8.html](NewOrigami.Engine8.html) (hostile-state region near line 4338, plus a new `_monAStar` helper near line 4209).

**Spec:**
- Implement grid-based A* (4-directional, Manhattan heuristic, node-budget cap 200).
- Cache per-monster path in `ud.aiPath` + `ud.aiPathIdx` + `ud.aiPathStamp`.
- Recompute when: no path, path > 0.6s old, player tile changed by ≥2 cells, or current step is blocked.
- Per-frame: take next path tile as immediate target, move toward its center; on arrival, advance index.
- Wall-slide fallback for the first frame before A* yields a path: try axis-only movement.

**Gates:**
- [ ] G-STATIC: `grep "_monAStar" js/v8/` matches (or in Engine8.html pre-extraction) ≥ 1
- [ ] G-SMOKE: passes (no uncaught exceptions during 30s observation)
- [ ] G-PLAY-33 (chase-around-corner): position monster around a corner from the player, alert it → monster reaches the player without getting stuck
- [ ] G-PERF: ≥ 60fps with 10+ hostile monsters chasing

**Commit:** `fix(v8): monsters chase the player with A* pathfinding`

---

### T0.7 — Keyboard Card Cycling + Class Separator
**Phase:** 0 Foundation · **Deps:** T0.0 · **Effort:** 3h
**Inserted:** 2026-05-13 — pre-extraction polish, user-reported UX gap

**Goal:** Cards are fully keyboard-navigable. Two classes (SPELLS default, COMBAT = melee + ranged with a separator bar). Scrollbar reveals only on keyboard mode or hover.

**Touch:** [NewOrigami.Panels.html](NewOrigami.Panels.html) — keyboard handlers, card rendering, CSS for highlight + scrollbar reveal.

**Spec:**
- New global state: `window._kbdCard = { active, classId, cardIdx }`.
- **Space** (or ATTACK sidebar button): if inactive → enter mode + highlight first card in current class. If active → cycle class (`SPELLS ↔ COMBAT`).
- **ArrowLeft/ArrowRight** (or Tab/Shift-Tab): cycle highlighted card within class.
- **Enter**: fire highlighted card via `emitAction(cardName)`; selection persists.
- **Escape**: exit keyboard mode.
- **COMBAT class layout:** render melee cards, then `<div class="combat-separator"></div>`, then ranged cards. Both groups treated as one cycling sequence.
- **Scrollbar visibility:** `.card-deck-row::-webkit-scrollbar { display: none }` by default. Reveal under `body.kbd-card-active .card-deck-row::-webkit-scrollbar` and `.card-deck-row:hover::-webkit-scrollbar`.
- Highlight: `.kbd-highlighted` class with cyan outline + slight scale-up.

**Gates:**
- [ ] G-STATIC: `grep -E "kbd-highlighted|combat-separator|_kbdCard" NewOrigami.Panels.html` ≥ 3 matches
- [ ] G-SMOKE: passes
- [ ] G-PLAY-34 (keyboard fire): press Space, see highlight; press Enter, card fires; highlight persists
- [ ] G-PLAY-35 (class cycle): press Space again, class flips to COMBAT, separator bar visible between melee + ranged
- [ ] G-PLAY-36 (scrollbar hidden): no keyboard mode, no hover → scrollbar invisible

**Commit:** `feat(v8): keyboard card cycling, COMBAT separator, lazy scrollbar`

---

### T0.8 — Event Log Visibility Rules
**Phase:** 0 Foundation · **Deps:** T0.0 · **Effort:** 1.5h
**Inserted:** 2026-05-13 — pre-extraction polish, user-reported UX rule

**Goal:** Event log shows on every event for 3 seconds, then fades. While any sidebar is open, the log stays visible regardless.

**Touch:** [NewOrigami.Panels.html](NewOrigami.Panels.html) — `logEvent()` timer, sidebar-state tracker.

**Spec:**
- New module-level state: `_evtLogFadeTimer`, `_sidebarsOpen` (Set of sidebar IDs currently open).
- `logEvent(text, type)`:
  - Adds log entry, sets `#event-log-container.active`.
  - Clears any existing fade timer.
  - Schedules `_evtLogFadeTimer = setTimeout(() => maybeFade(), 3000)`.
- `maybeFade()`: if `_sidebarsOpen.size === 0`, remove `.active`. Otherwise no-op (stays visible).
- Sidebar open/close hooks: call `_sidebarOpen(id)` / `_sidebarClose(id)` from existing toggle functions. `_sidebarOpen` clears the fade timer. `_sidebarClose` re-runs the fade-after-3s logic if no sidebars remain.
- "Sidebar" = inventory modal, settings modal, encounter zone, exit modal (anything currently using `.active` or `display:block` to indicate an open panel).

**Gates:**
- [ ] G-STATIC: `grep -E "_evtLogFadeTimer|_sidebarsOpen|maybeFade" NewOrigami.Panels.html` ≥ 3 matches
- [ ] G-SMOKE: passes
- [ ] G-PLAY-37 (3s fade): trigger an event, wait 3s with no sidebar open → log fades
- [ ] G-PLAY-38 (sidebar holds): open inventory, trigger an event, wait 5s → log stays visible
- [ ] G-PLAY-39 (close releases): close inventory after event → log fades 3s later

**Commit:** `feat(v8): event log fades after 3s, persists while sidebar open`

---

### T0.9 — PIP Cinematic Independence + Auto-Zoom
**Phase:** 0 Foundation · **Deps:** T0.0 · **Effort:** 4h
**Inserted:** 2026-05-13 — user playtest: PIP controls still bleed into main canvas

**Goal:**
- PIP buttons (zoom, rotate, pan, perspective) affect ONLY the PIP view; main canvas remains untouched.
- PIP-side state persists across the session.
- When the player avatar is occluded behind a wall, the PIP swings cinematically to find an unblocked angle.
- When a monster is in an adjacent tile, PIP auto-zooms so both tiles are fully framed.

**Touch:** [NewOrigami.Engine8.html](NewOrigami.Engine8.html) — PIP camera section (line 3680+), `PIP_*` postMessage handlers (line 95 region in launcher already routes them).

**Spec:**
- PIP camera state is its own object (`pipCam = { x, y, z, fov, persistKey }`); main camera (`camera`) is never mutated by PIP messages.
- Add `pipCinematic.swingForOcclusion()` — raycast camera→player; if blocked, orbit the PIP camera around the player by 30° increments until unblocked.
- Add `pipCinematic.autoZoom()` — every 0.5s, find nearest hostile monster; if within 2 tiles, set PIP fov/distance so both player + monster tiles are framed with ~10% margin.
- Persist PIP state in localStorage key `origami.v8.pip` (read on engine ready).

**Gates:**
- [ ] G-STATIC: `grep "pipCam" NewOrigami.Engine8.html` ≥ 5 matches; no `PIP_ZOOM` handler mutates `camera.*` outside `pipCam`
- [ ] G-SMOKE: passes
- [ ] G-PLAY-40 (isolation): press PIP zoom button → only PIP changes
- [ ] G-PLAY-41 (occlusion swing): position player behind a corner → PIP camera swings to clear angle
- [ ] G-PLAY-42 (auto-zoom): monster moves into adjacent tile → PIP zooms to frame both

**Commit:** `feat(v8): PIP cinematic camera — isolated from main, auto-zoom + occlusion swing`

---

### T0.10 — Monster Death Sequence
**Phase:** 0 Foundation · **Deps:** T0.0 · **Effort:** 2h
**Inserted:** 2026-05-13 — user playtest: death feels abrupt

**Goal:** Monster death plays bow → fall → sink-fade through the floor.

**Touch:** [NewOrigami.Engine8.html](NewOrigami.Engine8.html) — death handling (currently in `_handleMonsterHit` / `MONSTER_DEATH` region near line 5341).

**Spec:**
- New 3-phase death state machine on `ud.deathPhase`:
  1. `bow` (0.8s) — play bow animation clip, no movement, no AI.
  2. `fall` (0.6s) — root forward fall (lerp rotation.x → −π/2), translation Y stays.
  3. `sink` (1.4s) — translate Y from 0 → −1.5, opacity 1 → 0 via material.transparent + opacity.
- Total ~2.8s. After `sink` complete, dispose mesh.
- During death, AI loop early-returns on `ud.isDead`. Already the case — just route to new phases.

**Gates:**
- [ ] G-STATIC: `grep "deathPhase" NewOrigami.Engine8.html` ≥ 4 matches
- [ ] G-SMOKE: passes
- [ ] G-PLAY-43 (death sequence): kill a monster → see bow, then fall, then sink-fade
- [ ] G-PERF: 5 simultaneous deaths → ≥ 60fps

**Commit:** `feat(v8): monster death plays bow → fall → sink-fade`

---

### T0.11 — Hostile Monster Indicator (Red Circle)
**Phase:** 0 Foundation · **Deps:** T0.0 · **Effort:** 1h
**Inserted:** 2026-05-13 — user playtest: no visual cue for hostile state

**Goal:** Monster base disc turns red when hostile. Room-wide: any monster attack alerts all monsters in the room, all turn red.

**Touch:** [NewOrigami.Engine8.html](NewOrigami.Engine8.html) — `_alertRoom` (line 4090) and base disc material assignment.

**Spec:**
- Cache `_DISC_MAT_NEUTRAL` and `_DISC_MAT_HOSTILE` (red emissive). Both reused across all monsters — no per-monster material allocation.
- On `aiState` transition to `'hostile'`: swap base disc material to hostile.
- On transition back to `'idle'` (rare; tamed): swap to neutral.
- `_alertRoom` already iterates all monsters in the room — just call the material swap inside that loop.

**Gates:**
- [ ] G-STATIC: `grep "DISC_MAT_HOSTILE" NewOrigami.Engine8.html` ≥ 3 matches
- [ ] G-SMOKE: passes
- [ ] G-PLAY-44 (hostile color): hit one monster in a room of 3 → all 3 disc circles turn red within 1 frame

**Commit:** `feat(v8): monster base disc turns red when hostile (room-wide alert)`

---

### T0.12 — FPS Regression Investigation
**Phase:** 0 Foundation · **Deps:** T0.0 · **Effort:** 2h
**Inserted:** 2026-05-13 — user playtest: 120 → 40 fps regression

**Goal:** Identify the cost source and bring main view ≥ 60fps. Root-cause, not symptom-patch.

**Touch:** [NewOrigami.Engine8.html](NewOrigami.Engine8.html) — wherever the hot path is.

**Spec:**
- Add `scripts/probe-fps.js` (Playwright harness) that reads `#hud-rt` after a 5s warmup and reports realtime + projected fps + budget %.
- If realtime < 80 fps on the smoke test machine, drill into the engine: profile via Chrome DevTools Performance tab. Most likely suspects: PIP readback GPU stall, monster animation mixers, per-frame allocations.
- Once root cause identified, document in V8_STATUS.md Decision Log, fix, re-probe.

**Gates:**
- [ ] G-STATIC: `scripts/probe-fps.js` exists, exits 0 when realtime ≥ 80 fps
- [ ] G-PERF: realtime ≥ 80 fps after 5s warmup in smoke harness
- [ ] G-SMOKE: still passes
- [ ] Root cause documented in Decision Log

**Commit:** `perf(v8): fix FPS regression (root cause documented in V8_STATUS)`

---

### T1.1 — Floor 1 Hand-Authored Layout
**Phase:** 1 Mushroom Garden · **Deps:** T0.1, T0.3 · **Effort:** 4h

**Goal:** Floor 1 is a scripted 5-room layout, not BSP-random.

**Touch:**
- `js/v8/map/MapGen.js`
- `js/v8/map/floors/floor1.js` (new — room declaration data)

**Spec:** Declarative format:
```js
export default {
  name: 'Mushroom Garden',
  rooms: [
    { id:'entry',       at:[0,0],   size:[8,8],  props:['spore_glow','sleeping_mushroom_x3'] },
    { id:'crossroads',  at:[12,0],  size:[6,6],  spawn:[{type:'pleader', hp:1}] },
    // ...
  ],
  corridors: [['entry','crossroads'], ...],
  stairs:    { at:'reflection_pool.exit', requires:'karma>=0 OR allSpared' },
};
```
MapGen checks `floor === 1` → loads `floor1.js` → builds rooms. Other floors keep BSP.

**Gates:**
- [ ] G-STATIC: `floor1.js` exists, has exactly 5 rooms
- [ ] G-PLAY-5 (tour): from spawn, walk through all 5 rooms in order, reach stair room
- [ ] G-SMOKE: passes

**Commit:** `feat(v8/f1): hand-author Mushroom Garden layout (5 rooms)`

---

### T1.2 — Mercy Scroll UI
**Phase:** 1 · **Deps:** T0.3 · **Effort:** 4h

**Goal:** A persistent right-edge scroll panel that records mercy/cruelty events.

**Touch:**
- [NewOrigami.Panels.html](NewOrigami.Panels.html) (add scroll panel)
- `js/v8/ui/MercyScroll.js` (new)

**Spec:**
- Records `{ floor, monsterType, kanji, haiku, action: 'spared'|'killed', timestamp }`
- Persists in localStorage key `origami.v8.scroll`
- UI: vertical washi-paper texture on right edge, brush-stroke entries, scrollable
- Loads on `ENGINE8_READY`, appends on `SPARE` / monster death events from [js/v8/OniBaba8.js](js/v8/OniBaba8.js)

**Gates:**
- [ ] G-STATIC: localStorage key written after a SPARE
- [ ] G-PLAY-6 (mercy entry): spare one monster → scroll shows the entry with kanji + haiku
- [ ] G-PLAY-7 (persistence): reload — scroll entries still present

**Commit:** `feat(v8/f1): Mercy Scroll panel + localStorage persistence`

---

### T1.3 — Spare Feedback VFX
**Phase:** 1 · **Deps:** T0.1 · **Effort:** 2h

**Goal:** SPARE feels emotional, not numerical.

**Touch:**
- `js/v8/combat/MeleeSystem.js` (intercept SPARE)
- `js/v8/vfx/SpareHalo.js` (new)
- [NewOrigami.Panels.html](NewOrigami.Panels.html) (karma popup)
- `assets/audio/spare_chime.ogg` (new — placeholder OK)

**Spec:**
- On SPARE: spawn a 1.5s halo billboard on the monster
- Render kanji "**慈**" (compassion) with brush-stroke shader, fades in then out
- Play `spare_chime.ogg` via [AudioSystem](js/v8/audio/AudioSystem.js) (or a temporary `new Audio()` if T2.1 not done yet)
- Karma popup with calligraphy stroke animation in HUD

**Gates:**
- [ ] G-STATIC: halo asset exists, chime asset exists
- [ ] G-PLAY-8 (spare beat): spare a monster → see halo + kanji + hear chime + see karma popup
- [ ] G-AUDIO: chime plays back

**Commit:** `feat(v8/f1): SPARE halo + kanji + chime + karma popup`

---

### T1.4 — Attack Telegraphs + Sidestep
**Phase:** 1 · **Deps:** T0.1 · **Effort:** 3h

**Goal:** Combat has skill, not just attack/retaliate ping-pong.

**Touch:**
- `js/v8/entities/EntityManager.js` (telegraph state)
- `js/v8/core/PlayerController.js` (sidestep input)
- `js/v8/combat/MeleeSystem.js` (cancel-on-sidestep)

**Spec:**
- Every monster attack has a 0.4s wind-up phase before the hit lands
- During wind-up, a directional indicator (or geometric pulse if no rigged mesh yet) telegraphs the strike
- Player presses Q/E within those 400ms → 1-tile sidestep → attack misses
- Sidestep has a 1s cooldown to prevent spam

**Gates:**
- [ ] G-PLAY-9 (telegraph): walk up to a goblin, take a hit — confirm 0.4s wind-up was visible
- [ ] G-PLAY-10 (sidestep): trigger an attack, press Q within window, confirm zero damage taken
- [ ] G-SMOKE: passes

**Commit:** `feat(v8/f1): 0.4s telegraphs + sidestep dodge`

---

### T1.5 — Floor 1 Base Audio Layer
**Phase:** 1 · **Deps:** T2.1 OR fallback to `new Audio()` · **Effort:** 1h

**Goal:** Floor 1 is not silent.

**Touch:**
- `js/v8/audio/AudioSystem.js` (or temp inline in MapGen)
- `assets/audio/floor1_base.ogg` (≤ 200KB, looping)

**Spec:** Start `floor1_base.ogg` on floor entry, fade in over 2s, loop.

**Gates:**
- [ ] G-AUDIO: the file plays
- [ ] G-PLAY-11 (audible): enter floor 1 → hear the loop within 2s

**Commit:** `feat(v8/f1): mushroom-garden ambient audio loop`

---

### T2.1 — AudioSystem
**Phase:** 2 Oni Shrine · **Deps:** T0.1 · **Effort:** 4h

**Goal:** A real layered audio engine driven by the orchestrator.

**Touch:**
- `js/v8/audio/AudioSystem.js` (new)
- `assets/audio/{base,tension,combat,wind,water}.ogg` (new placeholders OK)

**Spec:**
- Web Audio API
- 5 named layers, each with its own GainNode
- `setLayerGain(name, value, fadeMs)` smoothly ramps gain
- `tick()` consumes orchestrator outputs (musicTension → tension layer)
- Each file ≤ 200KB

**Gates:**
- [ ] G-STATIC: all 5 audio files exist, each ≤ 200KB
- [ ] G-AUDIO: each layer plays in isolation
- [ ] G-PLAY-12 (mix shift): force orchestrator.musicTension to 1.0 → confirm tension layer audible

**Commit:** `feat(v8): layered Web Audio system with 5 layers`

---

### T2.2 — Rigged GLB Monsters
**Phase:** 2 · **Deps:** T0.1 · **Effort:** 5h

**Goal:** Monsters are animated meshes, not geometric pedestals.

**Touch:**
- `assets/models/goblin.glb` (new, from Mixamo/Quaternius)
- `assets/models/oni.glb` (new)
- `js/v8/entities/EntityManager.js` (replace pedestal geometry with GLTFLoader)

**Spec:**
- Use existing `THREE.GLTFLoader` (already vendored)
- Each model has clips: `idle`, `walk`, `attack`, `flee`, `bow`
- AnimationMixer wiring already exists — just replace the source mesh
- Preload at engine init to avoid mid-game stalls

**Gates:**
- [ ] G-STATIC: both GLB files exist, total ≤ 4MB
- [ ] G-PLAY-13 (animate): a goblin walks (not slides), telegraphs an attack with the attack clip, bows when idle near another goblin
- [ ] G-SMOKE: passes
- [ ] G-PERF: ≥ 60fps with 4 rigged goblins on screen

**Commit:** `feat(v8): rigged goblin + oni meshes with AnimationMixer clips`

---

### T2.3 — MVP Fuzzy Orchestrator
**Phase:** 2 · **Deps:** T0.1, T2.1 · **Effort:** 4h

**Goal:** Replace OniBaba8.js's hardcoded mood math with a real fuzzy inference engine — minimum viable.

**Touch:**
- `js/v8/ai/FuzzyOrchestrator.js` (new, ~150 lines)
- [js/v8/OniBaba8.js](js/v8/OniBaba8.js) (consume orchestrator outputs)
- `js/v8/audio/AudioSystem.js` (subscribe to musicTension)
- `js/v8/core/Renderer.js` (subscribe to fogDensity)
- `js/v8/map/MapGen.js` (subscribe to lootGenerosity)

**Spec:**
- 5 inputs: `karma, playerHpPct, monsterCount, recentKills, combatIntensity`
- 5 outputs: `spawnPressure, musicTension, oniBabaMood, fogDensity, lootGenerosity`
- 8 rules, Mamdani inference, centroid defuzz
- `tick(dt)` at 60Hz

**Gates:**
- [ ] G-STATIC: `FuzzyOrchestrator.js` < 200 lines, exports a class
- [ ] G-STATIC: `grep "lootGenerosity" js/v8/map/MapGen.js` matches (closes the dead-code issue)
- [ ] G-PLAY-14 (mood shift): drop karma to −60 → fog visibly thickens within 5s, tension layer rises
- [ ] G-PLAY-15 (mercy effect): bring karma to +50, kill nothing → loot drops feel more generous (manual)

**Commit:** `feat(v8): MVP Fuzzy Orchestrator (5 in / 5 out / 8 rules)`

---

### T2.4 — Real Flee Behavior
**Phase:** 2 · **Deps:** T0.1, T2.2 · **Effort:** 2h

**Goal:** Wounded monsters retreat, not freeze.

**Touch:**
- `js/v8/entities/EntityManager.js`
- `js/v8/entities/PathFinder.js`

**Spec:** When `aiState==='flee'`, A* to the farthest reachable cell in the monster's current room. Play `flee` animation clip.

**Gates:**
- [ ] G-PLAY-16 (retreat): wound a goblin to 25% HP → confirm it moves AWAY from player
- [ ] G-SMOKE: passes

**Commit:** `fix(v8): flee state actually pathfinds away from player`

---

### T2.5 — Hive Mind Cadence + Approach Side
**Phase:** 2 · **Deps:** T2.4 · **Effort:** 3h

**Goal:** Monsters adapt meaningfully, not just "dodge after 3 same cards".

**Touch:**
- [js/v8/OniBaba8.js](js/v8/OniBaba8.js)
- `js/v8/entities/EntityManager.js`

**Spec:**
- Track `attackCadence` = rolling mean of intervals between player actions
- Track `approachSide` = dominant side (L/R) the player attacks from
- After `adaptationLevel > 40`, monsters circle to player's weak side via pathfinding offset

**Gates:**
- [ ] G-PLAY-17 (adaptation): always attack from the left for 5 fights → confirm monsters in fight 6 try to circle right
- [ ] G-SMOKE: passes

**Commit:** `feat(v8): Hive Mind adapts to player cadence + approach side`

---

### T2.6 — Damage Text Variety
**Phase:** 2 · **Deps:** T0.1 · **Effort:** 1h

**Goal:** Hit feedback is read at a glance.

**Touch:**
- `js/v8/vfx/DamageText.js` (new or extracted)

**Spec:** Color/size by event:
- white normal · gold critical · blue dodge · pink parry

**Gates:**
- [ ] G-PLAY-18 (variety): trigger one of each event → all four colors visible

**Commit:** `feat(v8): damage text color-codes hit/crit/dodge/parry`

---

### T3.1 — Fold Transition Shader
**Phase:** 3 Folded Throne · **Deps:** T0.1 · **Effort:** 4h

**Goal:** The "origami" theme is literal, exactly once.

**Touch:**
- `js/v8/vfx/FoldTransition.js` (new)
- Custom THREE.ShaderMaterial with `foldProgress` uniform
- `js/v8/map/MapGen.js` (trigger on floor 2 → 3 stair descent)

**Spec:** 1.5s animation: walls fold along their seams (vertex shader) and unfold into the next floor's geometry. Plays only floor 2 → 3.

**Gates:**
- [ ] G-PLAY-19 (fold): descend from floor 2 → 3 → confirm fold animation plays
- [ ] G-PERF: animation runs ≥ 60fps
- [ ] G-SMOKE: passes

**Commit:** `feat(v8/f3): origami fold transition between floors 2 and 3`

---

### T3.2 — Three-Phase Boss Encounter
**Phase:** 3 · **Deps:** T2.2, T2.3, T3.1 · **Effort:** 8h

**Goal:** The climax is real.

**Touch:**
- `js/v8/combat/BossEncounter.js` (new)
- `assets/models/dragon.glb` + `assets/models/naga.glb` (or one rig retargeted)
- `js/v8/map/floors/floor3.js` (new, boss arena)
- [js/v8/OniBaba8.js](js/v8/OniBaba8.js) (boss form selector)

**Spec:**
- **Phase 1 — The Approach:** boss form chosen by karma. Form fires projectiles using existing ProjectileSystem (fire-element if dragon, ice if naga, alternating if hybrid).
- **Phase 2 — Reading of the Scroll:** combat pauses, Mercy Scroll opens, boss reads each spared monster's haiku aloud (text + audio). Each spared monster −5% boss HP for phase 3. Each killed monster +5%.
- **Phase 3 — The Verdict:** low-karma fight to the death; high-karma boss kneels, player chooses SPARE or STRIKE (terminal karma swing). LLM line on choice if reachable.

**Gates:**
- [ ] G-PLAY-20 (low-karma run): rush through floors 1–2 killing everything → boss appears as black dragon → fight ends in death match
- [ ] G-PLAY-21 (high-karma run): spare everything → boss appears as white naga → reads scroll → kneels → player can SPARE
- [ ] G-PLAY-22 (mid run): mixed actions → hybrid form
- [ ] G-PERF: boss arena ≥ 60fps
- [ ] G-SMOKE: passes

**Commit:** `feat(v8/f3): three-phase karma-branched boss encounter`

---

### T3.3 — LLMBridge
**Phase:** 3 · **Deps:** T2.3, T3.2 · **Effort:** 4h

**Goal:** Optional LLM enhancement of Oni-Baba dialogue. Never required.

**Touch:**
- `js/v8/ai/LLMBridge.js` (new)
- [js/v8/OniBaba8.js](js/v8/OniBaba8.js) (call bridge for select lines)
- [.env.example](.env.example) (document `LLM_ENDPOINT`)

**Spec:**
- Single `fetch(LLM_ENDPOINT, { signal: AbortSignal.timeout(3000) })`
- On success: insert generated line into the event log
- On failure or timeout: silently fall back to the `ONIBABA_LINES` template bank
- Used for: 1 ambient line per floor (max), 1 boss Phase 2 transition, 1 boss Phase 3 verdict
- Caches last response to avoid duplicate calls in the same 30s window

**Gates:**
- [ ] G-STATIC: `LLMBridge.js` uses `AbortSignal.timeout(3000)`
- [ ] G-PLAY-23 (with endpoint): set endpoint to a working LLM → boss verdict is generated text
- [ ] G-PLAY-24 (no endpoint): unset endpoint → boss verdict is a template line, NO error
- [ ] G-SMOKE: passes both with and without endpoint

**Commit:** `feat(v8): non-blocking LLMBridge with template fallback`

---

### T3.4 — Boss Dialogue Bank
**Phase:** 3 · **Deps:** T3.2 · **Effort:** 2h

**Goal:** 36 hand-written boss lines so the LLM is a bonus, not a dependency.

**Touch:**
- [js/v8/OniBaba8.js](js/v8/OniBaba8.js) (extend ONIBABA_LINES.boss)

**Spec:** 4 lines × 3 phases × 3 forms = 36 lines.

**Gates:**
- [ ] G-STATIC: `grep -c "boss" js/v8/OniBaba8.js` shows the 36 entries
- [ ] G-PLAY-25 (no-LLM playthrough): complete a boss fight with LLM endpoint disabled → all dialogue feels appropriate

**Commit:** `content(v8/f3): 36 hand-written boss dialogue lines`

---

### T3.5 — Thematic Loot Mapping
**Phase:** 3 · **Deps:** T0.1 · **Effort:** 1h

**Goal:** Killing a goblin drops a goblin-themed card.

**Touch:**
- `js/v8/cards/LootTable.js` (new)
- `js/v8/entities/EntityManager.js` (consume table on death)

**Spec:** `{ goblin: 'SHURIKEN', oni: 'BOULDER', naga: 'POISON', mushroom: 'SLEEP DUST' }`. Each monster type has 70% chance of its thematic drop, 30% random.

**Gates:**
- [ ] G-PLAY-26 (theme): kill 10 goblins → ≥ 5 SHURIKEN drops

**Commit:** `feat(v8): monster-type → loot card thematic mapping`

---

### T3.6 — PiP Readback Removal
**Phase:** 3 · **Deps:** T0.1 · **Effort:** 2h

**Goal:** Eliminate the 50ms GPU stall in the PiP camera.

**Touch:**
- `js/v8/map/PiPCamera.js`

**Spec:** Replace `renderer.readRenderTargetPixels()` with a direct WebGLRenderTarget → DOM canvas blit using `texImage2D` or `THREE.WebGLRenderTarget.texture` directly.

**Gates:**
- [ ] G-STATIC: `grep "readRenderTargetPixels" js/v8/` returns nothing
- [ ] G-PERF: PiP active → main view still ≥ 60fps with no 50ms stutters in DevTools Performance

**Commit:** `perf(v8): remove GPU sync stall in PiP camera`

---

### T4.1 — Mobile Touch Pass
**Phase:** 4 Polish · **Deps:** all Phase 1–3 · **Effort:** 4h

**Goal:** "Doesn't break on phone." Full parity is v8.2.

**Touch:**
- [NewOrigami.Panels.html](NewOrigami.Panels.html) (D-pad touch handlers)
- `js/v8/map/PiPCamera.js` (pinch zoom)

**Spec:** Pointer-event handlers on D-pad. Pinch on PiP for zoom. Test on iPhone Safari + Pixel Chrome.

**Gates:**
- [ ] G-PLAY-27 (iOS): full slice playable on iPhone Safari
- [ ] G-PLAY-28 (Android): full slice playable on Pixel Chrome

**Commit:** `feat(v8): mobile touch input for D-pad + PiP pinch zoom`

---

### T4.2 — Card Hand + Cooldowns
**Phase:** 4 · **Deps:** T0.1 · **Effort:** 5h

**Goal:** Cards have weight. Spam is throttled.

**Touch:**
- [NewOrigami.Panels.html](NewOrigami.Panels.html) (hand UI)
- `js/v8/combat/CardExecutor.js` (cooldown gate)

**Spec:**
- Hand cap: 5 cards drawn from collected deck (weighted)
- Per-card cooldown: 1–4 turns by card power
- Cooldown ring rendered on the card face (CSS conic-gradient)

**Gates:**
- [ ] G-PLAY-29 (cooldown): play a 3-turn card → confirm it greys out for 3 turns
- [ ] G-PLAY-30 (hand size): hand never exceeds 5

**Commit:** `feat(v8): card hand with per-card cooldowns`

---

### T4.3 — Auto-Walk to Decision Point
**Phase:** 4 · **Deps:** T0.1 · **Effort:** 2h

**Goal:** Auto-walk is useful during combat exploration.

**Touch:**
- `js/v8/core/PlayerController.js`

**Spec:** Replace the timer-toggle at the existing auto-walk logic. New rule: auto-walk continues until junction, monster, loot, or stairs come into view. Cancellable with any input.

**Gates:**
- [ ] G-PLAY-31 (auto): enable auto-walk in a corridor with a side passage → confirm it stops at the junction

**Commit:** `feat(v8): auto-walk continues to next decision point`

---

### T4.4 — Scoped Hit-Stop
**Phase:** 4 · **Deps:** T0.1, T2.2 · **Effort:** 1h

**Goal:** Hit-stop doesn't freeze the camera or input.

**Touch:**
- `js/v8/combat/MeleeSystem.js`

**Spec:** Apply hit-stop only to the attacking entity's AnimationMixer.timescale (set to 0 for the stop duration). Global frame loop stays live.

**Gates:**
- [ ] G-PLAY-32 (responsive): land a heavy hit → confirm camera can still pan + input still responds during the hit-stop

**Commit:** `fix(v8): scope hit-stop to attacker animation only`

---

### T4.5 — Performance Audit
**Phase:** 4 · **Deps:** all prior · **Effort:** 4h

**Goal:** Pass the doc's performance targets.

**Touch:** (audit-only; fixes spawn ad-hoc tasks if needed)

**Spec:** Profile a full slice playthrough in Chrome DevTools. Confirm:
- Main view ≥ 60fps on M1 / mid-tier Android
- No allocations > 1MB / frame
- JS heap stable across a full slice (no growth > 5MB / 5min)

**Gates:**
- [ ] G-PERF: ≥ 60fps sustained
- [ ] G-HEAP: stable across full playthrough
- [ ] DevTools allocations panel: zero red entries

**Commit:** `perf(v8): pass perf audit for v8.0 slice`

---

### T4.6 — Tag & Ship
**Phase:** 4 · **Deps:** T4.1–T4.5 + all Definition-of-Done items in [V8_BATTLEPLAN.md](V8_BATTLEPLAN.md) · **Effort:** 1h

**Goal:** v8.0 slice is shipped.

**Spec:**
1. Verify all 7 Definition-of-Done items pass.
2. Run full G-SMOKE + G-PERF one final time.
3. `git tag -a v8.0-slice -m "v8.0 vertical slice — Tower of Oni-Baba"`
4. Push tag.

**Gates:**
- [ ] All 7 Definition-of-Done items checked off in V8_STATUS.md
- [ ] Tag `v8.0-slice` exists

**Commit:** N/A — this task creates a tag, not a commit.

---

## 4. Manual Playtest Scenarios (G-PLAY-N)

Each scenario is short, repeatable, and has a binary pass/fail. Run from
[NewOrigami.8.html](NewOrigami.8.html) in a fresh browser tab (Cmd+Shift+N).

| ID | Scenario | Pass condition |
|---|---|---|
| G-PLAY-1 | Walk-around | Move WASD, turn mouse, enter a room, see a monster |
| G-PLAY-2 | Forced throw | Injected error → overlay shows + game continues |
| G-PLAY-3 | Persistence | Reload at known position → restored exactly |
| G-PLAY-4 | High-delta collision | Force 0.1s delta into wall → no phase-through |
| G-PLAY-5 | Floor 1 tour | All 5 rooms reachable in order |
| G-PLAY-6 | Mercy entry | SPARE → scroll entry visible |
| G-PLAY-7 | Scroll persists | Reload → entries still in scroll |
| G-PLAY-8 | Spare beat | SPARE → halo + kanji + chime + popup |
| G-PLAY-9 | Telegraph | Monster attack shows 0.4s wind-up |
| G-PLAY-10 | Sidestep | Q within window → no damage |
| G-PLAY-11 | Floor 1 audible | Floor entry → loop audible within 2s |
| G-PLAY-12 | Mix shift | Force tension=1 → tension layer audible |
| G-PLAY-13 | Rigged animation | Goblin walks/attacks/bows visibly |
| G-PLAY-14 | Mood shift | karma=−60 → fog thickens, tension rises |
| G-PLAY-15 | Mercy effect | karma=+50, 0 kills → looser loot |
| G-PLAY-16 | Retreat | Wound to 25% → monster moves away |
| G-PLAY-17 | Adaptation | 5 left-attacks → fight 6 circles right |
| G-PLAY-18 | Damage variety | Normal/crit/dodge/parry → 4 colors |
| G-PLAY-19 | Fold | Floor 2→3 plays fold animation |
| G-PLAY-20 | Low-karma boss | Kill everything → black dragon death match |
| G-PLAY-21 | High-karma boss | Spare everything → white naga, kneel option |
| G-PLAY-22 | Mid boss | Mixed → hybrid form |
| G-PLAY-23 | LLM line | Endpoint set → boss verdict is generated |
| G-PLAY-24 | LLM fallback | Endpoint unset → template line, no error |
| G-PLAY-25 | Boss dialogue | LLM off → all phases feel appropriate |
| G-PLAY-26 | Thematic loot | 10 goblins → ≥ 5 SHURIKEN |
| G-PLAY-27 | iOS playable | Full slice on iPhone Safari |
| G-PLAY-28 | Android playable | Full slice on Pixel Chrome |
| G-PLAY-29 | Cooldown | 3-turn card greys 3 turns |
| G-PLAY-30 | Hand size | Hand ≤ 5 always |
| G-PLAY-31 | Auto stop | Auto-walk halts at junction |
| G-PLAY-32 | Hit-stop scoping | Camera/input live during hit-stop |

---

## 5. Validation Harness Implementation Specs

Bare minimum for T0.0 to be done.

### `scripts/smoke.js`
```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`file://${process.cwd()}/NewOrigami.8.html`);
  await page.waitForFunction(() => window.__engineReady === true, { timeout: 15000 });
  await page.waitForTimeout(30000);
  await browser.close();
  if (errors.length) { console.error(errors); process.exit(1); }
  console.log('SMOKE OK'); process.exit(0);
})();
```
Engine must set `window.__engineReady = true` on `ENGINE8_READY`. Add that
one line as part of T0.0.

### `scripts/lint-imports.js`
Walk `js/v8/`, parse `import ... from './x.js'` lines, build a graph, detect
cycles via DFS. Exit 1 on cycle.

### `scripts/smoke-save.js`
Load game → write known state → reload → assert all 9 fields match.

### `scripts/smoke-audio.js`
For each `assets/audio/*.ogg`, instantiate `new Audio()` in headless Chromium,
play 100ms, assert no error.

### `scripts/smoke-visual.js`
Stub for v8.0 — returns 0. Real impl is v8.1.

---

## 6. Status & Recovery

### The single source of truth is [V8_STATUS.md](V8_STATUS.md).
- It lists every task with one of: `pending`, `in-progress`, `done`, `blocked`.
- It lists every Definition-of-Done item with a checkbox.
- It lists every active blocker with a description.

### When resuming work
1. Read [V8_STATUS.md](V8_STATUS.md).
2. If "in-progress" exists: check the matching `pre-<TASK_ID>` tag in git — if HEAD has moved past it without that task being marked `done`, **roll back to the tag** and re-execute. Half-done tasks are abandoned, not resumed.
3. Otherwise pick the first `pending` task whose deps are all `done`.

### When stopping mid-task
Mark the task `in-progress` in [V8_STATUS.md](V8_STATUS.md). Do **not**
commit partial work to main. Either complete-and-validate or roll back.

### Blockers
A blocker is anything that prevents the current task from passing all its
gates and is **not** trivially fixable. Examples: missing asset that needs a
human to source (a GLB model), an API endpoint that's down, a perf target
that requires a redesign.

When you hit a blocker:
1. Roll back: `git reset --hard pre-<TASK_ID>`
2. Add to [V8_STATUS.md](V8_STATUS.md) "Blockers" with: task ID, gate that failed, what was tried, what's needed.
3. Stop work. Wait for human.

---

## 7. Anti-Patterns (Do Not)

These behaviors break the constructor protocol. Refuse them.

- **"While I'm in this file, let me also fix…"** → No. One task one scope.
- **"This validation gate seems flaky, I'll skip it."** → No. Fix the gate or roll back.
- **"I'll commit the half-finished work and come back."** → No. Validate or roll back.
- **"The doc says X but I think Y is better."** → Stop. Surface the disagreement in [V8_STATUS.md](V8_STATUS.md). Do not unilaterally diverge.
- **"I'll skip the smoke test because my change is small."** → No. The smoke test is the floor.
- **"This task is bigger than estimated, I'll split it as I go."** → Stop. Roll back. Add new tasks to this doc, then re-execute.

---

## 8. The North Star

Every commit on the road to v8.0 must answer **yes** to:

> *"Does this make the world feel more alive for a kid playing with their parent?"*

If a task can't answer yes, it doesn't belong in v8.0. Defer it to v8.1+.

---

*Constructor v1 — 2026-05-13*
*Companion: [V8_BATTLEPLAN.md](V8_BATTLEPLAN.md) (vision), [V8_STATUS.md](V8_STATUS.md) (live state)*
*Next action: execute T0.0 — bootstrap the validation harness.*
