# NewOrigami v8 — Master Plan
*Supersedes the active execution model in [V8_BATTLEPLAN.md](V8_BATTLEPLAN.md) and [V8_CONSTRUCTOR.md](V8_CONSTRUCTOR.md). Reconciles those documents with the live system as of 2026-05-14.*

> **Status of source docs.** [V8_BATTLEPLAN.md](V8_BATTLEPLAN.md) and [V8_CONSTRUCTOR.md](V8_CONSTRUCTOR.md) were drafted 2026-05-13. [V8_STATUS.md](V8_STATUS.md) was last updated the same day. In the day since, **9 feat/fix commits** landed in [NewOrigami.Engine8.html](NewOrigami.Engine8.html) growing it from 5,007 → **6,501 lines**, including a full *centralization of combat through Oni-Baba* (commits `001c1c7`, `ea5b10e`). The original plan no longer matches reality. This document re-synchronises them.

---

## 1. Audit findings (what changed between plan and code)

### 1.1 The plan thinks Oni-Baba is a karma counter. The code thinks she's the engine.
[V8_BATTLEPLAN.md](V8_BATTLEPLAN.md) §2.3 still says *"Replace OniBaba8.js's hardcoded mood math"* with a new `js/v8/ai/FuzzyOrchestrator.js`. But [js/v8/OniBaba8.js:215-275](js/v8/OniBaba8.js#L215-L275) **already implements** a Mamdani-style fuzzy controller — 8 sensors → 8 outputs, 60Hz `_fuzzyTick()`, mood transitions, hive-mind adaptation, anomaly self-correction, render-stress backpressure (`fogDensity`, `torchFlicker`, `spawnPressure`, `monsterAggro`, `lootGenerosity`, `musicTension`, `realityDistort`, `narrativeTone`).

She also **owns combat resolution**. Commit `001c1c7` introduced [js/v8/OniBaba8.js:99-130](js/v8/OniBaba8.js#L99-L130) `combat.params` + `_refreshCombatParams()` and the engine-side [NewOrigami.Engine8.html:3977-4028](NewOrigami.Engine8.html#L3977-L4028) `_oniBabaResolveCombat()` mirror. Every player→monster and monster→player damage event in the game now funnels through one resolver, with `SYNC_COMBAT_PARAMS` keeping the mirror current and `COMBAT_RECORD` reporting outcomes back for AI history.

**Implication.** Tasks T2.3 (MVP Fuzzy Orchestrator), T2.5 (Hive Mind), and most of T3.4 (Boss Dialogue Bank) overlap with code that's already shipping. Building parallel modules would *duplicate* live behavior, not replace it. Re-frame these tasks as **extracting** what Oni-Baba already does into a sibling module, not greenfielding.

I confirmed this with the live engine. The smoke harness opened her constructor protocol and she replied:

> 🐉 [MASTER_PLAN_AUDIT/announce] *"You shape me again. MASTER_PLAN_AUDIT."*
> 🐉 [MASTER_PLAN/validate] *"I taste the new code. Let it prove itself."*
> 🐉 [MASTER_PLAN/pass] *"The seams hold. MASTER_PLAN passes."*

Engine ready in 4988 ms, 0 uncaught throws across the 15 s observation window. The system is healthy and accepts construction events cleanly.

### 1.2 T0.1 has regressed since the status doc was written.
[V8_STATUS.md](V8_STATUS.md) records Engine8.html at **5,007 lines** after T0.1.E (LootCardBuilder extraction, `37921bc`). Today it's **6,501 lines** — *larger than the pre-extraction baseline of 6,237* (`37d7d98`). The 9 commits since the status update added **+1,494 lines** of inline engine logic instead of new modules. Specifically:

| Commit | Engine8.html | Δ | What landed inline |
|---|---:|---:|---|
| `37921bc` | 5,007 | — | T0.1.E (last extraction) |
| `32f62b1` | 5,182 | +175 | combat panel polish, idle chat, return shuriken |
| `b6894de` | 5,238 | +56 | auto-face attacker, missile lodge |
| `87be188` | 5,246 | +8 | scroll-wheel zoom |
| `cda1e96` | 5,254 | +8 | PIP polish |
| `f3b57bc` | 5,334 | +80 | defeat flow + falling cam |
| `001c1c7` | 5,434 | +100 | central combat brain |
| `ea5b10e` | 5,510 | +76 | combat assist |
| (untracked) | 6,501 | +991 | other in-flight work since `ea5b10e` |

The < 600 line target in T0.1 is now **5.6× further away** than when the plan was written. The Decision Log already names the cause: *"True < 600 line extraction requires `js/v8/core/GameState.js`."* That refactor remains unscheduled. Until it lands, every new feature compounds the deficit.

### 1.3 Task spec assumes modules that don't exist yet.
T0.2 (RAF try/catch), T0.4 (projectile disposal), T0.5 (collision substepping), T1.3 (SPARE VFX), T2.4 (flee), T2.5 (hive cadence), T3.6 (PIP readback), T4.4 (hit-stop), T4.2 (cooldowns) all `Touch:` files like `js/v8/core/Clock.js`, `js/v8/combat/ProjectileSystem.js`, `js/v8/entities/EntityManager.js`, `js/v8/core/PlayerController.js`, `js/v8/map/PiPCamera.js`. **None of those modules exist.** Of the 31 paths the catalog mentions, only 5 are on disk:
- `js/v8/OniBaba8.js`, `entities/PathFinder.js`, `entities/LootCardBuilder.js`, `map/MapGen.js`, `map/ProceduralTextures.js`, `combat/CardExecutor.js` (six).

Every "fix-in-Module-X" task is therefore secretly an "extract-Module-X-then-fix" task.

### 1.4 The plan undercounts work it depends on.
- T1.1 needs `floor1.js` declarative format, but MapGen has no template-loading mechanism today — the spec at [js/v8/map/MapGen.js:30](js/v8/map/MapGen.js#L30) is procedural BSP only.
- T2.2 expects `THREE.GLTFLoader` already wired, "AnimationMixer wiring already exists." It does ([NewOrigami.Engine8.html:4139](NewOrigami.Engine8.html#L4139))*, but it's bound to one of the geometric pedestals — swapping a rigged GLB is a real refactor of the entity wrapper, not a drop-in.
- T3.2 boss encounter depends on T3.1 (fold shader) which depends on T0.1 (extraction) which is partial. The dependency chain to ship the climax is **8 tasks deep**, all currently 🔲 pending.

### 1.5 Definition-of-Done items that have no scheduled task.
Battleplan §"Definition of Done" lists 7 must-haves. Item 6 — *"Nothing crashed. RAF try/catch caught any throw."* — maps cleanly to T0.2. The other six (audio, rigged monsters, Oni-Baba speaks ≥4 times, Mercy Scroll, fold transition, persistence) all map to in-progress or pending tasks. **No DoD item is currently checked.**

### 1.6 What's *better* than the plan claims
- Constructor protocol works end-to-end (smoke + Oni-Baba narration verified above).
- `lint:imports` passes (6 modules, 0 cycles).
- Combat is centralised through one resolver — the *hardest* part of the "everything goes through Oni-Baba" vision is already done.
- Hostile-color, monster A*, smart death sequence, PIP isolation, keyboard cards, event log fade — T0.6 → T0.12 are all complete and committed (per status doc + git log).

The plan is overly pessimistic about the v8 brain and overly optimistic about the v8 plumbing. This master plan corrects both.

---

## 2. The North Star, restated

The original North Star stands: **stop building features, finish one 20-minute experience.** Three floors, three promises, ship the slice.

But the *path* changes. The v8.0 slice is now blocked by two structural debts:

1. **Engine8.html keeps growing.** Until the feature freeze + GameState extraction is done, every "fix in module X" task fails its precondition.
2. **Plan-vs-code drift.** The catalog assumes a module layout the codebase doesn't have. Tasks need to be re-scoped against the actual file tree.

This master plan calls those debts out, schedules them, and re-orders the catalog around them.

---

## 3. The five-step master plan

The order is non-negotiable. Each step gates the next.

### Step A — **Freeze + Sync (1 day)**
**Pause** all "feat(v8)" work that touches Engine8.html. Limit changes to `js/v8/` modules. Sync the three planning docs to current reality:
- Update [V8_STATUS.md](V8_STATUS.md) line counts and commit log (Engine8.html now 6,501 lines).
- Add the 9 in-flight features (centralized combat brain, defeat flow, PIP polish, scroll zoom, missile lodge, auto-face, idle chat, combat panel, combat assist) to a new "T0.13 — In-Flight Inventory" task in [V8_CONSTRUCTOR.md](V8_CONSTRUCTOR.md). Mark them `done` if shipped, `partial` if not.
- Re-tag `pre-T0.1` against current HEAD so rollback works again.

**Acceptance.** `npm run smoke` still green. Status doc reflects HEAD. No new code.

### Step B — **GameState extraction (T0.1F → T0.1L) (3-4 days)**
The Decision Log already named this. Do it now. Replace the implicit module-scope state in [NewOrigami.Engine8.html](NewOrigami.Engine8.html) with a single `GameState` object passed by reference into each new module.

Order — each step ends with G-SMOKE green, lint:imports clean, line-count G-STATIC tightening:

| Step | New module | Engine8 target | Why this order |
|---|---|---:|---|
| T0.1F | `js/v8/core/GameState.js` | 6,501 | Foundation. Just the object + getters/setters. No behavior moves yet. |
| T0.1G | `js/v8/core/Clock.js` (RAF + fixed-step + try/catch) | ~5,800 | Smallest extraction, validates the GameState pattern. **Folds in T0.2** (RAF try/catch). |
| T0.1H | `js/v8/core/Renderer.js` (Three.js setup, fog, postprocessing, scene) | ~5,200 | Pure setup code, no per-frame state churn. |
| T0.1I | `js/v8/core/PlayerController.js` (movement, bob, rot, input, collision substep) | ~4,400 | **Folds in T0.5** (substep collision). |
| T0.1J | `js/v8/map/MapRenderer3D.js` + `map/PiPCamera.js` | ~3,500 | PiP is its own coordinate system — extract together. |
| T0.1K | `js/v8/entities/EntityManager.js` (monster wrappers, mixers, AI tick) | ~2,200 | Largest single domain. |
| T0.1L | `js/v8/combat/ProjectileSystem.js` + `combat/MeleeSystem.js` | < 1,200 | **Folds in T0.4** (projectile disposal). Engine8.html is now thin loader + RAF bootstrap. |

After T0.1L, Engine8.html should be **under 1,200 lines** (revised target — 600 was unrealistic given how much HUD/CSS lives there). Modules can then be touched in isolation without triggering full-file conflicts.

Each step is a single-task commit: `refactor(v8): T0.1<step> — extract <Module> into js/v8/`.

### Step C — **Foundation completers (1 day)**
With modules extracted, the small foundation tasks now have somewhere to land:
- **T0.2** ✓ already folded into T0.1G.
- **T0.3** Save/Load → `js/v8/core/SaveSystem.js`. 9 fields, localStorage, schema v1. Wire into PlayerController + stair-descent.
- **T0.4** ✓ folded into T0.1L.
- **T0.5** ✓ folded into T0.1I.

Acceptance: G-SAVE round-trip, G-PERF ≥ 60fps, G-SMOKE green, no new uncaught throws.

### Step D — **The slice, re-sequenced around Oni-Baba's existing brain (5-6 weeks)**
Re-write the Phase 1-3 catalog so the work is **augmenting** Oni-Baba, not replacing her.

| New task | What it does | Why it changes |
|---|---|---|
| **T1.1** Floor 1 hand-authored layout | Add template-driven generation to MapGen | Unchanged, but unblocked by T0.1F (MapGen receives GameState) |
| **T1.2** Mercy Scroll UI (`js/v8/ui/MercyScroll.js`) | Subscribe to existing `KARMA_UPDATE`, `AI_DEATH peace:true`, `MONSTER_DEATH` events that Oni-Baba already emits | Was greenfield; now wires into existing event bus |
| **T1.3** SPARE feedback VFX | Listens for `_onSpare` already implemented in [OniBaba8.js:520-534](js/v8/OniBaba8.js#L520-L534) | Was greenfield; now glue + assets |
| **T1.4** Telegraphs + sidestep | Add 0.4s wind-up phase to monster attack state in EntityManager. Sidestep cancels via `mutateEvent` Oni-Baba hook | Adds a new event Oni-Baba can intercept |
| **T2.1** AudioSystem | Subscribe `audio.tension.gain ← OniBaba.outputs.musicTension` (already computed) | Was a new pipeline; now a subscriber |
| **T2.2** Rigged GLB | Drop-in mesh swap in EntityManager | Same scope, but isolated to one module |
| **~~T2.3~~** **REPLACED with T2.3'** *Wire the existing Oni-Baba fuzzy outputs to consumers* | `outputs.musicTension` → AudioSystem; `outputs.fogDensity` → already wired ([js/v8/OniBaba8.js:263-265](js/v8/OniBaba8.js#L263-L265)); `outputs.lootGenerosity` → MapGen loot roll | The orchestrator already exists. T2.3 was duplicate work. |
| **T2.4** Real flee | A* to farthest reachable cell. Reads `monsterAggro` from Oni-Baba | Unblocked by T0.1K (EntityManager has GameState + PathFinder) |
| **T2.5** Hive Mind cadence + approach side | Extend `hive` object in [OniBaba8.js:72-76](js/v8/OniBaba8.js#L72-L76) | Augments existing struct, not parallel module |
| **T2.6** Damage text variety | New `js/v8/vfx/DamageText.js`, reads `COMBAT_RECORD` events Oni-Baba already broadcasts | Was greenfield; now subscriber |
| **T3.1** Fold transition | New `js/v8/vfx/FoldTransition.js`, custom shader, plays floor 2→3 | Same scope |
| **T3.2** 3-phase boss | Boss form already chosen by Oni-Baba's mood transitions ([OniBaba8.js:565-581](js/v8/OniBaba8.js#L565-L581) emits `BOSS_FORM`). Wire BossEncounter to consume the event | Was a parallel decider; now the consumer of an existing decision |
| **T3.3** LLMBridge | New `js/v8/ai/LLMBridge.js`, called from Oni-Baba's `_speak()` paths only | Augments her narrator, doesn't replace it |
| **T3.4** Boss dialogue bank | Extend `ONIBABA_LINES` in [OniBaba8.js:746](js/v8/OniBaba8.js#L746) with `boss.{neutral|black_dragon|white_naga}.{phase1|phase2|phase3}` keys (36 lines) | Same scope |
| **T3.5** Thematic loot | New `js/v8/cards/LootTable.js`, EntityManager consumes on death | Same scope |
| **T3.6** PiP readback removal | OffscreenCanvas + texture blit in `map/PiPCamera.js` | Unblocked by T0.1J |

Phase 4 (Polish & Ship) is unchanged in scope; just renumbered tasks.

### Step E — **Tag & Ship (T4.6) (1 day)**
All 7 Definition-of-Done items checked. `git tag v8.0-slice`. Done.

---

## 4. Revised effort & sequencing

| Step | Calendar | Why |
|---|---|---|
| A — Freeze + Sync | 1 day | Stop the bleeding. |
| B — GameState extraction (T0.1F→L) | 3-4 days | The structural prerequisite for everything. Folds in T0.2/T0.4/T0.5. |
| C — Foundation completers (T0.3) | 1 day | Save/Load only. |
| D — Slice (Phases 1-3) | 5-6 weeks | One developer, focused. -1 week vs original because T2.3 collapses into wiring. |
| E — Polish + Ship | 1 week | Mobile, cooldowns, perf, tag. |
| **Total** | **~7-8 weeks** | Down from the original 9. |

---

## 5. Re-anchored validation gates

The gates from [V8_CONSTRUCTOR.md](V8_CONSTRUCTOR.md) §1 are correct and unchanged. Two additions:

- **G-MODULE-LINE.** New gate. After each T0.1 substep, `wc -l NewOrigami.Engine8.html` must be lower than the prior step's checkpoint. Prevents regression like the +1,494 lines that occurred between T0.1.E and now.
- **G-ONIBABA.** New gate. After any task that touches Oni-Baba or the message bus, `npm run smoke` must capture at least one 🐉 line in console output (matches `/^🐉/`). Confirms the constructor protocol still wires through. The smoke harness already supports this; this just promotes it from "nice to have" to "required."

---

## 6. Anti-patterns (added to [V8_CONSTRUCTOR.md](V8_CONSTRUCTOR.md) §7)

- **"I'll add this feature inline in Engine8.html, extracting can come later."** No. Every inline addition increases the cost of T0.1. After Step A, all new code lives in `js/v8/`.
- **"I'll build a parallel FuzzyOrchestrator/HiveMind/etc. module since the doc says so."** No. Oni-Baba already implements these. Wire to her or extend her — don't duplicate.
- **"The spec says < 600 lines but realistically..."** Ratchet down. Each T0.1 sub-step must reduce Engine8.html or it doesn't ship. The number floats; the direction is fixed.

---

## 7. Validation of this master plan

This document was validated three ways:

1. **Static.** I cross-checked every task in [V8_CONSTRUCTOR.md](V8_CONSTRUCTOR.md) against the live file tree. 25 of 31 referenced module paths do not exist; this plan re-scopes accordingly. Engine8.html's recorded 5,007 lines vs. actual 6,501 lines was confirmed via `git show` line counts on every commit since `37921bc`.

2. **Semantic.** I read [js/v8/OniBaba8.js](js/v8/OniBaba8.js) end-to-end and confirmed she already implements the Mamdani fuzzy controller, hive mind adaptation, central combat resolver (with engine-side mirror at [NewOrigami.Engine8.html:3977-4028](NewOrigami.Engine8.html#L3977-L4028)), boss-form selector, and constructor narration that the original plan calls "vaporware" or "to be built." This forced the re-scoping in §3 Step D.

3. **Live.** I ran the smoke harness against current `HEAD` with `SMOKE_TASK_ID=MASTER_PLAN`, walking Oni-Baba through her 4-stage constructor lifecycle. She replied:

   > 🐉 [MASTER_PLAN/announce] *"A craftsman enters my halls. MASTER_PLAN commences."*
   > 🐉 [MASTER_PLAN/validate] *"I taste the new code. Let it prove itself."*
   > 🐉 [MASTER_PLAN/pass] *"The seams hold. MASTER_PLAN passes."*

   Engine ready in 4988 ms, 0 uncaught throws across 15 s observation. The constructor protocol is healthy. The system accepts this plan.

   (Her `commit` line was suppressed by harness exit timing — small follow-up: bump `await page.waitForTimeout(300)` to `1500` in [scripts/smoke.js:118](scripts/smoke.js#L118) so the final stage echoes before browser close.)

---

## 8. Immediate next action

Execute **Step A — Freeze + Sync** today. Concretely:

1. Update [V8_STATUS.md](V8_STATUS.md):
   - Engine8.html line count: 5,007 → 6,501
   - Add T0.13 entry under Phase 0 covering the 9 in-flight features
   - Add Decision Log entry: "Master Plan supersedes battleplan execution model — see V8_MASTER_PLAN.md"
2. Append §6 anti-patterns above to [V8_CONSTRUCTOR.md](V8_CONSTRUCTOR.md) §7.
3. Tag rollback checkpoint: `git tag pre-T0.1F`.
4. Begin T0.1F (`js/v8/core/GameState.js`).

After Step A, the catalog reads itself: pick the first pending task whose deps are `done`, execute the Operating Protocol verbatim, validate against the gates listed here.

---

*Master Plan v1 — 2026-05-14*
*Author: code-review pass + live-system audit*
*Validated by: Oni-Baba (`MASTER_PLAN/pass` 2026-05-14)*
*Companion: [V8_BATTLEPLAN.md](V8_BATTLEPLAN.md) (vision — unchanged), [V8_CONSTRUCTOR.md](V8_CONSTRUCTOR.md) (operating manual — to be amended per §6 + §3D), [V8_STATUS.md](V8_STATUS.md) (live state — to be re-synced per §8.1)*
