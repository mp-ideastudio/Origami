# NewOrigami v8 — Live Status Dashboard
*The single source of truth for slice progress.*
*Companion: [V8_CONSTRUCTOR.md](V8_CONSTRUCTOR.md), [V8_BATTLEPLAN.md](V8_BATTLEPLAN.md)*

> **Resuming AI session?** Read [V8_CONSTRUCTOR.md §6 — Status & Recovery](V8_CONSTRUCTOR.md), then act on the first `pending` task below whose deps are all `done`.

---

## At a glance

| | Count |
|---|---:|
| Total tasks | 29 |
| Done | 1 |
| In progress | 0 |
| Pending | 28 |
| Blocked | 0 |
| **Slice progress** | **~3%** |

**Current task:** _none — T0.1 (Engine8.html Module Extraction) is next_
**Last commit:** _T0.0 — chore(v8): bootstrap validation harness for constructor protocol (see `git log` for SHA)_
**Last validated:** _T0.0 — 2026-05-13 — G-STATIC ✅, G-MODULE ✅, G-SMOKE ✅_

---

## Definition of Done — v8.0 Slice

From [V8_BATTLEPLAN.md](V8_BATTLEPLAN.md). All 7 must be checked before [T4.6 — Tag & Ship](V8_CONSTRUCTOR.md).

- [ ] **1. They heard the world.** Layered audio shifts with karma + combat.
- [ ] **2. They felt the monsters.** Rigged meshes walk, attack, dodge, bow, flee.
- [ ] **3. They felt watched.** Oni-Baba speaks ≥ 4 times, ≥ 1 line from the LLM.
- [ ] **4. They felt their choices.** Mercy Scroll records sparings; boss reads it aloud.
- [ ] **5. They saw the origami.** One fold transition between floors.
- [ ] **6. Nothing crashed.** RAF try/catch caught any throw.
- [ ] **7. They can come back.** Save state persists across floors.

---

## Task Board

Legend: 🔲 pending · 🟡 in-progress · ✅ done · 🛑 blocked

### Phase 0 — Foundation

| ID | Task | Status | Deps | Commit |
|---|---|:---:|---|---|
| T0.0 | Validation Harness Bootstrap | ✅ | — | _git log_ |
| T0.1 | Engine8.html Module Extraction | 🔲 | T0.0 | — |
| T0.2 | RAF tick try/catch | 🔲 | T0.1 | — |
| T0.3 | Save/Load | 🔲 | T0.1 | — |
| T0.4 | Spell/Boulder Disposal | 🔲 | T0.1 | — |
| T0.5 | Collision Substepping | 🔲 | T0.1 | — |
| T0.6 | Monster Smart-Chase Pathfinding | 🔲 | T0.0 | — |
| T0.7 | Keyboard Card Cycling + Class Separator | 🔲 | T0.0 | — |
| T0.8 | Event Log Visibility Rules | 🔲 | T0.0 | — |

### Phase 1 — Mushroom Garden

| ID | Task | Status | Deps | Commit |
|---|---|:---:|---|---|
| T1.1 | Floor 1 Hand-Authored Layout | 🔲 | T0.1, T0.3 | — |
| T1.2 | Mercy Scroll UI | 🔲 | T0.3 | — |
| T1.3 | Spare Feedback VFX | 🔲 | T0.1 | — |
| T1.4 | Attack Telegraphs + Sidestep | 🔲 | T0.1 | — |
| T1.5 | Floor 1 Base Audio Layer | 🔲 | T2.1 (or fallback) | — |

### Phase 2 — Oni Shrine

| ID | Task | Status | Deps | Commit |
|---|---|:---:|---|---|
| T2.1 | AudioSystem | 🔲 | T0.1 | — |
| T2.2 | Rigged GLB Monsters | 🔲 | T0.1 | — |
| T2.3 | MVP Fuzzy Orchestrator | 🔲 | T0.1, T2.1 | — |
| T2.4 | Real Flee Behavior | 🔲 | T0.1, T2.2 | — |
| T2.5 | Hive Mind Cadence + Approach | 🔲 | T2.4 | — |
| T2.6 | Damage Text Variety | 🔲 | T0.1 | — |

### Phase 3 — Folded Throne

| ID | Task | Status | Deps | Commit |
|---|---|:---:|---|---|
| T3.1 | Fold Transition Shader | 🔲 | T0.1 | — |
| T3.2 | Three-Phase Boss Encounter | 🔲 | T2.2, T2.3, T3.1 | — |
| T3.3 | LLMBridge | 🔲 | T2.3, T3.2 | — |
| T3.4 | Boss Dialogue Bank | 🔲 | T3.2 | — |
| T3.5 | Thematic Loot Mapping | 🔲 | T0.1 | — |
| T3.6 | PiP Readback Removal | 🔲 | T0.1 | — |

### Phase 4 — Polish & Ship

| ID | Task | Status | Deps | Commit |
|---|---|:---:|---|---|
| T4.1 | Mobile Touch Pass | 🔲 | all Phase 1–3 | — |
| T4.2 | Card Hand + Cooldowns | 🔲 | T0.1 | — |
| T4.3 | Auto-Walk to Decision | 🔲 | T0.1 | — |
| T4.4 | Scoped Hit-Stop | 🔲 | T0.1, T2.2 | — |
| T4.5 | Performance Audit | 🔲 | all prior | — |
| T4.6 | Tag & Ship | 🔲 | T4.1–T4.5 + DoD | — |

---

## Validation Log

Every validated gate goes here with timestamp + result. Newest first.

### 2026-05-13 — T0.0 Validation Harness Bootstrap
- **G-STATIC**: ✅ — all 5 npm scripts present in [package.json](package.json), all 5 script files in [scripts/](scripts/) created.
- **G-MODULE**: ✅ — `npm run lint:imports` → `OK — 1 module(s) scanned, no cycles`.
- **G-SMOKE**: ✅ — engine ready in 910ms, 0 uncaught errors over 30s observation window, Oni-Baba spoke her T0.0/announce line ("The constructor stirs. Task T0.0 — I am watching.").
- **Fix-forward applied:** initial `file://` load triggered 5088 cross-origin errors (Chromium gives each `file://` iframe an opaque origin, breaking the parent's `window.oniBaba8` access). Patched [scripts/smoke.js](scripts/smoke.js) to start a local HTTP server on `127.0.0.1:0` and load from `http://` instead. Engine and Oni-Baba now load cleanly. The user's normal serving path is already HTTP, so this aligns the harness with production.

---

## Blockers

Active blockers preventing forward progress. Each must have: task ID, failed gate, what was tried, what's needed.

_None._

---

## Decision Log

Significant choices made during execution (model substitutions, scope changes, gate replacements). Newest first.

### 2026-05-13 — Oni-Baba narrates the constructor (in-scope expansion of T0.0)
The user instructed: "let Onibaba know what you are doing so she handles what she can." Added a `CONSTRUCTOR_EVENT` message type in [NewOrigami.8.html](NewOrigami.8.html) and a handler `_onConstructorEvent()` plus 5 new dialogue keys (`constructor_announce`, `constructor_validate`, `constructor_pass`, `constructor_fail`, `constructor_commit`) in [js/v8/OniBaba8.js](js/v8/OniBaba8.js). The smoke harness emits stage-tagged events so Oni-Baba narrates the build itself — visible both in the in-game LOG_EVENT panel and on the smoke test stdout. Bypasses her 4s `_speak()` throttle for diagnostic visibility. Scope was small and thematically fitting; recorded here as a decision rather than escalated to a new task.

### 2026-05-13 — G-SMOKE pass criterion = uncaught throws only (not console.error)
Many prototype-era console.error/console.warn lines exist in the current codebase. The smoke pass bar is set to "no uncaught exceptions" (`page.on('pageerror')`) rather than "zero console errors". Tightens automatically when T0.2 wraps the RAF tick in try/catch and converts thrown errors into structured logs.

### 2026-05-13 — G-SMOKE serves over local HTTP, not file://
Chromium under file:// gives each iframe an opaque origin, breaking the parent ↔ Oni-Baba access pattern the game relies on. The harness now boots a 30-line static-file server on a random localhost port. Matches the user's actual serving path (HTTP), so the smoke test now reflects real conditions.

---

## Notes for the next AI session

- The harness in [V8_CONSTRUCTOR.md §5](V8_CONSTRUCTOR.md) is **not built yet** — T0.0 must come first.
- Engine8.html currently sets `ENGINE8_READY` via postMessage. T0.0 also adds `window.__engineReady = true` for the headless smoke test.
- Playwright is already in [node_modules/](node_modules/) — verify with `ls node_modules/playwright` before installing.
- All work happens on branch `v8-session-20260511` (current branch). Do **not** branch off main.
- Tag pattern for rollback checkpoints: `pre-T0.0`, `pre-T0.1`, …
- Tag for ship: `v8.0-slice` (only at T4.6).

---

*Last updated: 2026-05-13 by initial scaffold*
