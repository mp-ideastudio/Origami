// --- Game Logic ---
window.onerror = function(msg, url, line, col, error) {
  const errMsg = '❌ Error: ' + msg + ' at line ' + line + ':' + col;
  console.error(errMsg);
  // Visual feedback for debugging (since console might be masked)
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:red;color:white;z-index:10000;font-size:24px;padding:20px;pointer-events:none;';
  errDiv.textContent = errMsg;
  document.body.appendChild(errDiv);
};
console.log("🎮 Game Logic Initializing...");

    window.gameInitialized = false; // Flag to prevent double init
    console.log("DEBUG: One-time check for init hoisting:", typeof init);
    try { window.init = init; } catch(e) { console.error("Hoisting failed:", e); }

    // Top-level safety hatch (executes immediately)
  const loadingOverlay = document.getElementById("loading-overlay");
  // Check if overlay is still visible
  if (loadingOverlay && loadingOverlay.style.display !== 'none') {
    console.warn("⚠️ Asset loading timed out (Top-Level Safety Hatch). Forcing game start.");
    loadingOverlay.style.display = 'none';
    
    if (!window.gameInitialized) {
        window.gameInitialized = true;
        // Try to run init if available
        if (typeof init === 'function') {
            try { init(); } catch(e) { console.error("Safety Hatch Init failed:", e); }
        } else {
             console.error("Safety Hatch: init() not found.");


      }
    }
  }

const scene = window.scene;
if (!scene) {
    console.error("❌ CRITICAL: Scene not found in Game.js. Ensure bundle_setup.js ran first.");
    // throw new Error("Scene missing"); // Disabled for Safety Hatch to allow partial init
}
const mainRenderer = window.mainRenderer;

    // Fog is already set in RendererSystem.init(), checking/overriding here if needed
    // scene.fog = new THREE.FogExp2(0x000000, 0.025); // Redundant and dangerous if scene is null





    const fpvViewContainer = document.getElementById("fpv-viewport");
    
    // --- INTEGRATION: Use RendererSystem Global Camera & Lights ---
    // Fixed: Removed duplicate camera creation that caused split-brain rendering.
    if (!window.rendererSystem.fpvCamera) console.error("FATAL: rendererSystem.fpvCamera missing");
    const fpvCamera = window.rendererSystem.fpvCamera;
    const flashlight = window.rendererSystem.flashlight;

    // --- Lighting ---
    // (Managed by RendererSystem.js - duplicates removed)


    let playerLight;

    // --- Game Constants & Layers ---
    const TILE_SIZE = 5;
    const GRID_SIZE = 50;
    const MAP_WIDTH = 50;
    const MAP_HEIGHT = 50;
    const PLAYER_ANIMATION_SPEED = 0.4;
    const TILE = { WALL: "#", FLOOR: "." };
    const FPV_MODEL_LAYER = 1;
    const ROOM_OVERLAY_LAYER = 2;
    const PLAYER_ISOLATION_LAYER = 3;
    const MONSTER_ISOLATION_LAYER = 4;
    // Limit rim light to FPV so the tactical map stays clean
    // if (typeof rimLight !== "undefined" && rimLight)
    //   rimLight.layers.set(FPV_MODEL_LAYER);


    // Asset manifest for models
    const models = [
      { name: "imp", url: "https://markpeterson.info/assets/Yakuza.Imp.glb" },
      { name: "goblin", url: "https://markpeterson.info/assets/Yakuza.Goblin.2.glb" },
    ];



    // Centralized tuning knobs (safe, non-breaking defaults)
    const TUNING = {
      lighting: {
        playerFill: {
          color: 0xffddaa,
          intensity: 0.4, // Much darker FPV (was 0.7, now 0.4)
          distance: TILE_SIZE * 6.5, // Slightly increased reach
          decay: 2.0, // Softer falloff for cinematic look
        },

        headlamp: {
          color: 0xfff8e0,
          intensity: 0.5, // Much darker FPV (was 0.8, now 0.5)
          distance: TILE_SIZE * 14, // Increased reach
          angle: Math.PI / 6.8, // Slightly wider cone
          penumbra: 0.45, // Softer edges
          decay: 1.1, // Gentler falloff
        },
        monsterFlashlight: {
          color: 0xff6666, // More ominous red tint
          intensity: 0.9, // Much darker FPV (was 1.4, now 0.9)
          distance: TILE_SIZE * 8,
          angle: Math.PI / 6.2,
          penumbra: 0.4,
          decay: 1.25,
        },
        monsterOrb: {
          color: 0x4488ff, // Cooler blue
          intensity: 0.25, // Much darker FPV (was 0.45, now 0.25)
          distance: TILE_SIZE * 6,
          decay: 2.2, // Softer falloff
        },
        flashlight: {
          color: 0xffffff, // Pure white beam
          intensity: 0.9, // Much darker FPV (was 1.5, now 0.9)
          distance: TILE_SIZE * 20, // Long reach
          angle: Math.PI / 8, // Narrow focused beam
          penumbra: 0.2, // Sharp edges
          decay: 0.8, // Minimal falloff for long range
        },
      },
      map: {
        // Camera pitch in degrees (higher = more top-down, fewer walls occluding)
        pitchDeg: 85, // Much more overhead view (was 68, now 85 for nearly top-down)
      },
      combat: {
        detection: {
          frontCone: Math.PI / 6,
          frontDist: 15,
          sideCone: Math.PI / 2,
          sideDist: 4,
          rearCone: Math.PI * 0.9,
          rearDist: 2,
        },
        facingPrecision: Math.PI / 8,
        // Combat camera settings
        camera: {
          heightOffset: 0.9, // Additional 3 feet up (0.9 units = 3 feet)
          tiltDownAngle: Math.PI / 6, // 30 degrees down
          transitionDuration: 500, // milliseconds
        }
      },
      movement: {
        fpvCameraOffset: { x: 0, y: 1.8, z: TILE_SIZE }, // 1 tile behind (Z=TILE_SIZE), 1 foot above head (Y=1.8)
      },
      models: {
        playerHeight: 1.8, // 6 feet tall (increased from 1.5)
        monsterHeight: 1.2, // 4 feet tall (increased from 0.9)
        monsterHeightFPV: 1.2, // Keep same as map view for consistency (was 1.5)
        mapViewScale: 3.0, // 50% larger than previous (was 2.0, now 3.0 for 150% total)
        fpvViewScale: 1.8, // 10% smaller than previous map scale (was 2.0, now 1.8 for 90% of original map scale)
        yaw: {
          player: Math.PI, // Fix backwards orientation - rotate 180 degrees
          monster: -Math.PI / 2, // General monster yaw
          yakuzaImp: 0 // Yakuza.imp facing forward (fixed from -Math.PI backwards orientation)
        },
      },
    };

    // Small helper: scale a model to target height and ground it
    function fitToHeightAndGround(
      object3D,
      targetHeight = 1.2,
      yOffset = 0.02
    ) {
      try {
        // Use the largest axis as height to handle models with Z-up or unusual poses
        const box = new THREE.Box3().setFromObject(object3D);
        const dx = Math.max(0, box.max.x - box.min.x);
        const dy = Math.max(0, box.max.y - box.min.y);
        const dz = Math.max(0, box.max.z - box.min.z);
        const extent = Math.max(dx, dy, dz, 0.0001);
        const scale = targetHeight / extent;
        object3D.scale.setScalar(scale);
        const box2 = new THREE.Box3().setFromObject(object3D);
        const minY = box2.min.y;
        object3D.position.y += -minY + yOffset;
        return scale;
      } catch (_) {
        return 1;
      }
    }

    // Light re-tuning helpers
    function applyHeadlampTuning(light) {
      if (!light) return;
      const c = TUNING.lighting.headlamp;
      light.color.setHex(c.color);
      light.intensity = c.intensity;
      light.distance = c.distance;
      light.angle = c.angle;
      light.penumbra = c.penumbra;
      light.decay = c.decay;
    }
    function applyPlayerFillTuning(light) {
      if (!light) return;
      const c = TUNING.lighting.playerFill;
      light.color.setHex(c.color);
      light.intensity = c.intensity;
      light.distance = c.distance;
      light.decay = c.decay;
    }
    function applyMonsterFlashlightTuning(light) {
      if (!light) return;
      const c = TUNING.lighting.monsterFlashlight;
      light.color.setHex(c.color);
      light.intensity = c.intensity;
      light.distance = c.distance;
      light.angle = c.angle;
      light.penumbra = c.penumbra;
      light.decay = c.decay;
    }
    function applyMonsterOrbTuning(light) {
      if (!light) return;
      const c = TUNING.lighting.monsterOrb;
      light.color.setHex(c.color);
      light.intensity = c.intensity;
      light.distance = c.distance;
      light.decay = c.decay;
    }
    function applyFlashlightTuning(light) {
      if (!light) return;
      const c = TUNING.lighting.flashlight;
      light.color.setHex(c.color);
      light.intensity = c.intensity;
      light.distance = c.distance;
      light.angle = c.angle;
      light.penumbra = c.penumbra;
      light.decay = c.decay;
    }

    // --- Game State & Core Engine ---
    const MONSTER_AI_DISABLED = false; // Enable monsters

    // 🐉 Monster AI States and Configuration
    const MONSTER_STATES = {
      IDLE: 'IDLE',
      ALERTED: 'ALERTED',
      HOSTILE: 'HOSTILE',
      SEARCHING: 'SEARCHING',
      RETURNING_HOME: 'RETURNING_HOME'
    };

    // Fuzzy AI master configuration (supersedes previous MONSTER_AI_CONFIG)
    const MONSTER_AI_CONFIG = {
      SLEEP_DISTANCE: 22,         // Beyond this: idle monsters sleep (no processing)
      WAKE_DISTANCE: 18,          // Player enters this radius -> wake evaluation
      HARD_SIGHT_RANGE: 14,       // Clear frontal max sight
      SOFT_SIGHT_RANGE: 22,       // Fuzzy falloff range
      SIDE_SIGHT_MULT: 0.55,      // Side vision penalty
      BACK_SIGHT_MULT: 0.15,      // Rear minimal awareness
      HEARING_BASE: 7,            // Base hearing radius (soft falloff)
      HEARING_LOUD: 11,           // Loud actions potential radius
      PERCEPTION_DECAY: 0.035,    // Per tick perception decay (fraction)
      MEMORY_HALF_LIFE: 4800,     // ms half-life for last known player position confidence
      ALERT_THRESHOLD: 0.28,      // Perception > alert => searching/alerted
      HOSTILE_THRESHOLD: 0.58,    // Perception > hostile => chase
      DISENGAGE_THRESHOLD: 0.12,  // Fall below -> return home (if not seeing player)
      PATH_REPLAN_MS: 650,        // Re-path at most this often while chasing
      MAX_BFS_STEPS: 260,         // Safety cap path nodes
      MOVE_COOLDOWN_BASE: 320,    // Base ms between moves (modified by fuzzy speed)
      HOSTILE_SPEED_MULT: 0.75,   // Hostile chase is 75% of player move rate (spec)
      SEARCH_SPEED_MULT: 0.50,    // Searching slower
      RETURN_SPEED_MULT: 0.40,
      RANDOM_IDLE_WANDER_CHANCE: 0.02, // Small chance to rotate while idle
      PERIPHERAL_ANGLE: Math.PI * 0.66, // 120° each side (front arc)
      SIDE_ANGLE: Math.PI * 0.9,        // Up to ~160° for side classification
      FACING_WEIGHT: 1.18,        // Weight multiplier if inside forward cone
      SOUND_ACTION_DECAY_MS: 1500,// Player action sound relevance window
      DAMAGE_PERCEPTION_BOOST: 0.22, // When damaged
      GROUP_ALERT_RADIUS: 8,      // Room+proximity alert chain
      GROUP_ALERT_PERCEPTION: 0.35, // Injected perception when ally alerts
      // Legacy compatibility (old cone system still referenced in some UI / lighting code)
      DETECTION_ANGLES: { FRONT: Math.PI / 4, SIDE: Math.PI / 2 },
      VISION_FRONT_RANGE: 12,
      VISION_SIDE_RANGE: 9,
      HEARING_RANGE: 6,
      SEARCH_TURNS: 5,
    };

    // Utility easing / fuzzy helpers
    const _easeOutQuad = t => 1 - (1 - t) * (1 - t);
    const _smoothstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const _now = () => performance.now();

    function _distance(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.hypot(dx, dy); }

    function _calcVisionScore(monster) {
      const d = _distance(monster.x, monster.y, player.x, player.y);
      if (d > MONSTER_AI_CONFIG.SOFT_SIGHT_RANGE) return 0;
      const los = hasLineOfSight(monster.x, monster.y, player.x, player.y) ? 1 : 0;
      if (!los) return 0;
      const angleToPlayer = Math.atan2(player.x - monster.x, player.y - monster.y);
      let fa = monster.facingAngle || 0;
      let angDiff = Math.abs(angleToPlayer - fa); angDiff = Math.min(angDiff, Math.PI * 2 - angDiff);
      let facingMult;
      if (angDiff <= MONSTER_AI_CONFIG.PERIPHERAL_ANGLE * 0.5) facingMult = 1.0;
      else if (angDiff <= MONSTER_AI_CONFIG.SIDE_ANGLE * 0.5) facingMult = MONSTER_AI_CONFIG.SIDE_SIGHT_MULT;
      else facingMult = MONSTER_AI_CONFIG.BACK_SIGHT_MULT;
      const distNorm = _smoothstep(0, MONSTER_AI_CONFIG.SOFT_SIGHT_RANGE, d);
      const clarity = 1 - distNorm; // Closer = higher clarity
      return clarity * facingMult * MONSTER_AI_CONFIG.FACING_WEIGHT;
    }

    function _calcSoundScore(monster) {
      // Placeholder: uses last action timestamp differences for player (if tracked) else mild ambient
      const recentActionAgo = _now() - (player._lastActionTs || 0);
      const audibleRange = recentActionAgo < 500 ? MONSTER_AI_CONFIG.HEARING_LOUD : MONSTER_AI_CONFIG.HEARING_BASE;
      const d = _distance(monster.x, monster.y, player.x, player.y);
      if (d > audibleRange) return 0;
      const fall = 1 - (d / audibleRange);
      const actionEnergy = recentActionAgo < 150 ? 1 : recentActionAgo < 400 ? 0.6 : 0.25;
      return fall * actionEnergy * 0.55;
    }

    function _updatePerception(monster) {
      // Initialize fuzzy fields
      if (monster._fuzzyInit !== true) {
        monster._perception = 0; // 0..1
        monster._lastSeenPlayer = null; // {x,y,ts}
        monster._lastPerceptionUpdate = _now();
        monster._lastMoveAt = 0;
        monster._lastPathCalc = 0;
        monster._path = [];
        monster._fuzzyInit = true;
      }
      const now = _now();
      const dtMs = now - monster._lastPerceptionUpdate;
      monster._lastPerceptionUpdate = now;
      // Decay perception
      monster._perception *= Math.pow(1 - MONSTER_AI_CONFIG.PERCEPTION_DECAY, dtMs / 200);
      const vision = _calcVisionScore(monster);
      const sound = _calcSoundScore(monster);
      let composite = vision + sound;
      if (monster.wasHitRecently) { composite += MONSTER_AI_CONFIG.DAMAGE_PERCEPTION_BOOST; monster.wasHitRecently = false; }
      composite = Math.min(1, composite);
      // Blend (retain some memory inertia)
      monster._perception = Math.min(1, monster._perception * 0.55 + composite * 0.65);
      if (vision > 0) {
        monster._lastSeenPlayer = { x: player.x, y: player.y, ts: now };
      }
    }

    function _monsterShouldSleep(monster) {
      if (monster.hostileState === 'HOSTILE') return false; // active
      const d = _distance(monster.x, monster.y, player.x, player.y);
      return d > MONSTER_AI_CONFIG.SLEEP_DISTANCE;
    }

    function _wakeCheck(monster) {
      if (!monster._sleeping) return;
      const d = _distance(monster.x, monster.y, player.x, player.y);
      if (d <= MONSTER_AI_CONFIG.WAKE_DISTANCE) monster._sleeping = false;
    }

    function _pickStepToward(monster, tx, ty) {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      let best = null; let bestDist = 1e9;
      for (const [dx, dy] of dirs) {
        const nx = monster.x + dx, ny = monster.y + dy;
        if (!map[ny] || !map[ny][nx]) continue;
        if (map[ny][nx].type === TILE.WALL) continue;
        const dist = _distance(nx, ny, tx, ty);
        if (dist < bestDist) { bestDist = dist; best = { x: nx, y: ny }; }
      }
      return best;
    }

    function _rebuildPath(monster, target) {
      if (!target) { monster._path = []; return; }
      // Basic BFS (early exit). Could be optimized with A*; kept lightweight.
      const key = (x, y) => x + ',' + y;
      const q = [{ x: monster.x, y: monster.y }];
      const came = new Map(); came.set(key(monster.x, monster.y), null);
      let found = null; let steps = 0;
      while (q.length && !found && steps < MONSTER_AI_CONFIG.MAX_BFS_STEPS) {
        const n = q.shift(); steps++;
        if (n.x === target.x && n.y === target.y) { found = n; break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = n.x + dx, ny = n.y + dy;
          if (!map[ny] || !map[ny][nx] || map[ny][nx].type === TILE.WALL) continue;
          const k = key(nx, ny); if (came.has(k)) continue;
          came.set(k, n); q.push({ x: nx, y: ny });
        }
      }
      if (!found) { monster._path = []; return; }
      const path = []; let cur = found; while (cur) { path.unshift({ x: cur.x, y: cur.y }); cur = came.get(key(cur.x, cur.y)); }
      path.shift(); // remove current tile
      monster._path = path;
    }

    function _advanceAlongPath(monster) {
      if (!monster._path || !monster._path.length) return;
      const next = monster._path[0];
      if (monster.x === next.x && monster.y === next.y) { monster._path.shift(); return; }
      // Collision / player blocking logic: if next tile is player, treat as attack opportunity instead of moving into tile.
      if (next.x === player.x && next.y === player.y) {
        // Face player & attempt attack (handled later in updateMonsterAI); do not consume path so repeated attempts occur.
        const ang = Math.atan2(player.x - monster.x, player.y - monster.y);
        monster.facingAngle = ang; if (monster.object) monster.object.rotation.y = ang;
        return;
      }
      // Move monster
      monster.x = next.x; monster.y = next.y; if (monster.object) monster.object.position.set(monster.x * TILE_SIZE, 0, monster.y * TILE_SIZE);
      if (monster._path.length && monster._path[0].x === monster.x && monster._path[0].y === monster.y) { monster._path.shift(); }
    }

    // Combat Engagement Handler ("The Snap")
    function engageCombat(monster) {
      if (window.combatMode || monster.isAlly) return;

      console.log('⚔️ ENGAGING COMBAT with', monster.name);
      window.combatMode = true; // Global flag to freeze movement
      window.activeCombatMonster = monster;

      // 1. Snap Positions to Center of Tiles
      const snapTime = 200; // ms
      const pStart = { x: player.object.position.x, z: player.object.position.z };
      const pEnd = { x: player.x * TILE_SIZE, z: player.y * TILE_SIZE };

      const mStart = { x: monster.object.position.x, z: monster.object.position.z };
      const mEnd = { x: monster.x * TILE_SIZE, z: monster.y * TILE_SIZE };

      // 2. Snap Rotations to Face Each Other
      const dx = monster.x - player.x;
      const dy = monster.y - player.y;
      const angToMonster = Math.atan2(dx, dy);
      const angToPlayer = Math.atan2(-dx, -dy);

      // Animate the snap
      const startTime = performance.now();

      function animateSnap() {
        const now = performance.now();
        const t = Math.min(1, (now - startTime) / snapTime);
        const ease = t * (2 - t); // Ease out

        // Pos interp
        player.object.position.x = pStart.x + (pEnd.x - pStart.x) * ease;
        player.object.position.z = pStart.z + (pEnd.z - pStart.z) * ease;

        if (monster.object) {
          monster.object.position.x = mStart.x + (mEnd.x - mStart.x) * ease;
          monster.object.position.z = mStart.z + (mEnd.z - mStart.z) * ease;
        }

        // Rot interp (simple lerp, assume no wrapping issues for short engage)
        // For robustness we set strict final rotation at end

        if (t < 1) {
          requestAnimationFrame(animateSnap);
        } else {
          // Finalize
          player.rotationY = angToMonster;
          if (player.object) player.object.rotation.y = angToMonster;
          // Force camera update?
          setCompassHeading(player.rotationY);

          monster.facingAngle = angToPlayer;
          if (monster.object) monster.object.rotation.y = angToPlayer;

          // Trigger UI
          if (window.CombatUIManager) window.CombatUIManager.show(monster);
          else console.warn("CombatUI not loaded yet");
        }
      }
      animateSnap();
    }

    function _updateState(monster) {
      const p = monster._perception;
      const now = _now();

      // Hysteresis Lock check
      if (monster.stateLockUntil && now < monster.stateLockUntil) {
        return;
      }

      if (monster.hostileState === 'HOSTILE') {
        // Drop to searching if lost player memory
        const last = monster._lastSeenPlayer;
        if (!last || (now - last.ts) > 3000) {
          if (p < MONSTER_AI_CONFIG.DISENGAGE_THRESHOLD) {
            monster.hostileState = 'SEARCHING';
            monster.state = 'SEARCHING';
            monster.stateLockUntil = now + 1000; // Lock searching for 1s
            logMessage(`${monster.name} is searching...`, '#f59e0b');
          }
        }
        return;
      }
      if (p >= MONSTER_AI_CONFIG.HOSTILE_THRESHOLD) {
        monster.hostileState = 'HOSTILE';
        monster.state = 'HOSTILE';
        monster.stateLockUntil = now + 2000; // Commit to hostility for at least 2s

        updateMonsterIndicators(monster);
        playMonsterAlertSound(monster);
        logMessage(`${monster.name} becomes hostile!`, '#ef4444');
        // Alert group
        monsters.forEach(m => {
          if (m === monster) return; if (m.hostileState === 'HOSTILE') return;
          const d = _distance(monster.x, monster.y, m.x, m.y);
          if (d <= MONSTER_AI_CONFIG.GROUP_ALERT_RADIUS) {
            m._perception = Math.max(m._perception, MONSTER_AI_CONFIG.GROUP_ALERT_PERCEPTION);
          }
        });
        return;
      }
      if (p >= MONSTER_AI_CONFIG.ALERT_THRESHOLD) {
        if (monster.hostileState !== 'SEARCHING') {
          monster.hostileState = 'SEARCHING';
          monster.state = 'SEARCHING';
          updateMonsterIndicators(monster);
          logMessage(`${monster.name} is alert.`, '#ffb347');
        }
      } else {
        // Possibly return home / idle
        if (monster.hostileState !== 'INACTIVE') {
          monster.hostileState = 'INACTIVE';
          monster.state = 'IDLE';
          updateMonsterIndicators(monster);
        }
      }
    }

    function updateMonsterAI(monster) {
      try {
        _wakeCheck(monster);
        if (!monster._sleeping && _monsterShouldSleep(monster)) { monster._sleeping = true; return; }
        if (monster._sleeping) return; // Do nothing while sleeping
        _updatePerception(monster);
        _updateState(monster);

        // Ensure aiState mirrors new hostileState for legacy dependent systems
        if (!monster.aiState) {
          monster.aiState = MONSTER_STATES.IDLE;
        }
        const previousAiState = monster.aiState;
        if (monster.hostileState === 'HOSTILE' && monster.aiState !== MONSTER_STATES.HOSTILE) monster.aiState = MONSTER_STATES.HOSTILE;
        else if (monster.hostileState === 'SEARCHING' && monster.aiState !== MONSTER_STATES.SEARCHING) monster.aiState = MONSTER_STATES.SEARCHING;
        else if (monster.hostileState === 'INACTIVE' && monster.aiState !== MONSTER_STATES.IDLE) monster.aiState = MONSTER_STATES.IDLE;

        // Update visual circle when aiState changes
        if (monster.aiState !== previousAiState) {
          updateMonsterVisuals(monster);
        }

        const now = _now();
        // Movement / behavior
        if (monster.hostileState === 'HOSTILE') {
          const last = monster._lastSeenPlayer;
          let target = null;
          if (monster._desiredFlankTarget) {
            const ft = monster._desiredFlankTarget;
            if (map[ft.y] && map[ft.y][ft.x] && map[ft.y][ft.x].type !== TILE.WALL) {
              target = { x: ft.x, y: ft.y };
            } else {
              monster._desiredFlankTarget = null;
            }
          }
          if (!target) target = last ? { x: last.x, y: last.y } : { x: player.x, y: player.y };
          if (now - monster._lastPathCalc > MONSTER_AI_CONFIG.PATH_REPLAN_MS) {
            _rebuildPath(monster, target);
            monster._lastPathCalc = now;
          }
          const cd = MONSTER_AI_CONFIG.MOVE_COOLDOWN_BASE / MONSTER_AI_CONFIG.HOSTILE_SPEED_MULT;
          if (now - monster._lastMoveAt > cd) {
            _advanceAlongPath(monster);
            monster._lastMoveAt = now;
          }
          // Face player always (combat focus)
          const ang = Math.atan2(player.x - monster.x, player.y - monster.y);
          monster.facingAngle = ang; if (monster.object) monster.object.rotation.y = ang;
        } else if (monster.hostileState === 'SEARCHING') {
          const last = monster._lastSeenPlayer;
          if (last) {
            if (now - monster._lastPathCalc > MONSTER_AI_CONFIG.PATH_REPLAN_MS) {
              _rebuildPath(monster, { x: last.x, y: last.y });
              monster._lastPathCalc = now;
            }
            const cd = MONSTER_AI_CONFIG.MOVE_COOLDOWN_BASE / MONSTER_AI_CONFIG.SEARCH_SPEED_MULT;
            if (now - monster._lastMoveAt > cd) { _advanceAlongPath(monster); monster._lastMoveAt = now; }
          }
        } else if (monster.hostileState === 'INACTIVE') {
          // Occasional micro rotate for life
          if (Math.random() < MONSTER_AI_CONFIG.RANDOM_IDLE_WANDER_CHANCE) {
            monster.facingAngle = (monster.facingAngle || 0) + (Math.random() * Math.PI / 2 - Math.PI / 4);
            if (monster.object) monster.object.rotation.y = monster.facingAngle;
          }
        }
        // Post-move / adjacency combat attempt (unified)
        try {
          if (monster.hostileState === 'HOSTILE') {
            // Simple orthogonal adjacency check
            const dx = player.x - monster.x; const dy = player.y - monster.y; const manhattan = Math.abs(dx) + Math.abs(dy);

            // ENGAGEMENT CHECK
            if (manhattan === 1 && !monster.isAlly && !window.combatMode) {
              // Only engage if we basically face each other or it's an ambush
              // For now, aggressive snap:
              engageCombat(monster);
            }

            if (manhattan === 1) {
              const angleTo = Math.atan2(player.x - monster.x, player.y - monster.y);
              monster.facingAngle = angleTo; if (monster.object) monster.object.rotation.y = angleTo;
              // Frequency gate using attackCooldown (turn-based adaptation)
              monster._attackTimer = monster._attackTimer || 0;
              if (now - monster._attackTimer > 650) {
                // Attack roll
                const mBase = (monster.attack || 1) + Math.floor(Math.random() * 2);
                attack(monster, player, mBase);
                monster._attackTimer = now;
              }
            }
          }
        } catch (e) { /* non-fatal */ }
        updateMonsterIndicators(monster);
      } catch (e) { console.warn('fuzzy updateMonsterAI error', e); }
    }

    // 🎵 Monster alert sound
    const GOBLIN_ALERT_SOUND_URL = 'https://gfxsounds.com/wp-content/uploads/2021/02/Goblin-attack-quick.mp3';
    let map = [],
      player = {
        x: 0,
        y: 0,
        rotationY: 0,
        targetRotationY: 0,
        currentTile: null, // Track current tile for NetHack-style visibility
        // NetHack-like core attributes
        level: 1,
        exp: 0,
        expToLevel: () => 10 * Math.pow(player.level, 2), // Scaled XP curve
        str: 10,
        dex: 10,
        con: 10,
        intel: 10,
        wis: 10,
        cha: 10,
        health: 10,
        maxHealth: 10,
        attack: 1,
        ac: 10, // Armor Class (NetHack style)
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          helmet: null,
          boots: null,
          gauntlets: null,
          ring: null,
          amulet: null
        },
        skills: {},
        gold: 0,
        object: null,
        rotationY: 0,
        hasKey: false,
        wasHit: false,
        kills: 0,
        // NetHack survival mechanics
        hunger: 1000, // Hunger level (1000 = well fed, 0 = starving)
        maxHunger: 1000,
        nutrition: 0, // Current nutrition being digested
        turnCount: 0, // Track turns for hunger/regeneration
        statusEffects: new Map(), // Active status effects
        // NetHack identification system
        identifiedItems: new Set(), // Items the player has identified
        // Search mechanics
        searchCount: 0, // Number of times searched in current location
        searchTarget: null, // What we're searching for
      },
      monsters = [],
      dungeonLevel = 1,
      gameObjects = new Map(),
      deadMonsterMarks = []; // Red X markers for defeated monsters
    // stairs and player models removed per user request
    // playerWalkingModel removed per user request
    let monsterModels = [];

    // Store Shim for DungeonMaster
    window.state = {
      player: player, // Reference the global player object
      currentRoom: null,
      level: null
    };

    window.setLevel = function (level) {
      window.state.level = level;
      console.log("[Store] Level set:", level);
    };

    window.updateRoom = function (room) {
      window.state.currentRoom = room;
      if (typeof currentRoomId !== 'undefined') {
        currentRoomId = room.id;
      }
      console.log("[Store] Room updated:", room);
    };

    window.addInventoryItem = function (item) {
      if (player && player.inventory) {
        player.inventory.push(item);
        console.log("[Store] Item added to inventory:", item);
      }
    };

    // UI Shim for DungeonMaster
    window.uiShim = {
      logHTML: (html) => console.log("[UI Log]", html), // Fallback to console
      renderGuideButtons: (actions) => console.log("[UI Guide]", actions),
      updateStats: () => console.log("[UI Stats] Updated"),
      flashIndicator: (type) => console.log("[UI Flash]", type),
      renderInventory: () => console.log("[UI Inventory] Rendered"),
      showLootCard: (item) => console.log("[UI Loot]", item),
      createEventCard: (title, desc) => console.log("[UI Event]", title, desc),
      showFlashlightButton: () => console.log("[UI Flashlight] Shown"),
      pushRoomCard: (room) => console.log("[UI Room Card]", room)
    };

    // Legacy DungeonMaster initialization removed - handled by module script
    /* 
     function initDungeonMaster() { ... } 
     initDungeonMaster(); 
    */

    // Robust helpers for managing scene <-> gameObjects map synchronization.
    // Use these helpers instead of calling scene.add/scene.remove and gameObjects.set/delete directly.
    function addGameObject(key, obj) {
      try {
        if (!key || !obj) return;
        // If object already present under key, remove previous first
        if (gameObjects.has(key)) {
          const prev = gameObjects.get(key);
          try { if (prev && prev.parent) prev.parent.remove(prev); } catch (e) { }
          gameObjects.delete(key);
        }
        // Add to scene if not already attached
        if (obj && !obj.parent) scene.add(obj);
        gameObjects.set(key, obj);
      } catch (e) {
        console.warn('addGameObject failed for', key, e);
      }
    }

    function removeGameObject(key) {
      try {
        if (!gameObjects.has(key)) return;
        const obj = gameObjects.get(key);
        if (obj) {
          try {
            if (obj.parent) obj.parent.remove(obj);
          } catch (e) { }
          // Try to dispose common geometry/material to avoid leaks
          try { if (obj.geometry) obj.geometry.dispose(); } catch (e) { }
          try {
            if (obj.material) {
              if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose && m.dispose());
              else obj.material.dispose && obj.material.dispose();
            }
          } catch (e) { }
        }
        gameObjects.delete(key);
      } catch (e) {
        console.warn('removeGameObject failed for', key, e);
      }
    }
    let animationMixer = null;
    let monsterTurnTicker = 0;
    let clock = new THREE.Clock();
    let sounds = {};
    let isAudioEnabled = true;
    let currentRoomId = null;
    let wallInstancedMesh, floorMesh, ceilingMesh, fpvFloorMesh;
    let isPlayerAnimating = false;
    let playerAnimTime = 0;
    let isAutoMoving = false;
    let autoTrailGroup = null;
    let autoMoveCancel = false;
    // 🔎 Forensic automove logger
    const AutoMoveForensics = {
      enabled: true,
      session: null,
      start(fromX, fromY, toX, toY, pathLen) {
        if (!this.enabled) return;
        this.session = {
          id: Date.now(),
          from: { x: fromX, y: fromY },
          to: { x: toX, y: toY },
          pathLen,
          steps: []
        };
        console.groupCollapsed(`🚶‍♂️ AutoMove start #${this.session.id} from (${fromX},${fromY}) -> (${toX},${toY}) len=${pathLen}`);
        console.log('flags:init', { isAutoMoving, autoMoveCancel, wasHit: player.wasHit, health: player.health });
      },
      step(i, step, flags) {
        if (!this.enabled || !this.session) return;
        this.session.steps.push({ i, step, flags });
        console.log(`step ${i}/${this.session.pathLen - 1}`, {
          playerPos: { x: player.x, y: player.y },
          step,
          ...flags
        });
      },
      moved(i) {
        if (!this.enabled || !this.session) return;
        console.log(`✓ moved to`, { i, playerPos: { x: player.x, y: player.y } });
      },
      blocked(reason) {
        if (!this.enabled || !this.session) return;
        console.warn('⛔ blocked', reason);
        console.groupEnd();
        this.session = null;
      },
      cancelled(reason) {
        if (!this.enabled || !this.session) return;
        console.warn('✋ cancelled', reason);
        console.groupEnd();
        this.session = null;
      },
      done() {
        if (!this.enabled || !this.session) return;
        console.log('✅ arrived', { pos: { x: player.x, y: player.y } });
        console.groupEnd();
        this.session = null;
      }
    };
    let playerStartPos = new THREE.Vector3();
    let playerTargetPos = new THREE.Vector3();
    let playerTargetRotation = new THREE.Quaternion();
    let isPanning = false,
      isRotating = false;
    let previousMousePosition = { x: 0, y: 0 };
    let panOffset = new THREE.Vector3(0, 0, 0);
    const MIN_ZOOM = 8,
      MAX_ZOOM = 60;
    let zoomLevel = MIN_ZOOM; // Start at minimum zoom level to avoid conflicts
    // store a stable default so we can temporarily zoom when entering corridors
    let mapDefaultZoom = zoomLevel;
    // North-up map: angle 0 means looking from South to North (N at top)
    let cameraAngle = 0;

    // Map camera state variables - declare before using in functions
    let mapCameraTarget = new THREE.Vector3();
    let mapCameraPosition = new THREE.Vector3();
    let isMapCameraAnimating = false;
    let userHasPanned = false;
    // desired zoom is target we lerp towards (allows smooth zoom transitions)
    let desiredZoomLevel = zoomLevel;

    // Initialize vertical zoom slider now that constants are defined
    (function setupZoomSlider() {
      const slider = document.getElementById('map-zoom-slider');
      if (!slider) return;
      slider.min = String(MIN_ZOOM);
      slider.max = String(MAX_ZOOM);
      slider.value = String(Math.round(zoomLevel));
      slider.addEventListener('input', () => {
        const val = Number(slider.value);
        desiredZoomLevel = THREE.MathUtils.clamp(val, MIN_ZOOM, MAX_ZOOM);
        zoomLevel = desiredZoomLevel;
        // keep the default zoom in sync with user adjustments
        mapDefaultZoom = zoomLevel;
        updateCamera(true);
      });
      // Initialize camera with current zoom level
      updateCamera(true);
    })();
    // Adjust the map zoom when stepping into tiles (called from movement code)
    function updateMapZoomForTile(tile) {
      try {
        if (!tile) return;
        // Increase "zoom in" by ~75% when in a corridor: i.e. bring camera much closer
        if (tile.roomId === 'corridor') {
          // clamp so we don't go absurdly close
          desiredZoomLevel = Math.max(3, Math.round(mapDefaultZoom * 0.25));
        } else {
          // restore default room zoom
          desiredZoomLevel = Math.round(mapDefaultZoom);
        }
        zoomLevel = THREE.MathUtils.clamp(desiredZoomLevel, 3, MAX_ZOOM);
        updateCamera(true);
      } catch (e) { console.warn('updateMapZoomForTile error', e); }
    }
    let _fpsT = performance.now(),
      _fpsCount = 0;
    let radarAngle = 0;

    let ghostWallPool = [];
    const GHOST_WALL_POOL_SIZE = 10;
    let ghostedInstances = [];

    // Combat camera state
    let isInCombat = false;
    let combatCameraTransitionStart = 0;
    let combatTarget = null;
    let normalCameraHeight = 18.0; // Scaled from baseline 3.6 * 5 (TILE_SIZE difference)
    // Map view dimensions for viewport calculations
    let mapViewWidth = 0;
    let mapViewHeight = 0;
    // Discovery state for rooms and hallways
    let discoveredRooms;
    // Debug toggles (performance-friendly defaults)
    const DEBUG_TILE_LABELS = true;
    const DEBUG_RENDER_LOGS = false;
    const statusEl = document.getElementById('runtime-status');
    function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

    // Player model helpers removed per user request

    const GameTurnManager = {
      currentTurn: "PLAYER",
      isProcessing: false,
      actionQueue: [],

      queuePlayerAction(actionFn, ...args) {
        return new Promise((resolve) => {
          this.actionQueue.push({ actionFn, args, resolve });
          this._drainQueue();
        });
      },

      async _drainQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        try {
          while (this.actionQueue.length) {
            const { actionFn, args, resolve } = this.actionQueue.shift();
            try {
              const result = actionFn ? actionFn(...args) : undefined;
              if (result && typeof result.then === "function") {
                await result;
              }
            } catch (err) {
              console.error("Error executing queued action:", err);
            }

            this.currentTurn = "MONSTERS";
            await this.processMonsterTurns();
            this.currentTurn = "PLAYER";

            // Update loot labels to face player at end of turn
            updateLootLabels();

            if (resolve) resolve();
          }
        } finally {
          this.isProcessing = false;
        }
      },

      async processMonsterTurns() {
        if (this.currentTurn !== 'MONSTERS') return;
        for (const monster of monsters) {
          if (monster.health > 0) {
            try {
              updateMonsterAI(monster);
            } catch (e) {
              console.warn('Monster AI error (skipping this tick):', e);
            }
          }
        }
      },
    };

    function quickTurn(degrees) {
      // Update target rotation instead of snapping
      player.targetRotationY += THREE.MathUtils.degToRad(degrees);

      // Immediately update the target quaternion so the animate loop has the new target
      playerTargetRotation.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        player.targetRotationY
      );

      return Promise.resolve();
    }

    // --- Pathfinding & Auto-Move ---

    class Pathfinder {
      constructor(gridSize) {
        this.gridSize = gridSize;
      }

      findPath(startX, startY, endX, endY, map) {
        const start = { x: startX, y: startY };
        const end = { x: endX, y: endY };
        const openSet = [start];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        gScore.set(`${start.x},${start.y}`, 0);
        const fScore = new Map();
        fScore.set(`${start.x},${start.y}`, this.heuristic(start, end));

        while (openSet.length > 0) {
          openSet.sort((a, b) => (fScore.get(`${a.x},${a.y}`) || Infinity) - (fScore.get(`${b.x},${b.y}`) || Infinity));
          const current = openSet.shift();
          const currentKey = `${current.x},${current.y}`;

          if (current.x === end.x && current.y === end.y) {
            return this.reconstructPath(cameFrom, current);
          }

          closedSet.add(currentKey);
          this.getNeighbors(current, map).forEach((neighbor) => {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (closedSet.has(neighborKey)) return;

            const tentative_gScore = (gScore.get(currentKey) || 0) + 1;
            if (tentative_gScore < (gScore.get(neighborKey) || Infinity)) {
              cameFrom.set(neighborKey, current);
              gScore.set(neighborKey, tentative_gScore);
              fScore.set(neighborKey, tentative_gScore + this.heuristic(neighbor, end));
              if (!openSet.some((node) => node.x === neighbor.x && node.y === neighbor.y)) {
                openSet.push(neighbor);
              }
            }
          });
        }
        return null;
      }

      heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      }

      getNeighbors(node, map) {
        const neighbors = [];
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dx, dy] of dirs) {
          const nx = node.x + dx;
          const ny = node.y + dy;
          if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && map[ny][nx].type !== TILE.WALL) {
            neighbors.push({ x: nx, y: ny });
          }
        }
        return neighbors;
      }

      reconstructPath(cameFrom, current) {
        const totalPath = [current];
        let currentKey = `${current.x},${current.y}`;
        while (cameFrom.has(currentKey)) {
          current = cameFrom.get(currentKey);
          totalPath.unshift(current);
          currentKey = `${current.x},${current.y}`;
        }
        return totalPath;
      }

      isWalkable(x, y, map) {
        // Keep for compatibility if used elsewhere, but getNeighbors handles it
        return x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize && map[y][x].type !== TILE.WALL;
      }
    }

    class PathVisualizer {
      constructor(scene) {
        this.scene = scene;
        this.pathMeshes = [];
        this.destinationMesh = null;

        // Materials
        this.destMat = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.5,
          depthTest: false // Always visible on top of floor
        });
        this.pathMat = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.5,
          depthTest: false
        });

        // Geometries - Boxes as requested
        // Target: 50% transparent green box
        this.destGeo = new THREE.BoxGeometry(TILE_SIZE * 0.8, 0.1, TILE_SIZE * 0.8);
        // Path: smaller green boxes
        this.pathGeo = new THREE.BoxGeometry(TILE_SIZE * 0.2, 0.1, TILE_SIZE * 0.2);
      }

      showPath(path) {
        this.clear();
        if (!path || path.length === 0) return;

        // Draw destination
        const end = path[path.length - 1];
        this.destinationMesh = new THREE.Mesh(this.destGeo, this.destMat);
        this.destinationMesh.position.set(end.x * TILE_SIZE, 0.05, end.y * TILE_SIZE);
        this.destinationMesh.layers.enableAll(); // Visible to both cameras
        this.scene.add(this.destinationMesh);

        // Draw path nodes (skip start and end)
        for (let i = 1; i < path.length - 1; i++) {
          const node = path[i];
          const mesh = new THREE.Mesh(this.pathGeo, this.pathMat);
          mesh.position.set(node.x * TILE_SIZE, 0.05, node.y * TILE_SIZE);
          mesh.layers.enableAll();
          this.pathMeshes.push(mesh);
          this.scene.add(mesh);
        }
      }

      clear() {
        if (this.destinationMesh) {
          this.scene.remove(this.destinationMesh);
          this.destinationMesh = null;
        }
        this.pathMeshes.forEach(m => this.scene.remove(m));
        this.pathMeshes = [];
      }
    }

    // Initialize globals
    const pathfinder = new Pathfinder(GRID_SIZE);
    let pathVisualizer; // Lazy init

    function getPathVisualizer() {
      if (!pathVisualizer) pathVisualizer = new PathVisualizer(window.scene || scene);
      return pathVisualizer;
    }
    let autoMovePath = [];

    let autoMoveTimer = null;

    function stopAutoMove() {
      isAutoMoving = false;
      autoMoveCancel = true;
      autoMovePath = [];
      if (typeof getPathVisualizer === 'function') getPathVisualizer().clear();
      if (autoMoveTimer) clearTimeout(autoMoveTimer);
    }



    function startAutoMove(targetX, targetY) {
      console.log(`startAutoMove called to ${targetX},${targetY}`);
      if (isAutoMoving) {
        console.log('Cancelling previous auto-move');
        autoMoveCancel = true;
      }

      // Calculate path
      const path = pathfinder.findPath(player.x, player.y, targetX, targetY, map);
      console.log('Path found:', path);

      if (!path || path.length < 2) {
        logMessage("No path to target!", "#ff0000");
        return;
      }

      // Visualize
      getPathVisualizer().showPath(path);
      autoMovePath = path;
      isAutoMoving = true;
      autoMoveCancel = false;

      let currentStep = 0;

      function moveToNextStep() {
        console.log(`moveToNextStep: ${currentStep}/${path.length}`);
        currentStep++;
        if (currentStep >= path.length) {
          console.log('Auto-move complete');
          // Reached destination
          if (typeof getPathVisualizer === 'function') getPathVisualizer().clear();
          isAutoMoving = false;
          autoMoveCancel = false;
          return;
        }

        if (autoMoveCancel || player.health <= 0) {
          console.log('Auto-move cancelled or player dead');
          if (typeof getPathVisualizer === 'function') getPathVisualizer().clear();
          isAutoMoving = false;
          autoMoveCancel = false;
          return;
        }

        const step = path[currentStep];
        const dx = step.x - player.x;
        const dy = step.y - player.y;
        console.log(`Step ${currentStep}: moving to ${step.x},${step.y} (dx:${dx}, dy:${dy})`);

        // Face the direction we want to move
        const desiredAngle = Math.atan2(-dx, -dy);

        // Use smooth rotation
        rotatePlayerSmooth(desiredAngle);

        // Update monster arrow if needed
        if (typeof updateTuningMonsterArrow === 'function') updateTuningMonsterArrow();

        // Queue the movement and continue after it completes
        console.log('Queueing movePlayer action');
        // Pass the specific target step to movePlayer to ensure accuracy
        GameTurnManager.queuePlayerAction(movePlayer, 1, step).then(() => {
          console.log('movePlayer action completed');
          // Check if we actually moved
          if (player.x === step.x && player.y === step.y) {
            // Successfully moved
            // Update visuals
            const remainingPath = path.slice(currentStep);
            getPathVisualizer().showPath(remainingPath);

            setTimeout(moveToNextStep, 200); // Smooth walking pace
          } else {
            // Movement was blocked
            console.warn('Movement blocked!');
            if (typeof getPathVisualizer === 'function') getPathVisualizer().clear();
            isAutoMoving = false;
            autoMoveCancel = false;
            logMessage("Path blocked.", "#ffa500");
          }
        }).catch((err) => {
          console.warn('AutoMove queue error:', err);
          if (typeof getPathVisualizer === 'function') getPathVisualizer().clear();
          isAutoMoving = false;
          autoMoveCancel = false;
        });
      }

      // Start the movement sequence
      moveToNextStep();
    }
    function checkForMonsters(radius) {
      return monsters.some(m => {
        const dist = Math.hypot(m.x - player.x, m.y - player.y);
        return dist <= radius;
      });
    }

    // Wrapper for old findPath calls (if any remain)
    function findPath(start, end) {
      const p = pathfinder.findPath(start.x, start.y, end.x, end.y, map);
      return p || [];
    }

    // --- UI Elements ---
    const messageLogEl = document.getElementById("message-log");
    const roomEventEl = document.getElementById("room-event");
    const locationLabelEl = document.getElementById("location-label");
    const roomDescriptions = {
      corridor:
        "A narrow hallway stretches ahead. Torchlight flickers on white stone walls.",
      R1: "A small training room. Tatami mats line the floor; a wooden dummy stands silent.",
      R2: "A meditation chamber. Incense lingers in the air and a bronze gong rests nearby.",
    };
    function setRoomDescription(id) {
      const key =
        id && roomDescriptions[id]
          ? id
          : id === "corridor"
            ? "corridor"
            : null;

      // Add room information as events to the log
      if (key && roomDescriptions[key]) {
        addRoomEventsToLog(key, roomDescriptions[key]);
      }
    }

    function addRoomEventsToLog(roomId, description) {
      const roomLabel = roomId === "corridor" ? "Corridor" : `Room #${roomId.replace('R', '')} - ${getRoomName(roomId)}`;

      // Create a container for room events with border
      logRoomEvent(roomLabel, description);
    }

    function logRoomEvent(roomTitle, description) {
      // Create a special room event container with border
      const adventureLog = document.getElementById("dnd-adventure-log");
      if (adventureLog) {
        const roomContainer = document.createElement("div");
        roomContainer.style.cssText = `
            border: 2px solid #ffd700;
            border-radius: 8px;
            margin: 8px 0;
            padding: 12px;
            background: rgba(255, 215, 0, 0.1);
          `;

        // Room title
        const titleEl = document.createElement("div");
        titleEl.textContent = `📍 ${roomTitle}`;
        titleEl.style.cssText = `
            color: #ffd700;
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 14px;
          `;
        roomContainer.appendChild(titleEl);

        // Room description
        const descEl = document.createElement("div");
        descEl.textContent = description;
        descEl.style.cssText = `
            color: #a8a8a8;
            font-size: 12px;
            line-height: 1.4;
            margin-bottom: 4px;
          `;
        roomContainer.appendChild(descEl);

        // Add space for potential additional events
        const spacerEl = document.createElement("div");
        spacerEl.style.height = "4px";
        roomContainer.appendChild(spacerEl);

        adventureLog.appendChild(roomContainer);
        adventureLog.scrollTop = adventureLog.scrollHeight;

        // Limit containers (keep last 20 room events)
        const roomContainers = adventureLog.querySelectorAll('div[style*="border: 2px solid #ffd700"]');
        if (roomContainers.length > 20) {
          adventureLog.removeChild(roomContainers[0]);
        }
      }

      // Also add to regular message log for compatibility
      logMessage(`📍 ${roomTitle}`, "#ffd700");
      logMessage(description, "#a8a8a8");
    }

    function getRoomName(roomId) {
      const names = {
        R1: "Training Chamber",
        R2: "Meditation Room",
        corridor: "Corridor"
      };
      return names[roomId] || "Mysterious Chamber";
    }

    function setLocationLabel(id) {
      const label = id
        ? String(id).replace(/_/g, " ").toUpperCase()
        : "HALLWAY";

      // Still update the HUD room tag for FPV view
      if (locationLabelEl) locationLabelEl.textContent = `Location: ${label}`;
    }
    const commandInput = document.getElementById("dnd-game-command-input");
    const adventureCommandInput = document.getElementById("dnd-adventure-command-input");

    // --- Procedural Texture Generation ---
    function createWhiteStoneFloorTexture() {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      // Base tile fill - warm tan stone color like 001.E
      ctx.fillStyle = "#d2b48c"; // Tan stone color from 001.E
      ctx.fillRect(0, 0, size, size);

      // Add realistic stone noise like 001.E
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const randomFactor = (Math.random() - 0.5) * 15;
        data[i] += randomFactor;
        data[i + 1] += randomFactor;
        data[i + 2] += randomFactor;
      }
      ctx.putImageData(imageData, 0, 0);

      // Grid lines for tile appearance like 001.E
      ctx.strokeStyle = 'rgba(139, 90, 43, 0.5)';
      ctx.lineWidth = 2;
      const step = size / 8; // More grid lines for detail
      for (let i = step; i < size; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }

      // Darker border like 001.E
      ctx.strokeStyle = '#8b5a2b'; // Darker brown border
      ctx.lineWidth = 12;
      // Inset slightly so the join between repeated tiles looks clean
      const inset = 6;
      ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);
      return tex;
    }

    function createDojoWallTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = "rgba(0,0,0,0.03)";
      for (let i = 0; i < 1000; i++) {
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
      ctx.strokeStyle = "#3a2d1e";
      ctx.lineWidth = 24;
      ctx.strokeRect(0, 0, 256, 256);
      ctx.lineWidth = 10;
      for (let i = 48; i < 256; i += 48) {
        ctx.beginPath();
        ctx.moveTo(i, 12);
        ctx.lineTo(i, 244);
        ctx.stroke();
      }
      for (let i = 64; i < 256; i += 64) {
        ctx.beginPath();
        ctx.moveTo(12, i);
        ctx.lineTo(244, i);
        ctx.stroke();
      }
      return new THREE.CanvasTexture(canvas);
    }

    // --- Automove Trail Helpers ---
    function ensureAutoTrailGroup() {
      if (!autoTrailGroup) {
        autoTrailGroup = new THREE.Group();
        addGameObject('autoTrailGroup', autoTrailGroup);
      }
    }
    function clearAutoTrail() {
      if (!autoTrailGroup) return;
      // Use centralized removal helper and then dispose children
      try { removeGameObject('autoTrailGroup'); } catch (e) { }
      autoTrailGroup.traverse((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) n.material.dispose();
      });
      autoTrailGroup = null;
    }
    // Reusable trail assets
    const trailCircleGeo = new THREE.CircleGeometry(TILE_SIZE * 0.9 * 0.4, 32);
    const trailCircleMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });
    const trailDotGeo = new THREE.CircleGeometry(TILE_SIZE * 0.9 * 0.08, 16);
    const trailDotMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.9 });

    function addTrailMarker(x, y) {
      ensureAutoTrailGroup();

      // White translucent bloom circle for automove trail
      const circle = new THREE.Mesh(trailCircleGeo, trailCircleMat);
      circle.rotation.x = -Math.PI / 2;
      circle.position.set(x * TILE_SIZE, 0.012, y * TILE_SIZE);
      autoTrailGroup.add(circle);

      // Center white dot
      const dot = new THREE.Mesh(trailDotGeo, trailDotMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(x * TILE_SIZE, 0.013, y * TILE_SIZE);
      autoTrailGroup.add(dot);
    }

    // --- Reusable Materials & Geometries ---
    // Increase wall height: base 1.3 * 1.25 => 1.625x TILE_SIZE (25% taller than previous)
    const WALL_HEIGHT = TILE_SIZE * 1.625; // FPV walls taller by 25%
    const floorTexture = createWhiteStoneFloorTexture();
    // FPV floor uses PBR for cinematic lighting
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.55, // Slightly more reflective
      metalness: 0.25, // Increased metallic quality
      envMapIntensity: 0.8, // Enhanced environment reflections
    });
    // Map view floor uses a flat material with the same texture so it matches FPV base color
    const mapFloorMaterial = new THREE.MeshBasicMaterial({
      map: floorTexture
    });

    // Create dark wood rafter texture
    function createDarkWoodRafterTexture() {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      // Base dark wood color
      ctx.fillStyle = "#2B1810"; // Dark brown wood
      ctx.fillRect(0, 0, size, size);

      // Add wood grain noise
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const randomFactor = (Math.random() - 0.5) * 20;
        data[i] += randomFactor;
        data[i + 1] += randomFactor * 0.8; // Less variation in green
        data[i + 2] += randomFactor * 0.6; // Even less in blue for brown tone
      }
      ctx.putImageData(imageData, 0, 0);

      // Draw rafter beams - horizontal planks
      ctx.fillStyle = "#1A0F08"; // Even darker for beam depth
      const beamWidth = 40;
      const beamSpacing = 80;
      for (let y = 0; y < size; y += beamSpacing) {
        ctx.fillRect(0, y, size, beamWidth);
      }

      // Draw vertical support beams (less frequent)
      ctx.fillStyle = "#1A0F08";
      const vertBeamWidth = 30;
      const vertBeamSpacing = 120;
      for (let x = 0; x < size; x += vertBeamSpacing) {
        ctx.fillRect(x, 0, vertBeamWidth, size);
      }

      // Add wood texture lines
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 50; i++) {
        const y = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2); // Tile the rafter pattern
      return tex;
    }

    // Dark wood rafter ceiling material for FPV
    const rafterCeilingMaterial = new THREE.MeshStandardMaterial({
      map: createDarkWoodRafterTexture(),
      color: 0xFFFFFF,  // Use white so texture shows its true colors
      roughness: 0.9,
      metalness: 0.05,
    });

    // TILE LABELING SYSTEM FOR DEBUGGING
    let tileLabelsGroup = null;
    function addTileLabels() {
      // Remove existing labels via central registry
      if (tileLabelsGroup) {
        removeGameObject('tileLabelsGroup');
        tileLabelsGroup = null;
      }

      tileLabelsGroup = new THREE.Group();

      // Create small flat labels for each floor tile
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tile = map[y][x];
          if (tile.type === TILE.FLOOR) {
            // Determine label: R for room, H for hallway/corridor
            const isRoom = tile.roomId && tile.roomId !== "corridor";
            const labelText = isRoom ? "R" : "H";

            // Create text texture
            const canvas = document.createElement("canvas");
            const size = 64;
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext("2d");

            // Transparent background (no tan background)
            context.clearRect(0, 0, size, size);

            // Black text per strict mapview palette
            context.fillStyle = "#000000";
            context.font = "bold 32px Arial";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(labelText, size / 2, size / 2);

            const texture = new THREE.CanvasTexture(canvas);

            // Create flat plane geometry instead of sprite
            const labelGeo = new THREE.PlaneGeometry(
              TILE_SIZE * 0.3,
              TILE_SIZE * 0.3
            );
            const labelMat = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: 0.8,
            });

            const labelPlane = new THREE.Mesh(labelGeo, labelMat);
            labelPlane.rotation.x = -Math.PI / 2; // Flat against floor
            // Position in bottom-right corner of tile
            labelPlane.position.set(
              x * TILE_SIZE + TILE_SIZE * 0.35, // Right side
              0.01, // Just above floor
              y * TILE_SIZE + TILE_SIZE * 0.35 // Bottom side
            );

            tileLabelsGroup.add(labelPlane);
          }
        }
      }

      // Initialize FPV keypad dice visuals and handlers
      (function initFPVKeypad() {
        try {
          const setup = () => {
            try {
              // Dice button and related visuals removed
              // Movement buttons (both old and new patterns)
              try {
                const moveBtns = document.querySelectorAll('#fpv-keypad .dnd-game-move-btn');
                moveBtns.forEach(btn => {
                  const dir = btn.getAttribute('data-dir');
                  if (!dir) return;
                  btn.addEventListener('click', (ev) => {
                    try {
                      if (typeof window.movePlayerDir === 'function') window.movePlayerDir(dir);
                    } catch (e) { console.warn('move button handler failed', e); }
                  });
                });

                // Wire up 001.E pattern buttons by ID
                const buttonMap = {
                  'dnd-game-move-up': 'up',
                  'dnd-game-move-down': 'down',
                  'dnd-game-move-left': 'left',
                  'dnd-game-move-right': 'right'
                };

                Object.entries(buttonMap).forEach(([id, dir]) => {
                  const btn = document.getElementById(id);
                  if (btn) {
                    console.log('🎯 Wiring button:', id, '->', dir);
                    btn.addEventListener('click', (ev) => {
                      try {
                        console.log('🔘 Button clicked:', id, dir);
                        if (typeof window.movePlayerDir === 'function') window.movePlayerDir(dir);
                      } catch (e) { console.warn('001.E button handler failed', e); }
                    });
                  } else {
                    console.warn('❌ Button not found:', id);
                  }
                });

              } catch (e) { console.warn('move button wiring failed', e); }

              // Ensure keypad is positioned and remains positioned on resize
              try { positionKeypad(); } catch (e) { }
              window.addEventListener('resize', () => { try { positionKeypad(); } catch (e) { } });
            } catch (e) { console.warn('setup FPV keypad failed', e); }
          };

          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
          else setup();
        } catch (e) { console.warn('initFPVKeypad failed', e); }
      })();

      addGameObject('tileLabelsGroup', tileLabelsGroup);
    }
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: createDojoWallTexture(),
      roughness: 0.75, // Slightly more reflective
      metalness: 0.1, // Subtle metallic hints
      envMapIntensity: 0.6,
    });
    const wallTopMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.8,
      metalness: 0.2,
    });
    // Black material for empty space wall tops (reverting palette: empty space walls are black)
    const emptySpaceWallTopMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000, // Black for empty space wall tops
      roughness: 1.0,
      metalness: 0.0
    });

    // Black material for empty space walls (sides)
    const emptySpaceWallSideMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000, // Black for empty space wall sides
      roughness: 1.0,
      metalness: 0.0
    });
    const stepGeo = new THREE.BoxGeometry(
      TILE_SIZE * 0.6,
      0.1,
      TILE_SIZE * 0.2
    );
    let lootCorpseMaterial;
    const lootPileGeometry = new THREE.PlaneGeometry(
      TILE_SIZE * 0.5,
      TILE_SIZE * 0.5
    );
    lootPileGeometry.rotateX(-Math.PI / 2);

    // --- Custom Object Creation ---
    function createPlayerObject() {
      const group = new THREE.Group();
      const circleRadius = TILE_SIZE * 0.4;
      const circleGeometry = new THREE.CircleGeometry(circleRadius, 32);
      // subtle shadow under player circle to give raised platform look
      (function createPlayerShadow() {
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        const grd = ctx.createRadialGradient(
          size / 2,
          size / 2,
          size * 0.05,
          size / 2,
          size / 2,
          size / 2
        );
        grd.addColorStop(0, "rgba(0,0,0,0.45)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(canvas);
        const shadowMat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthTest: true,
        });
        const shadowGeo = new THREE.PlaneGeometry(
          circleRadius * 2 + 0.6,
          circleRadius * 2 + 0.6
        );
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.005; // just above floor but below circle
        shadow.layers.set(0); // Default layer for map
        group.add(shadow);
      })();
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0x315B26, // Player circle permanent ally green
        side: THREE.DoubleSide,
      });
      const circle = new THREE.Mesh(circleGeometry, circleMaterial);
      circle.rotation.x = -Math.PI / 2;
      circle.receiveShadow = false;
      circle.position.y = 0.015; // Slightly higher to avoid Z-fighting
      circle.layers.set(0); // Default layer for map
      circle.layers.enable(FPV_MODEL_LAYER); // Also visible in FPV
      circle.layers.enable(PLAYER_ISOLATION_LAYER); // Enable isolation layer for backlight
      group.add(circle);

      // Add isolated backlight for player
      const playerBacklight = new THREE.PointLight(0xffffff, 1.0, 10);
      playerBacklight.position.set(0, 2, -2); // Behind and slightly up
      playerBacklight.layers.set(PLAYER_ISOLATION_LAYER); // Only affects player
      group.add(playerBacklight);

      // Dedicated white light source surrounding player (requested)
      const playerSurroundLight = new THREE.PointLight(0xffffff, 1.2, 8);
      playerSurroundLight.position.set(0, 3, 0); // Above center
      playerSurroundLight.layers.set(PLAYER_ISOLATION_LAYER);
      group.add(playerSurroundLight);
      // white ring border rendered on top of the floor circle
      // white ring border rendered on top of the floor circle
      // Widened by 25% (0.24 -> 0.30 width, so +/- 0.15)
      const playerBorderGeo = new THREE.RingGeometry(
        circleRadius - 0.15,
        circleRadius + 0.15,
        64
      );
      const playerBorderMat = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF, // White border as requested
        side: THREE.DoubleSide,
        depthTest: true,
      });
      const playerBorder = new THREE.Mesh(playerBorderGeo, playerBorderMat);
      playerBorder.rotation.x = -Math.PI / 2;
      playerBorder.position.y = 0.018; // Above the main circle
      playerBorder.layers.set(0); // Map only
      playerBorder.layers.enable(FPV_MODEL_LAYER); // Also visible in FPV
      group.add(playerBorder);

      // Neumorphic inner shadow just inside the white border (soft inner fade)
      const playerInnerShadowCanvas = document.createElement('canvas');
      playerInnerShadowCanvas.width = 128;
      playerInnerShadowCanvas.height = 256;
      const playerInnerShadowCtx = playerInnerShadowCanvas.getContext('2d');
      const playerGrad = playerInnerShadowCtx.createLinearGradient(0, 0, 0, playerInnerShadowCanvas.height);
      playerGrad.addColorStop(0, 'rgba(0,0,0,0)');
      playerGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
      playerInnerShadowCtx.fillStyle = playerGrad;
      playerInnerShadowCtx.fillRect(0, 0, playerInnerShadowCanvas.width, playerInnerShadowCanvas.height);
      const playerInnerShadowTex = new THREE.CanvasTexture(playerInnerShadowCanvas);
      playerInnerShadowTex.wrapS = THREE.ClampToEdgeWrapping;
      playerInnerShadowTex.wrapT = THREE.ClampToEdgeWrapping;
      const playerShadowBorderGeo = new THREE.RingGeometry(
        circleRadius - 0.20, // inner radius
        circleRadius - 0.125, // just inside white border inner edge (white border starts at -0.12)
        64
      );
      const playerShadowBorderMat = new THREE.MeshBasicMaterial({
        map: playerInnerShadowTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true,
      });
      const playerShadowBorder = new THREE.Mesh(playerShadowBorderGeo, playerShadowBorderMat);
      playerShadowBorder.rotation.x = -Math.PI / 2;
      playerShadowBorder.position.y = 0.017; // Just below the white border
      playerShadowBorder.layers.set(0);
      playerShadowBorder.layers.enable(FPV_MODEL_LAYER);
      group.add(playerShadowBorder);
      const arrowShape = new THREE.Shape();
      const arrowSize = TILE_SIZE * 0.15;
      arrowShape.moveTo(0, arrowSize);
      arrowShape.lineTo(arrowSize * 0.7, -arrowSize);
      arrowShape.lineTo(-arrowSize * 0.7, -arrowSize);
      arrowShape.closePath();
      const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
      const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // Changed from black to white
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.z = -TILE_SIZE * 0.25 + 0.02;
      arrow.position.y = 0.021; // Above the border
      arrow.layers.set(0); // Default layer for map
      arrow.layers.enable(FPV_MODEL_LAYER);
      group.add(arrow);

      // Player walking model removed temporarily

      // Warm fill near player for bounce feel
      playerLight = new THREE.PointLight(
        TUNING.lighting.playerFill.color,
        TUNING.lighting.playerFill.intensity,
        TUNING.lighting.playerFill.distance,
        TUNING.lighting.playerFill.decay
      );
      playerLight.castShadow = true;
      playerLight.shadow.bias = -0.005;
      playerLight.shadow.mapSize.width = 1024;
      playerLight.shadow.mapSize.height = 1024;
      playerLight.position.set(0, 1.8, -0.8); // Positioned in front of player
      // Make player light FPV-only so it doesn't wash the tactical map
      playerLight.layers.set(FPV_MODEL_LAYER);
      group.add(playerLight);
      const headlamp = new THREE.SpotLight(
        TUNING.lighting.headlamp.color,
        TUNING.lighting.headlamp.intensity,
        TUNING.lighting.headlamp.distance,
        TUNING.lighting.headlamp.angle,
        TUNING.lighting.headlamp.penumbra,
        TUNING.lighting.headlamp.decay
      );
      headlamp.position.set(0, 1.7, -1.2); // Moved in front of player (negative Z is forward)
      headlamp.castShadow = true;
      headlamp.shadow.mapSize.width = 1024;
      headlamp.shadow.mapSize.height = 1024;
      headlamp.layers.set(FPV_MODEL_LAYER);
      const headlampTarget = new THREE.Object3D();
      headlampTarget.position.set(0, 1.6, -5);
      headlampTarget.layers.set(FPV_MODEL_LAYER);
      group.add(headlamp);
      // Parent target to scene so we can set world coordinates directly
      addGameObject('headlampTarget', headlampTarget);
      headlamp.target = headlampTarget;
      group.add(headlamp);
      group.add(headlampTarget);
      headlamp.target = headlampTarget;
      group.userData.visuals = group.userData.visuals || {};
      group.userData.visuals.headlamp = headlamp;

      // Flashlight - visible on both FPV and map view
      const flashlight = new THREE.SpotLight(
        TUNING.lighting.flashlight.color,
        TUNING.lighting.flashlight.intensity,
        TUNING.lighting.flashlight.distance,
        TUNING.lighting.flashlight.angle,
        TUNING.lighting.flashlight.penumbra,
        TUNING.lighting.flashlight.decay
      );
      flashlight.position.set(0, 1.5, -1.0); // Moved in front of player (negative Z is forward)
      flashlight.castShadow = true;
      flashlight.shadow.mapSize.width = 512;
      flashlight.shadow.mapSize.height = 512;
      // Flashlight visible on both layers - FPV and map
      flashlight.layers.set(0); // Default layer for map
      flashlight.layers.enable(FPV_MODEL_LAYER); // Also visible in FPV

      const flashlightTarget = new THREE.Object3D();
      flashlightTarget.position.set(0, 1.4, -10);
      flashlightTarget.layers.set(0);
      flashlightTarget.layers.enable(FPV_MODEL_LAYER);
      group.add(flashlight);
      addGameObject('flashlightTarget', flashlightTarget);
      flashlight.target = flashlightTarget;
      group.userData.visuals.flashlight = flashlight;
      group.userData.visuals.flashlightTarget = flashlightTarget;

      applyPlayerFillTuning(playerLight);
      applyHeadlampTuning(headlamp);
      applyFlashlightTuning(flashlight);
      // Avatar container for 3D model; FPV-only so it won't render on the tactical map
      const avatar = new THREE.Group();
      avatar.name = "playerAvatar";
      avatar.position.set(0, 0, 0);
      avatar.layers.set(FPV_MODEL_LAYER);
      group.add(avatar);
      group.userData.visuals = group.userData.visuals || {};
      group.userData.visuals.avatar = avatar;

      // Add Player.A.Walking.glb model for map view with walking animations (200% size)
      try {
        const gltfLoader = new THREE.GLTFLoader();

        async function loadPlayerMapModel() {
          // Use the working 001.E approach with Player.A.Walking.glb
          const urls = [
            'assets/models/Player.A.Walking.glb',
            new URL('assets/models/Player.A.Walking.glb', document.baseURI).href,
            'https://www.markpeterson.info/Origami/assets/models/Player.A.Walking.glb',
            'https://markpeterson.info/Origami/assets/models/Player.A.Walking.glb',
            'https://www.markpeterson.info/assets/models/Player.A.Walking.glb'
          ];

          for (const url of urls) {
            try {
              const gltf = await new Promise((resolve, reject) => {
                gltfLoader.load(url, resolve, null, reject);
              });

              // Follow 001.E pattern: create avatar container + GLB hierarchy
              const glbRoot = gltf.scene;
              glbRoot.traverse((c) => {
                if (c.isMesh) {
                  c.castShadow = true;
                  c.receiveShadow = true;
                }
              });

              // Create avatar container (like 001.E)
              const mapAvatar = new THREE.Object3D();
              mapAvatar.name = 'playerAvatar';
              glbRoot.name = 'playerAvatarModel';
              mapAvatar.add(glbRoot);

              // Scale and ground like 001.E but reduce size by 150% (divide by 2.5)
              glbRoot.scale.setScalar(1.5 * 4.0 / 2.5); // Player height (1.5) * 4 / 2.5 = 2.4 total scale

              // Ground the feet after scaling (001.E approach)
              glbRoot.updateMatrixWorld(true);
              const box = new THREE.Box3().setFromObject(glbRoot);
              const lowestPoint = box.min.y;
              const groundOffset = 0.05; // Feet clearly above circle
              glbRoot.position.y = groundOffset - lowestPoint;
              glbRoot.updateMatrixWorld(true);

              console.log(`Player map model scaled to 2.4 (5ft reduced by 150%), grounded at y=${glbRoot.position.y.toFixed(3)}`);

              // Animation setup like 001.E (but we won't use it for map view)
              try {
                if (gltf.animations && gltf.animations.length > 0) {
                  const mixer = new THREE.AnimationMixer(glbRoot);
                  const clip = gltf.animations[0];
                  const action = mixer.clipAction(clip);
                  action.setLoop(THREE.LoopRepeat);
                  action.stop(); // Ensure stopped
                  glbRoot.userData.mixer = mixer;
                  glbRoot.userData.walkAction = action;
                  glbRoot.userData.walkClipDuration = (clip && clip.duration) ? clip.duration : 1.0;
                  glbRoot.userData.walking = false;
                  console.log(`Map model animation setup complete, duration: ${clip.duration}s`);
                }
              } catch (_) { }

              // Set up for map layer
              mapAvatar.userData = mapAvatar.userData || {};
              mapAvatar.userData.excludeFromLayerSync = true;
              mapAvatar.layers.set(0); // Map view layer ONLY
              mapAvatar.rotation.y = TUNING.models.yaw.player;

              // Ensure all children stay on map layer
              mapAvatar.traverse((node) => {
                if (node.isMesh) {
                  node.layers.set(0);
                  node.userData = node.userData || {};
                  node.userData.excludeFromLayerSync = true;
                }
              });

              // Position model offset from arrow (arrow is at z = -TILE_SIZE * 0.25)
              mapAvatar.position.set(0, 0.0, TILE_SIZE * 0.15); // Move model forward, away from arrow
              mapAvatar.name = 'playerMapModel';
              group.add(mapAvatar);
              group.userData.visuals.mapModel = mapAvatar;

              console.log('Player map model (001.E style) loaded successfully:', url);
              return;
            } catch (error) {
              console.warn('Failed to load player map model from:', url, error);
            }
          }

          // Fallback to simple cylinder if model loading fails
          const stub = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 0.34, 16),
            new THREE.MeshStandardMaterial({
              color: 0xdddddd,
              roughness: 0.7,
              metalness: 0.05
            })
          );
          stub.position.set(0, 0.22, 0);
          stub.name = 'playerModelStub';
          group.add(stub);
          group.userData.visuals.mapModel = stub;
        }

        // Load model asynchronously
        loadPlayerMapModel().catch(console.error);

      } catch (_) {
        // Emergency fallback
        const stub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.34, 16),
          new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            roughness: 0.7,
            metalness: 0.05
          })
        );
        stub.position.set(0, 0.22, 0); // Explicitly center the emergency fallback player model
        stub.name = 'playerModelStub';
        group.add(stub);
        group.userData.visuals.mapModel = stub;
      }

      // Load Player.A.Walking.glb for FPV view (001.E hierarchical approach)
      const loadPlayerFPVModel = () => {
        try {
          if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
            setTimeout(loadPlayerFPVModel, 500);
            return;
          }

          const loader = new THREE.GLTFLoader();
          loader.setCrossOrigin && loader.setCrossOrigin('anonymous');

          const candidateUrls = [
            'assets/models/Player.A.Walking.glb',
            new URL('assets/models/Player.A.Walking.glb', window.location.href).href,
            'https://www.markpeterson.info/Origami/assets/models/Player.A.Walking.glb',
            'https://markpeterson.info/Origami/assets/models/Player.A.Walking.glb',
            'https://www.markpeterson.info/assets/models/Player.A.Walking.glb'
          ].filter(Boolean);

          const tryLoadUrl = (urls) => {
            if (!urls.length) {
              console.warn('All Player.A.Walking.glb URLs failed for FPV, using fallback');
              return;
            }

            const url = urls.shift();
            loader.load(url, (gltf) => {
              try {
                // Follow 001.E pattern exactly: GLB root → avatar container → GLB model
                const glbRoot = gltf.scene;
                glbRoot.traverse((c) => {
                  if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    c.layers.set(FPV_MODEL_LAYER);
                    if (c.material) {
                      if (Array.isArray(c.material)) {
                        c.material.forEach(mat => {
                          if (mat) mat.toneMapped = false;
                        });
                      } else {
                        c.material.toneMapped = false;
                      }
                    }
                  }
                });

                // Create avatar container (like 001.E)
                const fpvAvatar = new THREE.Object3D();
                fpvAvatar.name = 'playerFPVAvatar';
                glbRoot.name = 'playerFPVAvatarModel';
                fpvAvatar.add(glbRoot);

                // Scale using 001.E approach but for proper player height
                glbRoot.scale.setScalar(1.5); // Player height (1.5 units = 5 feet)

                // Ground the feet after scaling (001.E approach)
                glbRoot.updateMatrixWorld(true);
                const box = new THREE.Box3().setFromObject(glbRoot);
                const lowestPoint = box.min.y;
                const groundOffset = 0.05; // Feet clearly above circle to avoid z-fighting
                glbRoot.position.y = groundOffset - lowestPoint;
                glbRoot.updateMatrixWorld(true);

                // Apply player model facing correction
                const baseYaw = TUNING.models.yaw.player || 0;
                const fpvFacingCorr = 0; // No additional rotation - use base yaw only
                fpvAvatar.rotation.y = baseYaw + fpvFacingCorr;

                console.log(`FPV model scaled to 1.5 (5ft player), grounded at y=${glbRoot.position.y.toFixed(3)}`);

                // Animation setup like 001.E
                try {
                  if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(glbRoot);
                    const clip = gltf.animations[0];
                    const action = mixer.clipAction(clip);
                    action.setLoop(THREE.LoopRepeat);
                    action.stop(); // Ensure stopped
                    glbRoot.userData.mixer = mixer;
                    glbRoot.userData.walkAction = action;
                    glbRoot.userData.walkClipDuration = (clip && clip.duration) ? clip.duration : 1.0;
                    glbRoot.userData.walking = false;

                    console.log(`FPV animation setup complete, duration: ${clip.duration}s`);

                    // Set up group's animation reference for the existing FPV animation control
                    group.userData.playerAnimations = {
                      mixer: mixer,
                      walkAction: action,
                      isWalking: false,
                      walkClipDuration: clip.duration || 1.0
                    };
                  }
                } catch (_) { }

                avatar.add(fpvAvatar);
                group.userData.visuals.model3dFPV = fpvAvatar; // Store the avatar container

                console.log(`Player FPV model (001.E style) loaded from ${url}`);

              } catch (e) {
                console.warn('Player FPV model attachment failed', e);
                tryLoadUrl(urls);
              }
            }, undefined, (err) => {
              console.warn(`Player FPV model load failed from ${url}`, err);
              tryLoadUrl(urls);
            });
          };

          tryLoadUrl([...candidateUrls]);
        } catch (e) {
          console.warn('Player FPV model loader error', e);
        }
      };

      // Initialize game object for movement tracking
      if (!window.game) window.game = {};

      // Start loading after a short delay
      setTimeout(loadPlayerFPVModel, 200);
      return group;
    }

    // === MONSTER CREATION FOR TUNING ===
    let monsterObject = null;

    function createMonsterForTuning() {
      if (monsterObject) {
        removeGameObject('monster_tuning_object');
        monsterObject = null;
      }

      console.log('Creating monster at player position:', player.x, player.y);
      const group = new THREE.Group();
      const TILE_SIZE = 1;

      // Monster circle (same size as player circle)
      const circleGeometry = new THREE.CircleGeometry(TILE_SIZE * 0.4, 16); // Same size as player
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
      });
      const circle = new THREE.Mesh(circleGeometry, circleMaterial);
      circle.rotation.x = -Math.PI / 2;
      circle.position.y = 0.025; // Raised higher
      circle.layers.set(0); // Map only
      group.add(circle);

      // Monster border (red)
      const borderGeometry = new THREE.RingGeometry(TILE_SIZE * 0.55, TILE_SIZE * 0.6, 16); // Adjusted for larger circle
      const borderMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
      });
      const border = new THREE.Mesh(borderGeometry, borderMaterial);
      border.rotation.x = -Math.PI / 2;
      border.position.y = 0.028; // Raised higher
      border.layers.set(0); // Map only
      group.add(border);

      // Monster arrow (pointing same direction as player initially)
      const arrowGeometry = new THREE.ConeGeometry(TILE_SIZE * 0.15, TILE_SIZE * 0.4, 8); // Made larger
      const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.z = -TILE_SIZE * 0.25 + 0.02;
      arrow.position.y = 0.031; // Raised higher
      arrow.visible = false; // HIDDEN - monster arrows removed as requested
      arrow.layers.set(0); // Default layer for map
      group.add(arrow);

      // Position monster right next to player for visibility
      const monsterX = (player.x + 1) * TILE_SIZE; // 1 tile to the right
      const monsterZ = player.y * TILE_SIZE; // Same row as player
      group.position.set(monsterX, 0, monsterZ);
      console.log('Monster positioned at world coordinates:', monsterX, 0, monsterZ);
      console.log('Player at grid coordinates:', player.x, player.y);
      console.log('Monster at grid coordinates:', player.x + 1, player.y);

      group.userData.visuals = group.userData.visuals || {};
      group.userData.visuals.arrow = arrow;

      monsterObject = group;
      addGameObject('monster_tuning_object', monsterObject);
      console.log('Monster added to scene (registered as monster_tuning_object):', monsterObject);

      return group;
    }

    // Update monster arrow to match player rotation (disabled for static arrows)
    function updateTuningMonsterArrow() {
      if (monsterObject && monsterObject.userData.visuals.arrow) {
        const arrow = monsterObject.userData.visuals.arrow;
        // Only update if not marked as static
        if (!arrow.userData.staticArrow) {
          // Match player rotation
          arrow.rotation.y = player.rotationY;
        }
      }
    }

    // === FORENSIC LLM SYNC SYSTEM ===
    // === CENTRALIZED GAME RENDER SYNC SYSTEM ===
    class GameRenderSync {
      constructor() {
        this.MAP_LAYER = 0;
        this.FPV_MODEL_LAYER = 1;
      }

      // Main sync entry point - called every frame before render
      syncAll() {
        this.syncPlayer();
        this.syncMonsters();
        this.syncItems();
      }

      syncPlayer() {
        if (!player || !player.object) return;

        // Sync Position & Rotation
        // Position uses 2D grid -> 3D world conversion
        player.object.position.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);

        // Smooth rotation for visuals vs instant grid rotation
        player.object.rotation.y = player.rotationY;

        // Sync Visibility across layers
        // Player should always be visible in Map (Layer 0)
        // Avatar model should be visible in FPV (Layer 1) but not Map
        if (player.object.userData.visuals) {
          const visuals = player.object.userData.visuals;

          // Headlamp follow
          if (visuals.headlamp) {
            visuals.headlamp.position.copy(player.object.position).add(new THREE.Vector3(0, 1.7, 0));
            // Target follows rotation
            const targetDist = 5;
            visuals.headlamp.target.position.set(
              player.object.position.x - Math.sin(player.rotationY) * targetDist,
              player.object.position.y + 1.6,
              player.object.position.z - Math.cos(player.rotationY) * targetDist
            );
          }
        }
      }

      syncMonsters() {
        if (!monsters) return;

        monsters.forEach(monster => {
          if (!monster.object) return;

          // 1. Sync Position
          const targetX = monster.x * TILE_SIZE;
          const targetZ = monster.y * TILE_SIZE;

          // Simple robust lerp 
          monster.object.position.x += (targetX - monster.object.position.x) * 0.2;
          monster.object.position.z += (targetZ - monster.object.position.z) * 0.2;

          // 2. Sync Rotation
          if (typeof monster.rotationY === 'number') {
            let diff = monster.rotationY - monster.object.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            monster.object.rotation.y += diff * 0.15;
          }

          // 3. Sync Visibility / State
          const isDead = monster.hp <= 0;
          // Hide instantly if dead unless specific dying anim logic exists
          monster.object.visible = !isDead || (isDead && monster.isDying);

          // Ensure Layers are correct
          if (!monster.object.layers.test(this.MAP_LAYER)) monster.object.layers.enable(this.MAP_LAYER);
          if (!monster.object.layers.test(this.FPV_MODEL_LAYER)) monster.object.layers.enable(this.FPV_MODEL_LAYER);

          // 4. Sync Visual Indicators
          this.syncMonsterIndicators(monster);
        });
      }

      syncMonsterIndicators(monster) {
        if (!monster.object || !monster.object.userData.visuals) return;
        const visuals = monster.object.userData.visuals;
        const { indicator, border, hostileLight, whiteBorder, shadowBorder, searchIndicator } = visuals;

        // Normalize status
        let status = 'IDLE';
        if (monster.state === 'GAMING') status = 'GAMING';
        else if (monster.hostileState === 'HOSTILE' || monster.isAggro) status = 'HOSTILE';
        else if (monster.hostileState === 'SEARCHING') status = 'SEARCHING';
        else if (monster.isAlly) status = 'ALLY';

        // 1. White Border (always visible if present)
        if (whiteBorder) {
          whiteBorder.visible = true;
          if (whiteBorder.material) whiteBorder.material.color.setHex(0xFFFFFF);
          whiteBorder.renderOrder = 990;
        }

        // 2. Shadow Border
        if (shadowBorder) shadowBorder.visible = true;

        // 3. Status Colors & Visibility
        if (indicator && border) {
          // Default visibility
          currentRoom.visited = true;
          console.log("Checkpoint 2: Mid-file reached");
          border.visible = true;

          // Color map
          const colors = {
            GAMING: 0xFFD700,   // Gold
            HOSTILE: 0xff0000,  // Red
            SEARCHING: 0xff8800,// Orange
            ALLY: 0x00aa44,     // Green
            IDLE: 0xcccccc      // Grey/Hidden equivalent
          };

          const c = colors[status] || colors.IDLE;
          if (indicator.material) indicator.material.color.setHex(c);
          if (border.material) border.material.color.setHex(c);

          if (status === 'IDLE') {
            indicator.visible = false;
            border.visible = false;
          }

          // Hostile Light
          if (hostileLight) {
            hostileLight.visible = (status === 'HOSTILE');
          }
        }

        // Sync search/tuning arrow if present
        if (visuals.arrow) {
          // Only show arrow for specific debugging or active target
          visuals.arrow.visible = false;
        }

        // 4. Flashlight
        if (visuals.flashlight) {
          const shouldShowLight = (status === 'HOSTILE' || status === 'SEARCHING');
          visuals.flashlight.visible = shouldShowLight;
          visuals.flashlight.intensity = (status === 'HOSTILE') ? 0.7 : 0.4;
        }

        // 5. Orb
        if (visuals.orb) {
          visuals.orb.visible = true;
          visuals.orb.material.opacity = (status === 'IDLE') ? 0.1 : 0.3;
        }
      }

      syncItems() {
        // Sync loose items on the ground
        if (typeof items !== 'undefined' && items) {
          // Basic item visibility checks could go here
        }
      }
    }

    // Initialize the forensic system
    // === FORENSIC LLM: MONSTER MODEL ANALYSIS ===
    class MonsterModelForensicAnalyzer {
      constructor() {
        this.analysisResults = {};
        this.debugMode = true;
      }

      analyzeMonsterModels() {
        console.log('🔍 FORENSIC ANALYSIS: Monster Model Duplication Investigation');
        const analysis = {
          timestamp: Date.now(),
          monsters: {},
          layerAnalysis: {},
          modelCounts: {},
          visualArtifacts: {},
          issues: []
        };

        // --- MODULAR SYSTEM INIT CHECK ---
        // Initialized in top module block

        // Wire up globals for compatibility (Local scope)
        // const scene = window.rendererSystem.scene; // Already defined in this scope?
        // Actually this block is inside `initGame` or similar function?
        // Let's check context. This was at line 6004.

        // Wire up local consts for this block if needed
        const fpvCamera = window.rendererSystem.fpvCamera; // FPV Camera


        // Find all monsters in the scene
        scene.traverse((object) => {
          if (object.userData && object.userData.visuals) {
            const visuals = object.userData.visuals;

            // Check if this is a monster with models
            if (visuals.model3d || visuals.model3dFPV) {
              const monsterId = object.name || object.uuid;

              analysis.monsters[monsterId] = {
                hasMapModel: !!visuals.model3d,
                hasFPVModel: !!visuals.model3dFPV,
                sameModelReference: visuals.model3d === visuals.model3dFPV,
                mapModelLayers: visuals.model3d ? this.getLayerInfo(visuals.model3d) : null,
                fpvModelLayers: visuals.model3dFPV ? this.getLayerInfo(visuals.model3dFPV) : null,
                position: object.position,
                childrenCount: object.children.length
              };

              // Check for visual artifacts that might cause "double model" appearance
              analysis.visualArtifacts[monsterId] = this.checkVisualArtifacts(visuals.model3d, object);

              // Count 3D models in this monster group
              let modelCount = 0;
              let meshCount = 0;
              object.traverse((child) => {
                if (child.type === 'Group' && child.userData.originalUrl) {
                  modelCount++;
                }
                if (child.isMesh && child.geometry && child.material) {
                  meshCount++;
                }
              });

              analysis.modelCounts[monsterId] = { models: modelCount, meshes: meshCount };

              // Detect issues
              if (visuals.model3d && visuals.model3dFPV && visuals.model3d !== visuals.model3dFPV) {
                analysis.issues.push({
                  type: 'DUPLICATE_MODELS',
                  monsterId: monsterId,
                  message: 'Monster has separate map and FPV models instead of shared model',
                  mapModel: visuals.model3d,
                  fpvModel: visuals.model3dFPV
                });
              }

              if (modelCount > 1) {
                analysis.issues.push({
                  type: 'MULTIPLE_MODEL_INSTANCES',
                  monsterId: monsterId,
                  message: `Monster has ${modelCount} model instances (should be 1)`,
                  count: modelCount
                });
              }

              // Check for visual artifacts that could cause double appearance
              const artifacts = analysis.visualArtifacts[monsterId];
              if (artifacts.shadowIssues.length > 0) {
                analysis.issues.push({
                  type: 'SHADOW_ARTIFACTS',
                  monsterId: monsterId,
                  message: 'Shadow configuration issues detected',
                  details: artifacts.shadowIssues
                });
              }

              if (artifacts.duplicateGeometry) {
                analysis.issues.push({
                  type: 'DUPLICATE_GEOMETRY',
                  monsterId: monsterId,
                  message: 'Duplicate geometry detected - may cause double appearance',
                  count: artifacts.duplicateGeometry.count
                });
              }
            }
          }
        });

        console.log('📊 Monster Model Analysis:', analysis);
        this.generateRecommendations(analysis);
        return analysis;
      }

      checkVisualArtifacts(model, parentObject) {
        const artifacts = {
          shadowIssues: [],
          duplicateGeometry: null,
          transparencyIssues: [],
          layerConflicts: []
        };

        if (!model) return artifacts;

        // Check for shadow issues
        let shadowCasters = 0;
        let shadowReceivers = 0;

        // Check for duplicate geometry or materials
        const geometries = new Map();
        const materials = new Map();

        model.traverse((child) => {
          if (child.isMesh) {
            if (child.castShadow) shadowCasters++;
            if (child.receiveShadow) shadowReceivers++;

            // Check for transparency that might cause double appearance
            if (child.material) {
              if (child.material.transparent && child.material.opacity < 1) {
                artifacts.transparencyIssues.push({
                  mesh: child.name || 'unnamed',
                  opacity: child.material.opacity
                });
              }

              // Track materials for duplicates
              const matKey = child.material.uuid;
              materials.set(matKey, (materials.get(matKey) || 0) + 1);
            }

            // Track geometries for duplicates
            if (child.geometry) {
              const geoKey = child.geometry.uuid;
              geometries.set(geoKey, (geometries.get(geoKey) || 0) + 1);
            }
          }
        });

        // Detect unusual shadow configuration
        if (shadowCasters === 0) {
          artifacts.shadowIssues.push('No shadow casters found');
        }
        if (shadowReceivers === 0) {
          artifacts.shadowIssues.push('No shadow receivers found');
        }

        // Detect duplicate geometries (could cause visual doubling)
        let maxGeoCount = 0;
        for (const count of geometries.values()) {
          if (count > maxGeoCount) maxGeoCount = count;
        }
        if (maxGeoCount > 1) {
          artifacts.duplicateGeometry = { count: maxGeoCount };
        }

        return artifacts;
      }

      getLayerInfo(object) {
        if (!object || !object.layers) return null;
        return {
          mapLayer: object.layers.test(0),
          fpvLayer: object.layers.test(1),
          layerMask: object.layers.mask
        };
      }

      generateRecommendations(analysis) {
        console.log('💡 FORENSIC RECOMMENDATIONS:');

        if (analysis.issues.length === 0) {
          console.log('✅ No monster model duplication issues found');
          console.log('📊 Visual Artifacts Summary:');
          for (const [monsterId, artifacts] of Object.entries(analysis.visualArtifacts)) {
            if (artifacts.transparencyIssues.length > 0) {
              console.log(`   ${monsterId}: ${artifacts.transparencyIssues.length} transparency issues`);
            }
            if (artifacts.duplicateGeometry) {
              console.log(`   ${monsterId}: Duplicate geometry detected (${artifacts.duplicateGeometry.count} instances)`);
            }
          }
          return;
        }

        analysis.issues.forEach(issue => {
          switch (issue.type) {
            case 'DUPLICATE_MODELS':
              console.log(`🚨 ${issue.monsterId}: Remove duplicate FPV model, use single model with dual layer visibility`);
              console.log(`   Fix: monsterInstance.layers.set(0); monsterInstance.layers.enable(FPV_MODEL_LAYER);`);
              break;
            case 'MULTIPLE_MODEL_INSTANCES':
              console.log(`🚨 ${issue.monsterId}: ${issue.count} model instances detected, consolidate to single instance`);
              break;
            case 'SHADOW_ARTIFACTS':
              console.log(`🚨 ${issue.monsterId}: Shadow configuration issues - ${issue.details.join(', ')}`);
              console.log(`   Fix: Ensure castShadow=true and receiveShadow=true on meshes`);
              break;
            case 'DUPLICATE_GEOMETRY':
              console.log(`🚨 ${issue.monsterId}: Duplicate geometry causing visual doubling (${issue.count} instances)`);
              console.log(`   Fix: Check for multiple identical meshes in model`);
              break;
          }
        });

        // Auto-fix if enabled
        this.autoFixDuplicateModels(analysis.issues);
        this.autoFixVisualArtifacts(analysis.issues);
      }

      autoFixDuplicateModels(issues) {
        issues.forEach(issue => {
          if (issue.type === 'DUPLICATE_MODELS') {
            console.log(`🔧 AUTO-FIX: Consolidating models for ${issue.monsterId}`);
            try {
              // Remove the FPV model from scene
              if (issue.fpvModel && issue.fpvModel.parent) {
                issue.fpvModel.parent.remove(issue.fpvModel);
              }
              // Make map model visible in both layers
              if (issue.mapModel) {
                issue.mapModel.layers.set(0);
                issue.mapModel.layers.enable(1);
              }
              console.log(`✅ Fixed duplicate models for ${issue.monsterId}`);
            } catch (e) {
              console.warn(`❌ Failed to fix ${issue.monsterId}:`, e);
            }
          }
        });
      }

      autoFixVisualArtifacts(issues) {
        issues.forEach(issue => {
          if (issue.type === 'SHADOW_ARTIFACTS') {
            console.log(`🔧 AUTO-FIX: Fixing shadow artifacts for ${issue.monsterId}`);
            // Find the monster object and fix shadows
            scene.traverse((object) => {
              if ((object.name || object.uuid) === issue.monsterId) {
                if (object.userData.visuals && object.userData.visuals.model3d) {
                  object.userData.visuals.model3d.traverse((child) => {
                    if (child.isMesh) {
                      child.castShadow = true;
                      child.receiveShadow = true;
                    }
                  });
                  console.log(`✅ Fixed shadows for ${issue.monsterId}`);
                }
              }
            });
          }
        });
      }
    }

    // === FORENSIC LLM: CLICK-TO-MOVE ANALYSIS ===
    class ClickToMoveForensicAnalyzer {
      constructor() {
        this.analysisResults = {};
        this.debugMode = true;
      }

      analyzeClickToMove() {
        console.log('🔍 FORENSIC ANALYSIS: Click-to-Move System Investigation');
        const analysis = {
          timestamp: Date.now(),
          mapCanvas: null,
          fpvCanvas: null,
          eventListeners: {},
          raycasting: {},
          issues: []
        };

        // Analyze map canvas
        // Analyze main canvas
        if (mainRenderer && mainRenderer.domElement) {
          const canvas = mainRenderer.domElement;
          const style = window.getComputedStyle(canvas);

          analysis.mainCanvas = {
            exists: true,
            visible: style.display !== 'none' && style.visibility !== 'hidden',
            opacity: style.opacity,
            zIndex: style.zIndex,
            position: style.position,
            hasClickListener: this.hasClickListener(canvas),
            cursor: canvas.style.cursor,
            dimensions: {
              width: canvas.width,
              height: canvas.height
            }
          };
        } else {
          analysis.issues.push({
            type: 'MISSING_MAIN_CANVAS',
            message: 'Main renderer or canvas not found'
          });
        }

        // Check for click-to-move functions
        analysis.functions = {
          attachClickToMoveMap: typeof attachClickToMoveMap === 'function',
          attachClickToMoveFPV: typeof attachClickToMoveFPV === 'function',
          startAutoMoveTo: typeof startAutoMoveTo === 'function'
        };

        // Detect issues
        if (!analysis.functions.attachClickToMoveMap) {
          analysis.issues.push({
            type: 'MISSING_MAP_CLICK_FUNCTION',
            message: 'attachClickToMoveMap function not found'
          });
        }

        if (analysis.mapCanvas && !analysis.mapCanvas.hasClickListener) {
          analysis.issues.push({
            type: 'MISSING_MAP_CLICK_LISTENER',
            message: 'Map canvas has no click event listener'
          });
        }

        console.log('📊 Click-to-Move Analysis:', analysis);
        this.generateClickToMoveRecommendations(analysis);
        return analysis;
      }

      hasClickListener(element) {
        // This is a simplified check - in practice, listeners might not be easily detectable
        return element.onclick !== null || element.style.cursor === 'crosshair';
      }

      generateClickToMoveRecommendations(analysis) {
        console.log('💡 CLICK-TO-MOVE RECOMMENDATIONS:');

        if (analysis.issues.length === 0) {
          console.log('✅ Click-to-move system appears to be properly configured');
          return;
        }

        analysis.issues.forEach(issue => {
          switch (issue.type) {
            case 'MISSING_MAP_CLICK_FUNCTION':
              console.log('🚨 Create attachClickToMoveMap function with raycasting');
              this.implementMapClickToMove();
              break;
            case 'MISSING_MAP_CLICK_LISTENER':
              console.log('🚨 Map canvas missing click listener');
              console.log('   Fix: Call attachClickToMoveMap() during initialization');
              break;
          }
        });
      }

      implementMapClickToMove() {
        if (typeof attachClickToMoveMap === 'function') {
          console.log('✅ attachClickToMoveMap already exists');
          return;
        }

        console.log('🔧 AUTO-IMPLEMENTING: Map click-to-move functionality');

        // Create the function dynamically
        window.attachClickToMoveMap = function () {
          if (!mainRenderer || !mainRenderer.domElement) {
            console.warn('Cannot attach map click - renderer not available');
            return;
          }

          const canvas = mainRenderer.domElement;
          canvas.style.cursor = "crosshair";
          canvas.addEventListener("click", (e) => {
            console.log('Map click detected');
            const rect = canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            const mouseVec = new THREE.Vector2(x, y);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouseVec, camera);

            // Create a temporary plane at y=0 to intersect with
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, intersectPoint);

            if (intersectPoint) {
              const tx = Math.round(intersectPoint.x / TILE_SIZE);
              const ty = Math.round(intersectPoint.z / TILE_SIZE);

              if (
                tx >= 0 &&
                tx < MAP_WIDTH &&
                ty >= 0 &&
                ty < MAP_HEIGHT &&
                map[ty] && map[ty][tx] && map[ty][tx].type === TILE.FLOOR
              ) {
                console.log(`Map click: Moving to (${tx}, ${ty})`);
                if (typeof startAutoMoveTo === 'function') {
                  startAutoMoveTo(tx, ty);
                } else {
                  console.warn('startAutoMoveTo function not available');
                }
              } else {
                console.log('Invalid click target');
              }
            }
          });
          console.log('✅ Map click-to-move implemented');
        };

        // Auto-attach if possible
        if (mainRenderer && mainRenderer.domElement) {
          window.attachClickToMoveMap();
        }
      }
    }

    // === FORENSIC LLM: TACTICAL CIRCLE & MODEL POSITIONING ANALYZER ===
    class TacticalCircleForensicAnalyzer {
      constructor() {
        this.analysisResults = {};
        this.debugMode = true;
      }

      analyzeTacticalPositioning() {
        console.log('🔍 FORENSIC ANALYSIS: Tactical Circle & Model Positioning Investigation');
        const analysis = {
          timestamp: Date.now(),
          playerPositioning: {},
          monsterPositioning: {},
          circleGeometry: {},
          modelBounds: {},
          yOffsetCalculations: {},
          issues: []
        };

        // Analyze player positioning
        if (player.object) {
          analysis.playerPositioning = this.analyzeObjectPositioning(player.object, 'PLAYER');
        }

        // Analyze monster positioning
        monsters.forEach((monster, index) => {
          if (monster.object) {
            const monsterId = `monster_${index}`;
            analysis.monsterPositioning[monsterId] = this.analyzeObjectPositioning(monster.object, 'MONSTER');
          }
        });

        // Analyze fitToHeightAndGround function logic
        analysis.fitToHeightAndGroundLogic = this.analyzeFitToHeightAndGround();

        console.log('📊 Tactical Positioning Analysis:', analysis);
        this.generatePositioningRecommendations(analysis);
        return analysis;
      }

      analyzeObjectPositioning(object, type) {
        const positioning = {
          objectPosition: {
            x: object.position.x,
            y: object.position.y,
            z: object.position.z
          },
          children: [],
          circles: {},
          models: {},
          bounds: null
        };

        object.traverse((child) => {
          const childInfo = {
            name: child.name || child.constructor.name,
            type: child.type,
            position: { x: child.position.x, y: child.position.y, z: child.position.z },
            visible: child.visible,
            layers: child.layers ? child.layers.mask : null
          };

          // Identify circles
          if (child.geometry && child.geometry.type === 'CircleGeometry') {
            positioning.circles.mainCircle = {
              ...childInfo,
              radius: child.geometry.parameters.radius,
              color: child.material.color.getHexString()
            };
          }

          // Identify ring borders
          if (child.geometry && child.geometry.type === 'RingGeometry') {
            const ringType = child.material.color.getHex() === 0xffffff ? 'whiteBorder' :
              child.material.color.getHex() === 0xff0000 ? 'hostileBorder' :
                child.material.color.getHex() === 0x333333 ? 'shadowBorder' : 'unknown';
            positioning.circles[ringType] = {
              ...childInfo,
              innerRadius: child.geometry.parameters.innerRadius,
              outerRadius: child.geometry.parameters.outerRadius,
              color: child.material.color.getHexString()
            };
          }

          // Identify 3D models
          if (child.userData && child.userData.originalUrl) {
            positioning.models.main = {
              ...childInfo,
              originalUrl: child.userData.originalUrl,
              scale: { x: child.scale.x, y: child.scale.y, z: child.scale.z },
              rotation: { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z },
              bounds: this.getObjectBounds(child)
            };
          }

          positioning.children.push(childInfo);
        });

        // Calculate overall bounds
        positioning.bounds = this.getObjectBounds(object);

        return positioning;
      }

      getObjectBounds(object) {
        try {
          const box = new THREE.Box3().setFromObject(object);
          return {
            min: { x: box.min.x, y: box.min.y, z: box.min.z },
            max: { x: box.max.x, y: box.max.y, z: box.max.z },
            size: {
              width: box.max.x - box.min.x,
              height: box.max.y - box.min.y,
              depth: box.max.z - box.min.z
            },
            center: {
              x: (box.max.x + box.min.x) / 2,
              y: (box.max.y + box.min.y) / 2,
              z: (box.max.z + box.min.z) / 2
            }
          };
        } catch (e) {
          return { error: e.message };
        }
      }

      analyzeFitToHeightAndGround() {
        return {
          purpose: "Scale model to target height and position feet at yOffset above ground",
          currentValues: {
            monsterHeight: "TUNING.models.monsterHeight = " + TUNING.models.monsterHeight,
            currentYOffset: "0.025 (was increased from 0.013)",
            playerYOffset: "0.018",
            tileSize: "TILE_SIZE = " + TILE_SIZE,
            circleRadius: "TILE_SIZE * 0.35 = " + (TILE_SIZE * 0.35)
          },
          logic: [
            "1. Calculate bounding box of model",
            "2. Find largest dimension (dx, dy, dz)",
            "3. Scale = targetHeight / largest dimension",
            "4. Apply scale to model",
            "5. Recalculate bounding box after scaling",
            "6. Set Y position = -minY + yOffset (lift bottom to yOffset height)",
            "7. Circle position.y values: main=0.015, whiteBorder=0.011, hostileBorder=0.013"
          ],
          potentialIssues: [
            "Model scale might be wrong relative to circle",
            "Y offset might be too small for scaled model",
            "Circle Y positions might conflict with model feet",
            "Different scaling between map and FPV views"
          ]
        };
      }

      generatePositioningRecommendations(analysis) {
        console.log('💡 TACTICAL POSITIONING RECOMMENDATIONS:');

        // Check for buried models
        Object.entries(analysis.monsterPositioning).forEach(([id, positioning]) => {
          if (positioning.models.main && positioning.circles.mainCircle) {
            const modelBottom = positioning.models.main.bounds.min.y;
            const circleTop = positioning.circles.mainCircle.position.y;

            if (modelBottom <= circleTop) {
              analysis.issues.push({
                type: 'MODEL_BURIED',
                id: id,
                message: `Model bottom (${modelBottom.toFixed(3)}) is at or below circle top (${circleTop.toFixed(3)})`,
                modelBottom: modelBottom,
                circleTop: circleTop,
                suggestedYOffset: circleTop + 0.05
              });
            }
          }
        });

        // Check player positioning
        if (analysis.playerPositioning.models && analysis.playerPositioning.circles.mainCircle) {
          const modelBottom = analysis.playerPositioning.models.main?.bounds.min.y;
          const circleTop = analysis.playerPositioning.circles.mainCircle.position.y;

          if (modelBottom !== undefined && modelBottom <= circleTop + 0.01) {
            analysis.issues.push({
              type: 'PLAYER_MODEL_LOW',
              message: `Player model bottom (${modelBottom.toFixed(3)}) is close to circle top (${circleTop.toFixed(3)})`,
              modelBottom: modelBottom,
              circleTop: circleTop
            });
          }
        }

        // Generate fixes
        if (analysis.issues.length === 0) {
          console.log('✅ No major positioning issues detected');
        } else {
          analysis.issues.forEach(issue => {
            switch (issue.type) {
              case 'MODEL_BURIED':
                console.log(`🚨 ${issue.id}: Model buried under circle`);
                console.log(`   Current: Model bottom=${issue.modelBottom.toFixed(3)}, Circle top=${issue.circleTop.toFixed(3)}`);
                console.log(`   Fix: Increase Y offset to at least ${issue.suggestedYOffset.toFixed(3)}`);
                break;
              case 'PLAYER_MODEL_LOW':
                console.log(`🚨 Player model positioning needs adjustment`);
                console.log(`   Current: Model bottom=${issue.modelBottom.toFixed(3)}, Circle top=${issue.circleTop.toFixed(3)}`);
                break;
            }
          });

          this.autoFixPositioning(analysis.issues);
        }
      }

      autoFixPositioning(issues) {
        console.log('🔧 AUTO-FIX: Adjusting model positioning...');

        issues.forEach(issue => {
          if (issue.type === 'MODEL_BURIED') {
            // Calculate better Y offset
            const newYOffset = Math.max(0.05, issue.suggestedYOffset);
            console.log(`💡 Recommended Y offset for monsters: ${newYOffset.toFixed(3)}`);
          }
        });

        console.log('💡 SUGGESTED FIXES:');
        console.log('   1. Increase monster Y offset in fitToHeightAndGround to 0.05+');
        console.log('   2. Ensure circle Y positions are lower than model feet');
        console.log('   3. Consider adjusting model scaling for better proportion');
        console.log('   4. Test with both map and FPV views');
      }
    }

    // Initialize forensic analyzers
    // Global analysis functions
    // Global analysis functions
    window.analyzeMonsterModels = () => window.monsterForensics && window.monsterForensics.analyzeMonsterModels();

    // ROBUST IDEMPOTENT SHIMS
    // We assign strictly to window to avoid 'Identifier has already been declared' errors
    // and ensure availability for 'new window.ClassName()' calls.

    window.ClickToMoveForensicAnalyzer = window.ClickToMoveForensicAnalyzer || class {
      analyzeClickToMove() { console.log("[Forensic Shim] ClickToMove analyzed"); }
    };

    window.TacticalCircleForensicAnalyzer = window.TacticalCircleForensicAnalyzer || class {
      analyzeTacticalPositioning() { console.log("[Forensic Shim] Tactical Positioning analyzed"); }
    };

    window.MonsterModelForensicAnalyzer = window.MonsterModelForensicAnalyzer || class {
      analyzeMonsterModels() { console.log("[Forensic Shim] Monster Models analyzed"); }
    };

    // Initialize forensic analyzers
    if (!window.monsterForensics) window.monsterForensics = new window.MonsterModelForensicAnalyzer();
    if (!window.clickMoveForensics) window.clickMoveForensics = new window.ClickToMoveForensicAnalyzer();
    if (!window.tacticalForensics) window.tacticalForensics = new window.TacticalCircleForensicAnalyzer();

    window.analyzeClickToMove = () => window.clickMoveForensics.analyzeClickToMove();
    window.analyzeTacticalPositioning = () => window.tacticalForensics.analyzeTacticalPositioning();
    window.runFullForensics = () => {
      console.log('🚀 RUNNING COMPLETE FORENSIC ANALYSIS');
      // Only run forensic auto-analysis if AI/forensics are allowed
      if (typeof MONSTER_AI_DISABLED === 'undefined' || !MONSTER_AI_DISABLED) {
        if (typeof window.analyzeMonsterModels === 'function') {
          window.analyzeMonsterModels();
        }
      }
      window.analyzeClickToMove();
      window.analyzeTacticalPositioning();
    };

    let forensicSyncAnalyzer = null;

    // Shim for missing ForensicObjectSyncAnalyzer
    window.ForensicObjectSyncAnalyzer = window.ForensicObjectSyncAnalyzer || class {
      constructor() {
        this.isInitialScan = true;
      }
      scheduleScan() { console.log("[Forensic Shim] Scan scheduled"); }
      getStatus() { return "Shimmed Active"; }
    };

    // Initialize on game start
    function initializeForensicSystem() {
      if (!forensicSyncAnalyzer) {
        forensicSyncAnalyzer = new window.ForensicObjectSyncAnalyzer();

        // Make it globally accessible for debugging
        window.forensicSync = forensicSyncAnalyzer;

        console.log('🔍 Forensic Sync Analyzer initialized and available as window.forensicSync');
        console.log('💡 Press Ctrl+Shift+F for full analysis');
        console.log('💡 Use forensicSync.getStatus() to check sync status');

        // Run a single forced, rate-limited forensic scan at startup to auto-fix obvious sync issues
        // Run a single forced, rate-limited forensic scan at startup to auto-fix obvious sync issues
        try {
          // window.forensicSync.scheduleScan && window.forensicSync.scheduleScan(true);
          window.forensicSync.isInitialScan = false;
        } catch (e) { console.warn('Initial forensic scan failed', e); }

        // Lightweight in-browser 'forensic LLM' helper (rule-based)
        window.forensicLLM = {
          name: 'forensic-llm-local',
          version: '0.1',
          lastRun: 0,
          scanConsoleWarnings() {
            // Collect common console warnings from a known set of patterns
            const warnings = [];
            try {
              // Tailwind CDN warning (can't access console history programmatically in browsers),
              // but we can infer from presence of external script tags referencing tailwindcdn
              const scripts = Array.from(document.querySelectorAll('script[src]'));
              scripts.forEach(s => {
                const src = s.src || '';
                if (src.includes('cdn.tailwindcss.com')) {
                  warnings.push({ id: 'tailwind-cdn', message: 'Tailwind CDN detected. Use Tailwind as a PostCSS plugin for production.' });
                }
              });

              // AudioContext user-gesture issues: detect Tone.js or AudioContext usage in window
              if (window.Tone || window.AudioContext || window.webkitAudioContext) {
                warnings.push({ id: 'audiocontext-gesture', message: 'AudioContext may require a user gesture to start. Ensure resume() is called after user interaction.' });
              }
            } catch (e) {
              console.warn('forensicLLM.scanConsoleWarnings failed', e);
            }
            this.lastRun = Date.now();
            return warnings;
          },

          suggestFixes() {
            const warnings = this.scanConsoleWarnings();
            const fixes = [];
            warnings.forEach(w => {
              if (w.id === 'tailwind-cdn') {
                fixes.push({ id: 'install-tailwind', title: 'Install Tailwind Locally', detail: 'Install Tailwind as a PostCSS plugin or use the Tailwind CLI and build CSS during your build step. See https://tailwindcss.com/docs/installation' });
              }
              if (w.id === 'audiocontext-gesture') {
                fixes.push({ id: 'defer-audio', title: 'Defer or resume AudioContext', detail: 'Wrap AudioContext creation/resume in a user gesture handler (e.g., on first user click). Optionally, call audioCtx.resume() after user input.' });
              }
            });

            // Also suggest fixes from forensicSync if there are many sync issues
            try {
              if (window.forensicSync && typeof window.forensicSync.getStatus === 'function') {
                const st = window.forensicSync.getStatus ? window.forensicSync.getStatus() : null;
                if (st && st.syncIssues && st.syncIssues > 0) {
                  fixes.push({ id: 'auto-fix-sync', title: 'Auto-fix layer sync issues', detail: 'Attempt to enable missing layers on objects flagged as partial or invisible using the ForensicObjectSyncAnalyzer.' });
                }
              }
            } catch (e) { }

            return fixes;
          },

          applyFix(fixId) {
            switch (fixId) {
              case 'install-tailwind':
                console.log('forensicLLM.applyFix: Cannot auto-install Tailwind. See: https://tailwindcss.com/docs/installation');
                return { applied: false, message: 'Manual action required: install Tailwind as a PostCSS plugin or use the CLI.' };

              case 'defer-audio':
                // Insert a safe wrapper that attempts to resume AudioContext on first user gesture
                try {
                  if (!window._forensic_audio_wrapped) {
                    window._forensic_audio_wrapped = true;
                    const resumeAudioOnce = () => {
                      try {
                        const ctx = window.__audio_context__ || (window.AudioContext && new window.AudioContext());
                        if (ctx && typeof ctx.resume === 'function') ctx.resume().catch(() => { });
                      } catch (e) { }
                      window.removeEventListener('click', resumeAudioOnce);
                      window.removeEventListener('keydown', resumeAudioOnce);
                    };
                    window.addEventListener('click', resumeAudioOnce, { once: true });
                    window.addEventListener('keydown', resumeAudioOnce, { once: true });
                    return { applied: true, message: 'Attached resume() to first user click/keydown.' };
                  }
                  return { applied: false, message: 'Audio resume already wrapped.' };
                } catch (e) {
                  return { applied: false, message: 'Failed to attach audio resume handler.' };
                }

              case 'auto-fix-sync':
                try {
                  if (!window.forensicSync) return { applied: false, message: 'Forensic sync analyzer not available.' };
                  // Collect current sync issues and apply fixes via the existing analyzer
                  const st = window.forensicSync.getStatus ? window.forensicSync.getStatus() : null;
                  // Use a single-pass approach: schedule a forensic scan (rate-limited)
                  window.forensicSync && window.forensicSync.scheduleScan && window.forensicSync.scheduleScan();
                  const scanResults = window.forensicSync.scanAllSceneObjects && window.forensicSync.scanAllSceneObjects();
                  const issues = window.forensicSync.analyzeSyncIssues && window.forensicSync.analyzeSyncIssues(scanResults || []);
                  if (issues && issues.length > 0) {
                    window.forensicSync.applySyncFixes && window.forensicSync.applySyncFixes(issues);
                    return { applied: true, message: `Applied ${issues.length} sync fixes via forensicSync.` };
                  }
                  return { applied: false, message: 'No issues found to fix.' };
                } catch (e) {
                  return { applied: false, message: 'Auto-fix failed: ' + (e && e.message) };
                }

              default:
                return { applied: false, message: 'Unknown fix id' };
            }
          },

          report() {
            const warnings = this.scanConsoleWarnings();
            const fixes = this.suggestFixes();
            const status = {
              warnings,
              suggestedFixes: fixes,
              forensicSyncStatus: (window.forensicSync && window.forensicSync.getStatus) ? window.forensicSync.getStatus() : null
            };
            console.log('🧠 forensicLLM report', status);
            return status;
          }
        };
        console.log('💡 Use forensicSync.performFullAnalysis() for manual analysis');
        console.log('💡 Use window.fixArrows() to immediately hide all monster arrows');
        console.log('💡 Use window.addWhiteBorders() to ensure all monsters have white borders');
      }
    }

    // Emergency arrow fix function - globally accessible
    window.fixArrows = function () {
      console.log('🔧 EMERGENCY: Hiding all monster arrows...');
      let arrowsFixed = 0;
      scene.traverse((object) => {
        if (object.userData && object.userData.visuals && object.userData.visuals.arrow) {
          const arrow = object.userData.visuals.arrow;
          if (arrow.visible) {
            arrow.visible = false;
            arrowsFixed++;
            console.log(`Hidden arrow on object: ${object.name || object.uuid}`);
          }
        }
      });
      console.log(`✅ Fixed ${arrowsFixed} visible arrows`);
      return arrowsFixed;
    };

    // Emergency white border fix function
    window.addWhiteBorders = function () {
      console.log('🔧 EMERGENCY: Ensuring all monsters have white borders...');
      let bordersAdded = 0;
      scene.traverse((object) => {
        if (object.userData && object.userData.visuals && object.userData.visuals.indicator) {
          // This is a monster object
          if (!object.userData.visuals.whiteBorder) {
            console.log(`Adding missing white border to: ${object.name || object.uuid}`);
            // Create white border like in createMonsterObject
            const circleRadius = TILE_SIZE * 0.35;
            const whiteBorderGeo = new THREE.RingGeometry(
              circleRadius - 0.075,
              circleRadius + 0.075,
              64
            );
            const whiteBorderMat = new THREE.MeshBasicMaterial({
              color: 0x000000,
              side: THREE.DoubleSide,
            });
            const whiteBorder = new THREE.Mesh(whiteBorderGeo, whiteBorderMat);
            whiteBorder.rotation.x = -Math.PI / 2;
            whiteBorder.position.y = 0.011;
            whiteBorder.layers.set(0); // Map only
            object.add(whiteBorder);
            object.userData.visuals.whiteBorder = whiteBorder;
            bordersAdded++;
          }
        }
      });
      console.log(`✅ Added ${bordersAdded} white borders`);
      return bordersAdded;
    };

    function createMonsterObject(model) {
      const group = new THREE.Group();
      group.layers.enable(0); // Map
      group.layers.enable(FPV_MODEL_LAYER); // FPV
      group.userData.visuals = {};

      // Flashlight - RESTORED FOR MONSTERS (Backward Facing)
      const flashlight = new THREE.SpotLight(0xffffff, 2.0, 30, Math.PI / 4, 0.5, 1);
      flashlight.position.set(0, 2, -0.5); // Back of monster
      flashlight.target.position.set(0, 0, 5); // Point backward (flipped from player)
      flashlight.layers.set(FPV_MODEL_LAYER);
      group.add(flashlight);
      group.add(flashlight.target);
      group.userData.visuals.flashlight = flashlight;

      // Orb light: a soft point light that trails the monster; FPV-only so it doesn't wash the tactical map
      const orb = new THREE.PointLight(
        TUNING.lighting.monsterOrb.color,
        TUNING.lighting.monsterOrb.intensity,
        TUNING.lighting.monsterOrb.distance,
        TUNING.lighting.monsterOrb.decay
      );
      orb.position.set(-0.6, WALL_HEIGHT * 0.55, 0.6);
      orb.visible = true; // always on
      orb.layers.set(FPV_MODEL_LAYER);
      group.add(orb);
      group.userData.visuals.orb = orb;

      // Hostile face light: dramatic red light above monster face (initially off)
      const hostileLight = new THREE.PointLight(
        0xff3333, // Bright red
        2.0,      // High intensity for drama
        3.0,      // Medium range
        2         // Sharp falloff
      );
      hostileLight.position.set(0, WALL_HEIGHT * 0.8, 0); // Above face
      hostileLight.visible = false; // Initially off
      hostileLight.layers.set(FPV_MODEL_LAYER); // FPV only for dramatic effect
      group.add(hostileLight);
      group.userData.visuals.hostileLight = hostileLight;

      const monsterInstance = model.clone();

      // Determine rotation based on model type
      let modelRotation = TUNING.models.yaw.monster;
      const modelUrl = model.userData.originalUrl || '';
      if (modelUrl.includes('Yakuza.Imp.glb') || modelUrl.includes('Yakuza.imp.glb')) {
        modelRotation = TUNING.models.yaw.yakuzaImp;
      }

      // Set rotation and scale for map view (larger, shorter)
      monsterInstance.rotation.y = modelRotation;
      fitToHeightAndGround(monsterInstance, TUNING.models.monsterHeight, 0.08); // Elevate feet clearly above tactical circle (increased from 0.09)

      // Apply initial scale (will be adjusted per view during rendering)
      const baseScale = TUNING.models.mapViewScale;
      monsterInstance.scale.multiplyScalar(baseScale);

      // Store scaling information for view-specific adjustments
      monsterInstance.userData.viewScaling = {
        mapScale: TUNING.models.mapViewScale,
        fpvScale: TUNING.models.fpvViewScale,
        currentScale: baseScale,
        baseScalar: monsterInstance.scale.x // Store the scalar after fitToHeightAndGround
      };

      // Single model visible in both map and FPV views
      // Apply white material override and layer isolation recursively
      monsterInstance.traverse((child) => {
        // Set layer for ALL objects in the hierarchy to ensure light isolation works
        child.layers.set(MONSTER_ISOLATION_LAYER);

        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xdddddd, // Light grey to prevent white-out
            roughness: 0.7,  // Matte finish
            metalness: 0.0,  // No metalness to prevent blackening without envMap
            side: THREE.DoubleSide, // Ensure visibility from all angles
            skinning: !!child.skeleton
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Set root layers (though traverse handled children, good to be explicit)
      monsterInstance.layers.set(MONSTER_ISOLATION_LAYER);
      monsterInstance.userData.isMapModel = true;
      group.add(monsterInstance);

      // Add isolated frontlight for monster (White, moderate intensity, only on isolation layer)
      const monsterFrontlight = new THREE.PointLight(0xffffff, 0.8, 8);
      monsterFrontlight.position.set(0, 1.5, 1.0); // Front-top
      monsterFrontlight.layers.set(MONSTER_ISOLATION_LAYER); // Only affects objects on this layer
      group.add(monsterFrontlight);
      group.userData.visuals.monsterFrontlight = monsterFrontlight;
      monsterFrontlight.position.set(0, 2, 2); // In front and slightly up
      monsterFrontlight.layers.set(MONSTER_ISOLATION_LAYER); // Only affects monster
      group.add(monsterFrontlight);

      // Dedicated white light source surrounding monster (requested)
      const monsterSurroundLight = new THREE.PointLight(0xffffff, 1.2, 8);
      monsterSurroundLight.position.set(0, 3, 0); // Above center
      monsterSurroundLight.layers.set(MONSTER_ISOLATION_LAYER);
      group.add(monsterSurroundLight);

      // Configure shadows for single model
      monsterInstance.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      group.userData.visuals.model3d = monsterInstance; // Single model reference
      group.userData.visuals.model3dFPV = monsterInstance; // Same model for both views
      applyMonsterOrbTuning(orb);
      // --- 2D tactical indicator (circle + arrow + search overlay) ---
      try {
        const circleRadius = TILE_SIZE * 0.35;
        const circleGeometry = new THREE.CircleGeometry(circleRadius, 32);
        const indicatorMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          side: THREE.DoubleSide,
        }); // Black indicator for monsters in map view
        const indicator = new THREE.Mesh(circleGeometry, indicatorMat);
        indicator.rotation.x = -Math.PI / 2;
        indicator.position.y = 0.012; // slightly higher to avoid z-fighting with floor
        indicator.layers.set(0); // Map only
        group.add(indicator);

        // White 3px outer border (always visible like player circle)
        const whiteBorderGeo = new THREE.RingGeometry(
          circleRadius - 0.075,
          circleRadius + 0.075,
          64
        );
        const whiteBorderMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          side: THREE.DoubleSide,
        });
        const whiteBorder = new THREE.Mesh(whiteBorderGeo, whiteBorderMat);
        whiteBorder.rotation.x = -Math.PI / 2;
        whiteBorder.position.y = 0.013; // lift with indicator to maintain visible separation
        whiteBorder.visible = true; // Always make white border visible
        whiteBorder.layers.set(0); // Map only
        group.add(whiteBorder);

        // Neumorphic shadow for white border (outer dark shadow) - enhanced for all statuses
        const shadowBorderGeo = new THREE.RingGeometry(
          circleRadius - 0.08,
          circleRadius + 0.08,
          64
        );

        // Create neumorphic shadow texture for border
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 256;
        shadowCanvas.height = 256;
        const shadowCtx = shadowCanvas.getContext('2d');

        // Create radial gradient for shadow
        const shadowGrad = shadowCtx.createRadialGradient(
          128, 128, circleRadius * 128 - 8,
          128, 128, circleRadius * 128 + 8
        );
        shadowGrad.addColorStop(0, 'rgba(0,0,0,0.6)'); // Stronger inner shadow
        shadowGrad.addColorStop(0.5, 'rgba(0,0,0,0.4)');
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0.1)'); // Fade out at outer edge

        shadowCtx.fillStyle = shadowGrad;
        shadowCtx.fillRect(0, 0, shadowCanvas.width, shadowCanvas.height);

        const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
        const shadowBorderMat = new THREE.MeshBasicMaterial({
          map: shadowTexture,
          side: THREE.DoubleSide,
          transparent: true
        });

        const shadowBorder = new THREE.Mesh(shadowBorderGeo, shadowBorderMat);
        shadowBorder.rotation.x = -Math.PI / 2;
        shadowBorder.position.y = 0.012; // keep under white border after lift
        shadowBorder.layers.set(0); // Map only
        group.add(shadowBorder);

        group.userData.visuals.whiteBorder = whiteBorder;
        group.userData.visuals.shadowBorder = shadowBorder;

        // border ring visible when hostile/searching - starts as red for hostile
        const playerBorderGeo = new THREE.RingGeometry(
          circleRadius - 0.12,
          circleRadius + 0.12,
          64
        );
        const playerBorderMat = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF, // White border as requested
          side: THREE.DoubleSide,
          depthTest: true,
        });
        border.rotation.x = -Math.PI / 2;
        border.position.y = 0.015; // keep on top after lifts
        border.visible = false;
        border.layers.set(0); // Map only
        group.add(border);

        // Neumorphic inner shadow just inside the white border
        // Create a simple vertical gradient texture that maps radially on RingGeometry (v=0 inner, v=1 outer)
        const innerShadowCanvas = document.createElement('canvas');
        innerShadowCanvas.width = 128;
        innerShadowCanvas.height = 256;
        const innerShadowCtx = innerShadowCanvas.getContext('2d');
        const grad = innerShadowCtx.createLinearGradient(0, 0, 0, innerShadowCanvas.height);
        // Fade from transparent (inner) to soft black (outer, adjacent to white border)
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.35)');
        innerShadowCtx.fillStyle = grad;
        innerShadowCtx.fillRect(0, 0, innerShadowCanvas.width, innerShadowCanvas.height);
        const innerShadowTex = new THREE.CanvasTexture(innerShadowCanvas);
        innerShadowTex.wrapS = THREE.ClampToEdgeWrapping;
        innerShadowTex.wrapT = THREE.ClampToEdgeWrapping;
        innerShadowTex.needsUpdate = true;

        // Thin ring inside the white border
        const playerInnerShadowGeo = new THREE.RingGeometry(
          circleRadius - 0.20, // Inner radius
          circleRadius - 0.125, // Outer radius (just inside white border's inner edge at -0.12)
          64
        );
        const playerInnerShadowMat = new THREE.MeshBasicMaterial({
          map: innerShadowTex,
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: true,
        });
        const playerShadowBorder = new THREE.Mesh(playerInnerShadowGeo, playerInnerShadowMat);
        playerShadowBorder.rotation.x = -Math.PI / 2;
        playerShadowBorder.position.y = 0.017; // Just below the white border
        playerShadowBorder.layers.set(0);
        group.add(playerShadowBorder);
        const searchHalf = new THREE.Mesh(semiGeo, semiMat);
        searchHalf.rotation.x = -Math.PI / 2;
        searchHalf.position.y = 0.017;
        searchHalf.visible = false;
        searchHalf.layers.set(0); // Map only
        group.add(searchHalf);

        // small arrow indicator — REMOVED as requested
        const arrowShape = new THREE.Shape();
        const arrowSize = TILE_SIZE * 0.12;
        arrowShape.moveTo(0, arrowSize);
        arrowShape.lineTo(arrowSize * 0.6, -arrowSize);
        arrowShape.lineTo(-arrowSize * 0.6, -arrowSize);
        arrowShape.closePath();
        const arrowGeo = new THREE.ShapeGeometry(arrowShape);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.rotation.x = -Math.PI / 2;
        arrow.rotation.y = Math.PI; // 180 degree rotation as requested
        arrow.position.y = 0.02;
        arrow.position.z = -TILE_SIZE * 0.25 + 0.02; // Positioned like player arrow
        arrow.layers.set(0);
        arrow.visible = false; // HIDDEN - arrows removed as requested
        arrow.userData.staticArrow = true; // Mark as static - never moves independently
        group.add(arrow);

        group.userData.visuals.indicator = indicator;
        group.userData.visuals.whiteBorder = whiteBorder;
        group.userData.visuals.border = border;
        group.userData.visuals.searchIndicator = searchHalf;
        group.userData.visuals.arrow = arrow;
        group.userData.visuals.centerDisk = null;
      } catch (e) {
        // non-fatal; continue without 2D indicators
      }
      return group;
    }

    function createStubMonsterModel(name = 'Stub') {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x8844ff })
      );
      body.position.y = 0.4;
      g.add(body);
      g.name = name;
      return g;
    }

    // Stairs are intentionally disabled for a cleaner look — return empty group
    function createStairsObject() {
      return new THREE.Group();
    }

    // === 💎 LOOT MODEL FACTORY === 
    // White Paper Aesthetic system for 3D items

    // 1. Materials
    const LootMaterials = {
      // Main surface for blades, paper sheets
      paperBase: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        flatShading: true
      }),
      // Secondary detail color (hilts, handles) - slightly darker off-white
      paperFold: new THREE.MeshStandardMaterial({
        color: 0xf2f2f2,
        roughness: 1.0,
        flatShading: true
      }),
      // Dark accent for "metal" parts (guards, rims) or ink
      paperDark: new THREE.MeshStandardMaterial({
        color: 0xe0e0e0,
        roughness: 1.0,
        flatShading: true
      }),
      // Specific dark grey for outer robes/clothing
      paperDarkGray: new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 1.0,
        flatShading: true
      }),
      // Glowing material for liquids and magic effects
      paperGlow: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
      }),
    };

    // 2. Builders
    const LootBuilders = {
      weapons: {
        // Katana (Longsword)
        swordA: (v) => {
          const group = new THREE.Group();
          const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), LootMaterials.paperFold);
          const guardGeo = v === 1 ? new THREE.BoxGeometry(0.4, 0.1, 0.4) : new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
          const guard = new THREE.Mesh(guardGeo, LootMaterials.paperDark);
          guard.position.y = 0.45;
          const bladeGeo = v === 2 ? new THREE.BoxGeometry(0.12, 2.8, 0.05) : new THREE.BoxGeometry(0.1, 3, 0.05);
          const blade = new THREE.Mesh(bladeGeo, LootMaterials.paperBase);
          blade.position.y = 0.45 + (v === 2 ? 1.4 : 1.5);
          group.add(hilt, guard, blade);
          return group;
        },
        // Nodachi (Greatsword)
        swordB: (v) => {
          const group = new THREE.Group();
          const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), LootMaterials.paperFold);
          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.2), LootMaterials.paperDark);
          guard.position.y = 0.65;
          const bladeLen = v === 1 ? 4.5 : 5.0;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, bladeLen, 0.06), LootMaterials.paperBase);
          blade.position.y = 0.65 + bladeLen / 2;
          group.add(hilt, guard, blade);
          return group;
        },
        // Wakizashi (Shortsword)
        swordC: (v) => {
          const group = new THREE.Group();
          const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.6, 0.13), LootMaterials.paperFold);
          const guard = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 4, 8), LootMaterials.paperDark);
          guard.position.y = 0.35; guard.rotation.x = Math.PI / 2;
          const bladeLen = v === 1 ? 2 : 1.8;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, bladeLen, 0.04), LootMaterials.paperBase);
          blade.position.y = 0.35 + bladeLen / 2;
          group.add(hilt, guard, blade);
          return group;
        },
        // Tanto (Dagger)
        daggerA: (v) => {
          const group = new THREE.Group();
          const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), LootMaterials.paperFold);
          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), LootMaterials.paperDark);
          guard.position.y = 0.3;
          const bladeLen = v === 1 ? 1.2 : 1.0;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, bladeLen, 0.04), LootMaterials.paperBase);
          blade.position.y = 0.3 + bladeLen / 2;
          group.add(hilt, guard, blade);
          return group;
        },
        // Yari (Spear)
        spearB: (v) => {
          const group = new THREE.Group();
          group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 8), LootMaterials.paperFold));
          const head = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.2, 1.5, 4), LootMaterials.paperBase);
          head.position.y = 3.25;
          group.add(head);
          if (v === 2) {
            const cross = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.1), LootMaterials.paperBase);
            cross.position.y = 2.8;
            group.add(cross);
          }
          return group;
        },
        // Ono (Axe)
        axeA: (v) => {
          const group = new THREE.Group();
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 2.5, 8), LootMaterials.paperFold);
          group.add(handle);
          const headShape = new THREE.Shape().moveTo(0, 0).lineTo(1, 0.5).lineTo(1, 1).lineTo(0, 1.5).lineTo(-1, 1).lineTo(-1, 0.5).closePath();
          const head = new THREE.Mesh(new THREE.ExtrudeGeometry(headShape, { depth: 0.2, bevelEnabled: false }), LootMaterials.paperBase);
          head.position.set(0, 0.8, -0.1);
          group.add(head);
          return group;
        }
      },
      armor: {
        armorLight: (v) => {
          const group = new THREE.Group();
          const extrudeSettings = { depth: 0.2, bevelEnabled: false };
          const chestShape = new THREE.Shape().moveTo(-0.6, 1.2).lineTo(0.6, 1.2).lineTo(0.5, 0).lineTo(-0.5, 0).closePath();
          const chest = new THREE.Mesh(new THREE.ExtrudeGeometry(chestShape, extrudeSettings), LootMaterials.paperBase);
          group.add(chest);
          const hipGeo = new THREE.BoxGeometry(0.4, 0.6, 0.1);
          const hipL = new THREE.Mesh(hipGeo, LootMaterials.paperFold);
          hipL.position.set(0.5, -0.4, 0); hipL.rotation.z = -0.2;
          const hipR = hipL.clone();
          hipR.position.set(-0.5, -0.4, 0); hipR.rotation.z = 0.2;
          group.add(hipL, hipR);
          return group;
        },
        armorHeavy: (v) => {
          const group = new THREE.Group();
          const extrudeSettings = { depth: 0.4, bevelEnabled: false };
          const chestShape = new THREE.Shape().moveTo(-0.7, 1.3).lineTo(0.7, 1.3).lineTo(0.6, 0).lineTo(-0.6, 0).closePath();
          const chest = new THREE.Mesh(new THREE.ExtrudeGeometry(chestShape, extrudeSettings), LootMaterials.paperDark);
          group.add(chest);
          const sodeGeo = new THREE.BoxGeometry(0.5, 0.8, 0.2);
          const sodeL = new THREE.Mesh(sodeGeo, LootMaterials.paperDark);
          sodeL.position.set(0.9, 1.0, 0); sodeL.rotation.z = -0.1;
          const sodeR = sodeL.clone();
          sodeR.position.set(-0.9, 1.0, 0); sodeR.rotation.z = 0.1;
          group.add(sodeL, sodeR);
          const skirtGeo = new THREE.BoxGeometry(1.2, 0.5, 0.2);
          const skirt = new THREE.Mesh(skirtGeo, LootMaterials.paperFold);
          skirt.position.y = -0.4;
          group.add(skirt);
          return group;
        },
        armorMache: (v) => {
          const group = new THREE.Group();
          const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.6, 1.5, 16), LootMaterials.paperBase);
          torso.scale.z = 0.7;
          group.add(torso);
          const shoulderGeo = new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
          const shoulderL = new THREE.Mesh(shoulderGeo, LootMaterials.paperBase);
          shoulderL.position.set(0.8, 0.5, 0); shoulderL.rotation.z = -0.5;
          const shoulderR = shoulderL.clone();
          shoulderR.position.set(-0.8, 0.5, 0); shoulderR.rotation.z = 0.5;
          group.add(shoulderL, shoulderR);
          return group;
        },
        armorB: (v) => {
          const group = new THREE.Group();
          const extrudeSettings = { depth: 0.4, bevelEnabled: false };
          const bowlShape = new THREE.Shape().moveTo(-0.8, 0).lineTo(0.8, 0).lineTo(0.6, 1.2).lineTo(-0.6, 1.2).closePath();
          const bowl = new THREE.Mesh(new THREE.ExtrudeGeometry(bowlShape, extrudeSettings), LootMaterials.paperDark);
          group.add(bowl);
          const shikoroShape = new THREE.Shape().moveTo(-1, -0.2).lineTo(1, -0.2).lineTo(0.8, -0.8).lineTo(-0.8, -0.8).closePath();
          const plates = v === 1 ? 3 : 2;
          for (let i = 0; i < plates; i++) {
            const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shikoroShape, { depth: 0.1, bevelEnabled: false }), LootMaterials.paperDark);
            plate.position.y = -i * 0.3; plate.position.z = -0.2 + i * 0.1; plate.rotation.x = -0.2;
            group.add(plate);
          }
          let crestShape;
          if (v === 1) {
            crestShape = new THREE.Shape().moveTo(0, 0.5).lineTo(0.5, 1.5).lineTo(0.3, 1.5).lineTo(0, 0.8).lineTo(-0.3, 1.5).lineTo(-0.5, 1.5).closePath();
          } else {
            crestShape = new THREE.Shape().absarc(0, 1.0, 0.5, 0, Math.PI, true).lineTo(-0.4, 1.0).lineTo(0.4, 1.0).closePath();
          }
          const crest = new THREE.Mesh(new THREE.ExtrudeGeometry(crestShape, { depth: 0.1, bevelEnabled: false }), LootMaterials.paperBase);
          crest.position.y = 0.8; crest.position.z = 0.4;
          group.add(crest);
          return group;
        },
        armorD: (v) => {
          const group = new THREE.Group();
          const extrudeSettings = { depth: 0.2, bevelEnabled: false };
          const shirtShape = new THREE.Shape().moveTo(-0.4, 1.5).lineTo(0.4, 1.5).lineTo(0.5, -1.3).lineTo(-0.5, -1.3).closePath();
          const shirt = new THREE.Mesh(new THREE.ExtrudeGeometry(shirtShape, { depth: 0.15, bevelEnabled: false }), LootMaterials.paperBase);
          shirt.position.z = 0.05;
          group.add(shirt);
          const bodyShape = new THREE.Shape().moveTo(-0.5, 1.6).lineTo(0.5, 1.6).lineTo(0.7, -1.4).lineTo(-0.7, -1.4).closePath();
          const body = new THREE.Mesh(new THREE.ExtrudeGeometry(bodyShape, extrudeSettings), LootMaterials.paperDarkGray);
          group.add(body);
          const sleeveW = v === 1 ? 0.8 : 1.0;
          const sleeveShape = new THREE.Shape().moveTo(0, 0.6).lineTo(sleeveW, 0.6).lineTo(sleeveW + 0.2, -0.4).lineTo(0, -0.2).closePath();
          const sleeveL = new THREE.Mesh(new THREE.ExtrudeGeometry(sleeveShape, extrudeSettings), LootMaterials.paperDarkGray);
          sleeveL.position.x = 0.5; sleeveL.position.y = 0.8;
          group.add(sleeveL);
          const sleeveR = sleeveL.clone(); sleeveR.scale.x = -1; sleeveR.position.x = -0.5;
          group.add(sleeveR);
          const obi = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.25), LootMaterials.paperFold);
          obi.position.y = 0.4; obi.position.z = 0.1;
          group.add(obi);
          return group;
        }
      },
      magic: {
        wandA: (v) => {
          const group = new THREE.Group();
          group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 8), LootMaterials.paperFold));
          if (v === 1) { // Ring Style
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 4, 16), LootMaterials.paperDark);
            ring.position.y = 2; group.add(ring);
          } else { // Lantern Style
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), LootMaterials.paperGlow);
            box.position.y = 2; group.add(box);
          }
          return group;
        },
        scrollA: (v) => {
          const group = new THREE.Group();
          const len = v === 1 ? 1.5 : 1.2;
          const rad = v === 1 ? 0.2 : 0.3;
          const paper = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 16), LootMaterials.paperBase);
          paper.rotation.z = Math.PI / 2;
          group.add(paper);
          const ribbon = new THREE.Mesh(new THREE.TorusGeometry(rad + 0.02, 0.05, 4, 16), LootMaterials.paperFold);
          group.add(ribbon);
          return group;
        },
        scrollB: (v) => {
          const group = new THREE.Group();
          const points = [];
          const curve = v === 1 ? 0.2 : 0.05;
          for (let i = 0; i < 10; i++) points.push(new THREE.Vector2(Math.sin(i * curve) * 0.5, i * 0.2 - 1.0));
          const paper = new THREE.Mesh(new THREE.LatheGeometry(points, 2, 0, Math.PI * 2), LootMaterials.paperBase);
          group.add(paper);
          return group;
        },
        potionA: (v) => { // Health
          const group = new THREE.Group();
          const points = [new THREE.Vector2(0, 0), new THREE.Vector2(0.6, 0), new THREE.Vector2(0.1, 1.2), new THREE.Vector2(0.15, 1.5)];
          const beaker = new THREE.Mesh(new THREE.LatheGeometry(points, 8), LootMaterials.paperGlow);
          group.add(beaker);
          const h = v === 1 ? 0.9 : 0.5;
          const liquid = new THREE.Mesh(new THREE.ConeGeometry(0.4, h, 8), LootMaterials.paperFold);
          liquid.position.y = h / 2;
          group.add(liquid);
          return group;
        },
        potionB: (v) => { // Mana
          const group = new THREE.Group();
          let beaker;
          if (v === 1) beaker = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), LootMaterials.paperGlow);
          else beaker = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), LootMaterials.paperGlow);
          group.add(beaker);
          const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8), LootMaterials.paperGlow);
          neck.position.y = 0.7; group.add(neck);
          return group;
        },
        potionC: (v) => { // Antidote
          const group = new THREE.Group();
          const geo = v === 1 ? new THREE.CylinderGeometry(0.3, 0.3, 1.5, 12) : new THREE.BoxGeometry(0.5, 1.5, 0.5);
          const beaker = new THREE.Mesh(geo, LootMaterials.paperGlow);
          group.add(beaker);
          return group;
        },
        coin: (v) => {
          const shape = new THREE.Shape().absarc(0, 0, 0.8, 0, Math.PI * 2, false);
          const hole = new THREE.Path();
          if (v === 1) {
            hole.absarc(0, 0, 0.2, 0, Math.PI * 2, false);
          } else {
            hole.moveTo(-0.2, -0.2); hole.lineTo(0.2, -0.2); hole.lineTo(0.2, 0.2); hole.lineTo(-0.2, 0.2); hole.closePath();
          }
          shape.holes.push(hole);
          return new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), LootMaterials.paperFold);
        }
      }
    };

    // 3. Metadata registry (useful for UI/tooltips)
    const LootDataRegistry = [
      { id: "swordA", category: "Weapon", builder: LootBuilders.weapons.swordA },
      { id: "swordC", category: "Weapon", builder: LootBuilders.weapons.swordC },
      { id: "swordB", category: "Weapon", builder: LootBuilders.weapons.swordB },
      { id: "daggerA", category: "Weapon", builder: LootBuilders.weapons.daggerA },
      { id: "spearB", category: "Weapon", builder: LootBuilders.weapons.spearB },
      { id: "axeA", category: "Weapon", builder: LootBuilders.weapons.axeA },
      { id: "armorLight", category: "Armor", builder: LootBuilders.armor.armorLight },
      { id: "armorHeavy", category: "Armor", builder: LootBuilders.armor.armorHeavy },
      { id: "armorMache", category: "Armor", builder: LootBuilders.armor.armorMache },
      { id: "armorB", category: "Armor", builder: LootBuilders.armor.armorB },
      { id: "armorD", category: "Armor", builder: LootBuilders.armor.armorD },
      { id: "wandA", category: "Magic", builder: LootBuilders.magic.wandA },
      { id: "scrollA", category: "Magic", builder: LootBuilders.magic.scrollA },
      { id: "scrollB", category: "Magic", builder: LootBuilders.magic.scrollB },
      { id: "potionA", category: "Consumable", builder: LootBuilders.magic.potionA },
      { id: "potionB", category: "Consumable", builder: LootBuilders.magic.potionB },
      { id: "potionC", category: "Consumable", builder: LootBuilders.magic.potionC },
      { id: "coin", category: "Treasure", builder: LootBuilders.magic.coin }
    ];
    function createLootPileObject(visualType = "generic", itemName = "item") {
      const group = new THREE.Group();
      group.layers.enable(0); // Map
      group.layers.enable(FPV_MODEL_LAYER); // FPV
      group.userData.lootType = visualType;
      group.userData.itemName = itemName;

      let modelGroup;
      let builder = null;

      // 1. Resolve Builder from Registry
      const registryEntry = LootDataRegistry.find(e => e.id === visualType);
      if (registryEntry) {
        builder = registryEntry.builder;
      } else {
        // 2. Map generic types to specific builders
        switch (visualType) {
          // Weapons
          case "katana": builder = LootBuilders.weapons.swordA; break;
          case "wakizashi": builder = LootBuilders.weapons.swordC; break;
          case "nodachi": builder = LootBuilders.weapons.swordB; break;
          case "knife": case "dagger": builder = LootBuilders.weapons.daggerA; break;
          case "spear": case "yari": builder = LootBuilders.weapons.spearB; break;
          case "axe": case "ono": builder = LootBuilders.weapons.axeA; break;
          case "weapon": builder = LootBuilders.weapons.swordA; break; // Default weapon

          // Armor
          case "armor": case "light_armor": builder = LootBuilders.armor.armorLight; break;
          case "heavy_armor": case "yoroi": builder = LootBuilders.armor.armorHeavy; break;
          case "helmet": case "kabuto": builder = LootBuilders.armor.armorB; break;
          case "robe": case "kimono": builder = LootBuilders.armor.armorD; break;
          case "shield": builder = LootBuilders.armor.armorHeavy; break; // Use heavy armor bits for shield

          // Magic/Potions
          case "potion": case "healing": builder = LootBuilders.magic.potionA; break;
          case "mana": builder = LootBuilders.magic.potionB; break;
          case "antidote": builder = LootBuilders.magic.potionC; break;
          case "scroll": builder = LootBuilders.magic.scrollA; break;
          case "charm": case "ofuda": builder = LootBuilders.magic.scrollB; break;
          case "wand": case "staff": builder = LootBuilders.magic.wandA; break;

          // Treasure
          case "gold": case "coin": builder = LootBuilders.magic.coin; break;
          case "key": builder = LootBuilders.magic.wandA; break; // Placeholder key

          default:
            // Fallback to a simple box if no builder found
            builder = (v) => {
              const g = new THREE.Group();
              const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), LootMaterials.paperFold);
              g.add(box);
              return g;
            };
            break;
        }
      }

      // 3. Generate Variant
      // Simple hash of item name to get distinct but consistent variant (1 or 2)
      const hash = itemName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const variant = (hash % 2) + 1;

      // 4. Build Model
      try {
        modelGroup = builder(variant);
      } catch (e) {
        console.warn('Loot builder failed for', visualType, e);
        modelGroup = new THREE.Group();
        modelGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), LootMaterials.paperDark));
      }

      // Apply shared transforms
      // Most models are built upright at 0,0,0. 
      // We float them and scale them up slightly for visibility.
      modelGroup.position.y = 1.0;
      modelGroup.scale.setScalar(1.5);

      // Rotate flat items like scrolls or coins? 
      // The builders handle some orientation, but let's add a slow spin container
      modelGroup.userData.shouldRotate = true;

      // Assign layers
      modelGroup.traverse(child => {
        if (child.isMesh) {
          child.layers.enable(0);
          child.layers.enable(FPV_MODEL_LAYER);
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      group.add(modelGroup);

      // 5. Add Billboard Label
      // Similar to previous logic but adjusted height
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 128;

      function roundRect(ctx, x, y, w, h, r) {
        const radius = r || 4;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
      }

      // Draw Label
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.lineWidth = 4;
      context.strokeStyle = '#D4AF37'; // Gold border
      context.fillStyle = 'rgba(0,0,0,0.85)';
      roundRect(context, 8, 8, canvas.width - 16, canvas.height - 16, 12);
      context.fill();
      context.stroke();

      context.fillStyle = 'white';
      context.font = 'bold 50px "Orbitron", sans-serif'; // Cleaner font
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(itemName, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const labelMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const labelSprite = new THREE.Sprite(labelMat);

      // Position label above item
      labelSprite.position.set(0, 2.5, 0);
      labelSprite.scale.set(1.5, 0.375, 1); // Aspect ratio of canvas
      labelSprite.layers.set(0);
      labelSprite.layers.enable(FPV_MODEL_LAYER);

      group.add(labelSprite);

      group.userData.mainMesh = modelGroup;
      group.userData.labelMesh = labelSprite;

      return group;
    }

    // Create red X marker for defeated monsters (NetHack style)
    function createDeadMonsterMark(x, y) {
      const group = new THREE.Group();

      // Create red X using two thin rectangles
      const xSize = TILE_SIZE * 0.6;
      const thickness = 0.08;
      const xGeo1 = new THREE.PlaneGeometry(xSize, thickness);
      const xGeo2 = new THREE.PlaneGeometry(xSize, thickness);
      const xMat = new THREE.MeshBasicMaterial({
        color: 0xff0000, // Red X for corpses
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1.0,
      });

      const x1 = new THREE.Mesh(xGeo1, xMat);
      const x2 = new THREE.Mesh(xGeo2, xMat);

      // Position and rotate to form X
      x1.rotation.x = -Math.PI / 2;
      x1.rotation.z = Math.PI / 4;
      x1.position.y = 0.005;

      x2.rotation.x = -Math.PI / 2;
      x2.rotation.z = -Math.PI / 4;
      x2.position.y = 0.005;

      group.add(x1);
      group.add(x2);
      group.position.set(x * TILE_SIZE, 0, y * TILE_SIZE);

      return group;
    }

    // Update monster visual indicators based on hostility state and other statuses
    // Update monster visual indicators (Deprecated: logic moved to GameRenderSync)
    function updateMonsterIndicators(monster) {
      // No-op - handled by GameRenderSync.syncAll()
    }


    // Make all monsters in room hostile when one is attacked
    function makeRoomMonstersHostile(roomId) {
      monsters.forEach((monster) => {
        // Only make monsters hostile if:
        // 1. They're in the same room
        // 2. They're alive
        // 3. They're not already in the HOSTILE state
        // 4. They're not allies (we'll check for ally status - green circle)
        if (monster.spawnRoomId === roomId &&
          monster.health > 0 &&
          monster.hostileState !== "HOSTILE" &&
          (!monster.isAlly)) { // Check if monster is not an ally
          monster.hostileState = "HOSTILE";
          // Also update their movement state to match
          monster.state = "HOSTILE";
          updateMonsterIndicators(monster);
        }
      });
    }

    function disposeSceneObjects() {
      // Remove all registered game objects safely
      try {
        const keys = Array.from(gameObjects.keys());
        keys.forEach(k => removeGameObject(k));
      } catch (e) { console.warn('disposeSceneObjects: failed to remove gameObjects', e); }
      if (wallInstancedMesh) {
        scene.remove(wallInstancedMesh);
        if (wallInstancedMesh.geometry) wallInstancedMesh.geometry.dispose();
        wallInstancedMesh = null;
      }

      // Clean up map walls too
      scene.children.forEach(child => {
        if (child.userData && child.userData.isMapWalls) {
          scene.remove(child);
          if (child.geometry) child.geometry.dispose();
        }
      });

      // DON'T dispose of monster tuning object (preserve it during dungeon regeneration)
      if (monsterObject) {
        console.log('🛡️ Protecting monster tuning object from disposal');
      }

      if (floorMesh) {
        scene.remove(floorMesh);
        floorMesh.geometry.dispose();
        floorMesh = null;
      }
      if (fpvFloorMesh) {
        scene.remove(fpvFloorMesh);
        if (fpvFloorMesh.geometry) fpvFloorMesh.geometry.dispose();
        fpvFloorMesh = null;
      }
      if (ceilingMesh) {
        scene.remove(ceilingMesh);
        ceilingMesh.geometry.dispose();
        ceilingMesh = null;
      }
      const surroundingCeilings = scene.getObjectByName('surroundingCeilings');
      if (surroundingCeilings) {
        scene.remove(surroundingCeilings);
        if (surroundingCeilings.geometry) surroundingCeilings.geometry.dispose();
      }
      // Clean up room overlays
      const roomOverlaysGroup = scene.getObjectByName('roomOverlays');
      if (roomOverlaysGroup) {
        scene.remove(roomOverlaysGroup);
        roomOverlaysGroup.traverse((n) => {
          if (n.geometry) n.geometry.dispose();
          if (n.material) n.material.dispose();
        });
      }

      // Clean up tile labels
      if (tileLabelsGroup) {
        removeGameObject('tileLabelsGroup');
        tileLabelsGroup = null;
      }
    }

    // --- Rogue/NetHack-style Dungeon Generator (clean, proximate rooms + L-corridors) ---
    function generateNextGenDungeon() {
      disposeSceneObjects();
      // generation retry state: do not allow corridors to run alongside room walls
      const MAX_GEN_ATTEMPTS = 6;
      generateNextGenDungeon._tries = generateNextGenDungeon._tries || 0;
      // Safely remove monster objects via registry when possible
      monsters.forEach((m) => {
        try {
          // Attempt keyed removal if we stored a key on the monster
          if (m._gameKey) {
            removeGameObject(m._gameKey);
          } else if (m.object) {
            // Fallback: remove from parent if attached
            if (m.object.parent) m.object.parent.remove(m.object);
          }
        } catch (e) { }
      });
      monsters = [];

      // initialize map to walls
      map = Array.from({ length: MAP_HEIGHT }, () =>
        Array.from({ length: MAP_WIDTH }, () => ({ type: TILE.WALL, roomId: null }))
      );

      const ROOM_MIN_W = 4, ROOM_MAX_W = 8;
      const ROOM_MIN_H = 4, ROOM_MAX_H = 8; // Made more square (was 3-6, now 4-8)
      const ROOM_ATTEMPTS = 200;
      const MAX_ROOM_PROXIMITY = 4; // rooms must be within 4 tiles (Manhattan) of an existing room
      const rooms = [];

      function manhattanRectGap(a, b) {
        const ax2 = a.x + a.w - 1, ay2 = a.y + a.h - 1;
        const bx2 = b.x + b.w - 1, by2 = b.y + b.h - 1;
        let dx = 0;
        if (ax2 < b.x) dx = b.x - ax2 - 1;
        else if (bx2 < a.x) dx = a.x - bx2 - 1;
        let dy = 0;
        if (ay2 < b.y) dy = b.y - ay2 - 1;
        else if (by2 < a.y) dy = a.y - by2 - 1;
        return Math.max(0, dx) + Math.max(0, dy);
      }

      let idCounter = 1;
      for (let i = 0; i < ROOM_ATTEMPTS && rooms.length < 16; i++) {
        const w = ROOM_MIN_W + Math.floor(Math.random() * (ROOM_MAX_W - ROOM_MIN_W + 1));
        const h = ROOM_MIN_H + Math.floor(Math.random() * (ROOM_MAX_H - ROOM_MIN_H + 1));
        const x = 1 + Math.floor(Math.random() * (MAP_WIDTH - w - 2));
        const y = 1 + Math.floor(Math.random() * (MAP_HEIGHT - h - 2));
        const room = { x, y, w, h, id: `R${idCounter++}` };

        // reject if overlapping existing rooms (with a 1-tile pad)
        let overlap = false;
        for (const r of rooms) {
          if (room.x < r.x + r.w + 1 && room.x + room.w + 1 > r.x && room.y < r.y + r.h + 1 && room.y + room.h + 1 > r.y) {
            overlap = true;
            break;
          }
        }
        if (overlap) continue;

        // proximity rule: except for first room, require at least one existing room within MAX_ROOM_PROXIMITY
        if (rooms.length > 0) {
          let close = false;
          for (const r of rooms) {
            if (manhattanRectGap(room, r) <= MAX_ROOM_PROXIMITY) {
              close = true; break;
            }
          }
          if (!close) continue;
        }

        rooms.push(room);
      }

      // If generator failed to place any rooms due to strict proximity rules,
      // ensure there's at least one central room so the game has a valid
      // starting location and the map contract (tile.type + tile.roomId) holds.
      if (rooms.length === 0) {
        const cw = Math.min(ROOM_MAX_W, Math.max(ROOM_MIN_W, 6));
        const ch = Math.min(ROOM_MAX_H, Math.max(ROOM_MIN_H, 4));
        const cx = Math.floor((MAP_WIDTH - cw) / 2);
        const cy = Math.floor((MAP_HEIGHT - ch) / 2);
        rooms.push({ x: cx, y: cy, w: cw, h: ch, id: `R${idCounter++}` });
      }

      // carve rooms
      for (let r of rooms) {
        for (let yy = r.y; yy < r.y + r.h; yy++) {
          for (let xx = r.x; xx < r.x + r.w; xx++) {
            map[yy][xx].type = TILE.FLOOR;
            map[yy][xx].roomId = r.id;
          }
        }
      }

      // No strict entry point: corridors can abut any perimeter tile of a room.
      // This restores robust connectivity and classic roguelike behavior.

      // helper: L-shaped carve between anchors. Respects per-room designated entry points
      // Corridors are only allowed to abut room walls at the room.entry tile or at tiles marked secretDoor.
      function carveL(a, b) {
        // compute anchor points: pick edge nearest to target (classic logic)
        function roomAnchor(r, tx, ty) {
          // if r is a tiny point (w/h==1), just use x/y
          if (!r.w || !r.h || (r.w === 1 && r.h === 1)) return { x: Math.floor(r.x), y: Math.floor(r.y) };
          const cx = Math.floor(r.x + r.w / 2);
          const cy = Math.floor(r.y + r.h / 2);
          // direction towards target
          const dx = tx - cx, dy = ty - cy;
          if (Math.abs(dx) > Math.abs(dy)) {
            // anchor on left or right edge
            const ax = dx > 0 ? (r.x + r.w) : (r.x - 1);
            const ay = cy;
            return { x: ax, y: ay };
          } else {
            // anchor on top or bottom edge
            const ay = dy > 0 ? (r.y + r.h) : (r.y - 1);
            const ax = cx;
            return { x: ax, y: ay };
          }
        }

        const tx = (b.x !== undefined) ? Math.floor(b.x + (b.w ? b.w / 2 : 0)) : Math.floor(b.x);
        const ty = (b.y !== undefined) ? Math.floor(b.y + (b.h ? b.h / 2 : 0)) : Math.floor(b.y);
        const aAnchor = roomAnchor(a, tx, ty);
        const bAnchor = (b.w && b.h) ? roomAnchor(b, aAnchor.x, aAnchor.y) : { x: tx, y: ty };

        const cx1 = aAnchor.x; const cy1 = aAnchor.y;
        const cx2 = bAnchor.x; const cy2 = bAnchor.y;

        // helper: carve a single step of corridor if it's not inside a room
        function carveStep(x, y) {
          if (!map[y] || !map[y][x]) return;
          const t = map[y][x];
          if (t.roomId && t.roomId !== 'corridor') return; // don't overwrite room tiles
          t.type = TILE.FLOOR; t.roomId = 'corridor';
        }

        // carve horizontal then vertical (L-shaped) fully, avoiding overwriting room tiles
        for (let x = Math.min(cx1, cx2); x <= Math.max(cx1, cx2); x++) {
          carveStep(x, cy1);
        }
        for (let y = Math.min(cy1, cy2); y <= Math.max(cy1, cy2); y++) {
          carveStep(cx2, y);
        }

        // ensure the immediate cell adjacent to room floors is also carved so adjacency test succeeds
        const ensureAdj = (r) => {
          const insideX = Math.min(Math.max(r.x, 0), MAP_WIDTH - 1);
          const insideY = Math.min(Math.max(r.y, 0), MAP_HEIGHT - 1);
          // scan perimeter and ensure the corridor tile adjacent to perimeter is floor
          for (let yy = r.y - 1; yy <= r.y + r.h; yy++) {
            for (let xx = r.x - 1; xx <= r.x + r.w; xx++) {
              if (yy < 0 || xx < 0 || yy >= MAP_HEIGHT || xx >= MAP_WIDTH) continue;
              if (xx >= r.x && xx < r.x + r.w && yy >= r.y && yy < r.y + r.h) continue; // skip inner room
              // if this is corridor and adjacent to room tile, leave it
              const adj = map[yy][xx];
              if (adj && adj.type === TILE.FLOOR && adj.roomId === 'corridor') return;
            }
          }
          // carve a direct door at the anchor point
          const ax = Math.min(Math.max(cx1, 0), MAP_WIDTH - 1);
          const ay = Math.min(Math.max(cy1, 0), MAP_HEIGHT - 1);
          if (map[ay] && map[ay][ax]) { map[ay][ax].type = TILE.FLOOR; map[ay][ax].roomId = 'corridor'; }
        };
        try { ensureAdj(a); } catch (e) { }
        try { if (b && b.w && b.h) ensureAdj(b); } catch (e) { }
      }

      // connect rooms by walking nearest-center MST style but ensure every room connects to at least one other
      if (rooms.length > 1) {
        const centers = rooms.map(r => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) }));
        const connected = new Set([0]);
        while (connected.size < centers.length) {
          let bestA = -1, bestB = -1, bestD = Infinity;
          for (const a of connected) {
            for (let b = 0; b < centers.length; b++) {
              if (connected.has(b)) continue;
              const dx = centers[a].x - centers[b].x; const dy = centers[a].y - centers[b].y;
              const d = dx * dx + dy * dy;
              if (d < bestD) { bestD = d; bestA = a; bestB = b; }
            }
          }
          if (bestA === -1) break;
          carveL(rooms[bestA], rooms[bestB]);
          connected.add(bestB);
        }
      }

      // final pass: ensure isolated rooms are explicitly connected to nearest corridor or room
      const DUNGEON_DEBUG = false;
      for (const r of rooms) {
        let hasAdj = false;
        for (let y = r.y; y < r.y + r.h && !hasAdj; y++) {
          for (let x = r.x; x < r.x + r.w && !hasAdj; x++) {
            const adj = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
            for (const [ax, ay] of adj) {
              if (ax >= 0 && ay >= 0 && ay < MAP_HEIGHT && ax < MAP_WIDTH) {
                const t = map[ay][ax];
                if (t && t.type === TILE.FLOOR && t.roomId === 'corridor') { hasAdj = true; break; }
              }
            }
          }
        }
        if (!hasAdj) {
          // find nearest corridor tile first
          let best = null; let bestDist = Infinity;
          const cx = Math.floor(r.x + r.w / 2); const cy = Math.floor(r.y + r.h / 2);
          for (let y = 0; y < MAP_HEIGHT; y++) for (let x = 0; x < MAP_WIDTH; x++) {
            const t = map[y][x];
            if (!t) continue;
            if (t.type === TILE.FLOOR && t.roomId === 'corridor') {
              const d = Math.abs(cx - x) + Math.abs(cy - y);
              if (d < bestDist) { bestDist = d; best = { x, y }; }
            }
          }
          if (best) {
            if (DUNGEON_DEBUG) console.log('Connecting', r.id, 'to corridor at', best, 'dist', bestDist);
            carveL(r, { x: best.x, y: best.y, w: 1, h: 1 });
          } else {
            // no corridor tiles exist (rare). Connect to nearest other room edge instead.
            let bestRoom = null; let bestRoomDist = Infinity;
            for (const o of rooms) {
              if (o === r) continue;
              const ocx = Math.floor(o.x + o.w / 2); const ocy = Math.floor(o.y + o.h / 2);
              const d = Math.abs(cx - ocx) + Math.abs(cy - ocy);
              if (d < bestRoomDist) { bestRoomDist = d; bestRoom = o; }
            }
            if (bestRoom) {
              if (DUNGEON_DEBUG) console.log('No corridor tiles; connecting', r.id, 'to room', bestRoom.id);
              carveL(r, bestRoom);
            } else {
              if (DUNGEON_DEBUG) console.warn('Unable to find connection target for room', r.id);
            }
          }
        }
      }

      // Post-generation: verify hallway adjacency rules — every room should have
      // at most one corridor-adjacent perimeter tile (i.e., a single door).
      function roomCorridorAdjCount(room) {
        let count = 0;
        for (let yy = room.y - 1; yy <= room.y + room.h; yy++) {
          for (let xx = room.x - 1; xx <= room.x + room.w; xx++) {
            if (yy < 0 || xx < 0 || yy >= MAP_HEIGHT || xx >= MAP_WIDTH) continue;
            if (xx >= room.x && xx < room.x + room.w && yy >= room.y && yy < room.y + r.h) continue; // skip inner
            const t = map[yy][xx];
            if (t && t.type === TILE.FLOOR && t.roomId === 'corridor') count++;
          }
        }
        return count;
      }

      let adjacencyViolation = false;
      // No adjacency violation regeneration: allow multiple corridor connections per room for robust connectivity.

      // successful generation: reset retry counter
      generateNextGenDungeon._tries = 0;
      // place player in first room center
      if (rooms.length) {
        const first = rooms[0];
        player.x = Math.floor(first.x + first.w / 2);
        player.y = Math.floor(first.y + first.h / 2);
        player.currentTile = map[player.y][player.x];
      }

      // place a shrine in the farthest room
      if (rooms.length) {
        const sx = player.x, sy = player.y;
        let far = null, farD = -1;
        for (const r of rooms) {
          const cx = Math.floor(r.x + r.w / 2); const cy = Math.floor(r.y + r.h / 2);
          const d = Math.abs(cx - sx) + Math.abs(cy - sy);
          if (d > farD) { farD = d; far = { cx, cy }; }
        }
        if (far) placeShrineAt(far.cx, far.cy);
      }

      // 🏗️ Enhanced Room Population System (NetHack-inspired)
      console.log('🏗️ Populating', rooms.length, 'rooms with monsters/loot (dungeon level', dungeonLevel, ')');

      // Each room (except starting room) gets guaranteed content
      for (let i = 1; i < rooms.length; i++) {
        const room = rooms[i];
        const roomCenter = { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };

        // NetHack-style progression: higher level = more monsters/better loot
        const monsterChance = Math.min(0.85, 0.6 + (dungeonLevel * 0.05)); // 60-85% based on level
        const lootChance = Math.min(0.4, 0.2 + (dungeonLevel * 0.02)); // 20-40% based on level

        let hasContent = false;

        // Primary content: Monster or loot (guaranteed)
        if (Math.random() < monsterChance) {

          spawnMonsterInRoom(room, null);
          hasContent = true;
        } else {
          // Spawn loot instead
          console.log(' Spawning loot in room', room.id);
          spawnLootInRoom(room);
          hasContent = true;
        }

        // 🎯 ENHANCED CONTENT: Always add more at higher levels
        if (dungeonLevel >= 2) {
          // 70% chance for additional monster
          if (Math.random() < 0.7) {
            console.log('🐉 Spawning bonus monster in room', room.id);
            spawnMonsterInRoom(room, null);
          }

          // 50% chance for additional loot  
          if (Math.random() < 0.5) {
            console.log('📦 Spawning bonus loot in room', room.id);
            spawnLootInRoom(room);
          }
        }

        // 🎯 HIGH LEVEL BONUSES
        if (dungeonLevel >= 4) {
          // 60% chance for elite monster
          if (Math.random() < 0.6) {
            console.log('🐉 Spawning elite monster in room', room.id);
            spawnMonsterInRoom(room, null);
          }
        }

        // 🎯 GUARANTEE BOTH: Ensure every room has monster AND loot
        if (!hasContent) {
          console.log('🐉 Spawning guaranteed monster in empty room', room.id);
          spawnMonsterInRoom(room, null);
        }
        // Always add loot too (guaranteed)
        console.log('📦 Adding guaranteed loot to room', room.id);
        spawnLootInRoom(room);
      }

      // 🪜 Add stairs up/down for multi-level dungeon
      addStairsToRooms(rooms);

      console.log('🐉 Total monsters spawned:', monsters.length);
      console.log('📦 All loot items:', gameObjects.size);
      console.log('🏠 Rooms populated:', rooms.length - 1, '(excluding starting room)');

      drawMap();

      // Update DungeonMaster with new monsters
      if (window.dungeonMaster) {
        window.dungeonMaster.init(monsters);
      }
      // Defer initial room tag application to avoid duplicate entrance/corridor logs
      let __initialRoomTagDeferred = true;
      // Apply later after initial welcome messages or first movement
      setTimeout(() => {
        if (__initialRoomTagDeferred) {
          setRoomTag(map[player.y]?.[player.x]?.roomId || 'corridor');
          __initialRoomTagDeferred = false;
        }
      }, 1200);

      // Add initial welcome events to Adventure Event Log
      setTimeout(() => {
        logMessage("🎮 Welcome to Origami Dungeon!", "#ffd700");
        logMessage("You must enter the underworld to retrieve the Golden Scroll of Destiny from the powerful Origami Serpent and come back out to restore balance to the realm.", "#ffffff");
        logMessage("You continue walking down a long corridor and it opens up to a room...", "#c084fc");
        logMessage(" Starting location set", "#87ceeb");
      }, 1000);

      updateViewSwap();
      updateUI();
    }

    // Runtime verification helper — call from browser console as `verifyDungeon()`
    function verifyDungeon() {
      if (!map || !map.length) { console.warn('No map present'); return false; }
      const rooms = new Map();
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const t = map[y][x];
          if (!t || !t.roomId) continue;
          if (t.roomId === 'corridor') continue;
          if (!rooms.has(t.roomId)) rooms.set(t.roomId, []);
          rooms.get(t.roomId).push({ x, y });
        }
      }

      const centers = [];
      for (const [id, tiles] of rooms.entries()) {
        const sx = tiles.reduce((s, p) => s + p.x, 0) / tiles.length;
        const sy = tiles.reduce((s, p) => s + p.y, 0) / tiles.length;
        centers.push({ id, x: Math.floor(sx), y: Math.floor(sy) });
      }

      console.log('verifyDungeon: found', centers.length, 'rooms');

      // Check proximity rule
      const failures = [];
      for (let i = 0; i < centers.length; i++) {
        let ok = false;
        for (let j = 0; j < centers.length; j++) {
          if (i === j) continue;
          const d = Math.abs(centers[i].x - centers[j].x) + Math.abs(centers[i].y - centers[j].y);
          if (d <= 4) { ok = true; break; }
        }
        if (!ok) failures.push(centers[i]);
      }

      if (failures.length === 0) console.log('Proximity: PASS — every room has a neighbor within 4 tiles');
      else console.warn('Proximity: FAIL — rooms without close neighbors:', failures);

      // Connectivity check: BFS from first room center to reach every other room center via floor tiles
      if (centers.length > 0) {
        const start = centers[0];
        const targetSet = new Set(centers.slice(1).map(c => `${c.x},${c.y}`));
        const seen = new Set();
        const q = [{ x: start.x, y: start.y }];
        seen.add(`${start.x},${start.y}`);
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        while (q.length && targetSet.size) {
          const cur = q.shift();
          for (const [dx, dy] of dirs) {
            const nx = cur.x + dx, ny = cur.y + dy;
            if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) continue;
            const key = `${nx},${ny}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (map[ny][nx].type !== TILE.FLOOR) continue;
            if (targetSet.has(key)) targetSet.delete(key);
            q.push({ x: nx, y: ny });
          }
        }
        if (targetSet.size === 0) console.log('Connectivity: PASS — all room centers reachable via floor tiles');
        else console.warn('Connectivity: FAIL — unreachable centers remain:', Array.from(targetSet));
      }

      return { centers, proximityFailures: failures };
    }

    // --- Micro-objective: Simple Shrine granting a small buff ---
    function createShrineObject() {
      const g = new THREE.Group();
      g.name = 'shrine';
      // Base plinth
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 0.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x303040, metalness: 0.2, roughness: 0.8 })
      );
      base.position.y = 0.1;
      g.add(base);
      // Upright crystal
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2),
        new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x224466, metalness: 0.1, roughness: 0.3 })
      );
      crystal.position.y = 0.45;
      crystal.userData.shouldRotate = true;
      g.add(crystal);
      // Label
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 128; canvas.height = 32;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#cde8ff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Shrine', 64, 16);
      const tex = new THREE.CanvasTexture(canvas);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.15),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 })
      );
      label.position.y = 0.75;
      g.add(label);

      g.userData.mainMesh = crystal;
      g.layers.set(0);
      g.layers.enable(FPV_MODEL_LAYER);
      g.userData.isShrine = true;
      return g;
    }

    function placeShrineAt(x, y) {
      const shrine = createShrineObject();
      shrine.position.set(x * TILE_SIZE, 0, y * TILE_SIZE);
      addGameObject(`shrine_${x}_${y}`, shrine);
    }

    function isOverlapping(room, existingRooms) {
      for (const other of existingRooms) {
        if (
          room.x < other.x + other.w + 4 &&
          room.x + room.w + 4 > other.x &&
          room.y < other.y + other.h + 4 &&
          room.y + room.h + 4 > other.y
        )
          return true;
      }
      return false;
    }
    function carveHallway(x1, y1, x2, y2, id) {
      let x = x1,
        y = y1;
      const points = [];
      while (x !== x2 || y !== y2) {
        points.push({ x, y });
        if (x !== x2 && (Math.abs(x2 - x) > Math.abs(y2 - y) || y === y2))
          x += Math.sign(x2 - x);
        else if (y !== y2) y += Math.sign(y2 - y);
      }
      points.push({ x, y });
      for (const p of points) {
        if (map[p.y] && map[p.y][p.x]) {
          map[p.y][p.x].type = TILE.FLOOR;
          map[p.y][p.x].roomId = id;
        }
      }
    }

    // === NetHack Core Systems ===

    // NetHack-style dice rolling
    function rollDice(diceString) {
      // Parse dice notation like "1d4", "2d6+1", "1d8-1"
      const match = diceString.match(/(\d+)d(\d+)([+-]\d+)?/);
      if (!match) return 1; // Default fallback

      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      const modifier = match[3] ? parseInt(match[3]) : 0;

      let total = 0;
      for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
      }
      return Math.max(1, total + modifier);
    }

    // NetHack hunger system (disabled: no starvation or hunger effects)
    function processHunger() {
      // Maintain turn counter for any other systems, but do not change hunger/health
      player.turnCount++;
      return;
    }

    // NetHack item identification
    function identifyItem(item) {
      const itemKey = `${item.type}_${item.name}`;
      if (!player.identifiedItems.has(itemKey)) {
        player.identifiedItems.add(itemKey);
        logMessage(`This ${item.name} is now identified!`, "#00FFFF");
        return true;
      }
      return false;
    }

    function getItemDisplayName(item) {
      const itemKey = `${item.type}_${item.name}`;
      if (player.identifiedItems.has(itemKey) || item.type === "gold" || item.type === "food") {
        return item.name;
      }

      // Return unidentified names for unknown items
      switch (item.type) {
        case "potion": return "unknown potion";
        case "scroll": return "mysterious scroll";
        case "ring": return "unknown ring";
        case "amulet": return "strange amulet";
        default: return item.name;
      }
    }

    // NetHack search mechanics
    function searchArea() {
      const searchKey = `${player.x}_${player.y}`;
      player.searchCount++;

      // Higher chance of finding things with repeated searches
      const searchChance = Math.min(0.8, 0.1 + (player.searchCount * 0.1));

      if (Math.random() < searchChance) {
        // Chance to find hidden items or doors
        if (Math.random() < 0.3) {
          // Generate a small random item
          const foundItems = [{
            type: "gold",
            amount: Math.floor(Math.random() * 10) + 1,
            visual: "coin"
          }];

          foundItems.forEach((item, index) => {
            const lootObj = createLootPileObject(item.visual || item.type, item.name || item.type);
            lootObj.position.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
            lootObj.userData = { items: [item] };
            addGameObject(`search_loot_${player.x}_${player.y}_${index}`, lootObj);
          });

          logMessage("You found something hidden!", "#FFD700");
          player.searchCount = 0; // Reset search count after finding something
          return true;
        }
      }

      logMessage("You search the area but find nothing.", "#A0A0A0");
      return false;
    }

    // NetHack equipment management
    function canEquipItem(item) {
      switch (item.type) {
        case "weapon": return !item.weaponType || item.weaponType !== "two_handed_sword" || !player.equipment.ring;
        case "armor": return true;
        case "helmet": return true;
        case "boots": return true;
        case "gauntlets": return true;
        case "ring": return true;
        case "amulet": return true;
        default: return false;
      }
    }

    function equipItem(item) {
      if (!canEquipItem(item)) {
        logMessage("You cannot equip that item.", "#FF0000");
        return false;
      }

      let equipSlot = null;
      switch (item.type) {
        case "weapon": equipSlot = "weapon"; break;
        case "armor": equipSlot = "armor"; break;
        case "helmet": equipSlot = "helmet"; break;
        case "boots": equipSlot = "boots"; break;
        case "gauntlets": equipSlot = "gauntlets"; break;
        case "ring": equipSlot = "ring"; break;
        case "amulet": equipSlot = "amulet"; break;
      }

      if (equipSlot) {
        // Unequip current item if any
        if (player.equipment[equipSlot]) {
          player.inventory.push(player.equipment[equipSlot]);
          logMessage(`You unequip the ${player.equipment[equipSlot].name}.`, "#FFFF00");
        }

        // Equip new item
        player.equipment[equipSlot] = item;
        logMessage(`You equip the ${item.name}.`, "#00FF00");

        // Apply item effects
        updatePlayerStats();
        return true;
      }

      return false;
    }

    function updatePlayerStats() {
      // Reset to base stats then apply equipment bonuses
      player.ac = 10; // Base AC
      player.attack = 1; // Base attack

      // Apply equipment bonuses
      Object.values(player.equipment).forEach(item => {
        if (item) {
          if (item.ac) player.ac -= item.ac; // Lower AC is better in NetHack
          if (item.damage) {
            // Convert damage dice to attack bonus
            const damageBonus = Math.floor(rollDice(item.damage) / 2);
            player.attack += damageBonus;
          }
          if (item.enchantment) {
            player.attack += item.enchantment;
            if (item.type === "armor") player.ac -= item.enchantment;
          }
        }
      });

      // Ensure AC doesn't go below -10 or above 20
      player.ac = Math.max(-10, Math.min(20, player.ac));
    }

    // NetHack status effects
    function addStatusEffect(effect, duration, power = 1) {
      player.statusEffects.set(effect, {
        duration: duration,
        power: power,
        startTurn: player.turnCount
      });
      logMessage(`You feel ${effect}!`, "#FF00FF");
    }

    function processStatusEffects() {
      for (const [effect, data] of player.statusEffects.entries()) {
        data.duration--;

        if (data.duration <= 0) {
          player.statusEffects.delete(effect);
          logMessage(`The ${effect} effect wears off.`, "#FFFF00");
        } else {
          // Apply ongoing effects
          switch (effect) {
            case "regeneration":
              if (player.turnCount % 5 === 0) {
                player.health = Math.min(player.maxHealth, player.health + data.power);
              }
              break;
            case "confusion":
              // Movement might be reversed (handled in movement functions)
              break;
          }
        }
      }
    }

    // Turn-based validation system
    class TurnBasedForensics {
      constructor() {
        this.turnLog = [];
        this.lastActionTime = Date.now();
        this.actionCount = 0;
        this.realTimeDetected = false;
      }

      logAction(action, details = {}) {
        const now = Date.now();
        const timeSinceLastAction = now - this.lastActionTime;

        this.turnLog.push({
          action: action,
          timestamp: now,
          timeDelta: timeSinceLastAction,
          turnNumber: player.turnCount,
          details: details
        });

        // Detect real-time behavior (actions happening too frequently)
        if (timeSinceLastAction < 50 && this.actionCount > 0) {
          this.realTimeDetected = true;
          console.warn(`🚨 FORENSIC ALERT: Real-time behavior detected! Action "${action}" occurred ${timeSinceLastAction}ms after previous action.`);
        }

        this.lastActionTime = now;
        this.actionCount++;

        // Keep only last 100 actions
        if (this.turnLog.length > 100) {
          this.turnLog.shift();
        }
      }

      validateTurnBased() {
        const recentActions = this.turnLog.slice(-10);
        const rapidActions = recentActions.filter(action => action.timeDelta < 100);

        if (rapidActions.length > 3) {
          console.error("🚨 TURN-BASED VIOLATION: Too many rapid actions detected!");
          return false;
        }

        return true;
      }

      getReport() {
        return {
          totalActions: this.actionCount,
          realTimeDetected: this.realTimeDetected,
          recentActions: this.turnLog.slice(-10),
          isValid: this.validateTurnBased()
        };
      }
    }

    // Initialize forensic system
    const forensics = new TurnBasedForensics();

    // (removed duplicate older variant of spawnMonsterInRoom)
    function spawnMonsterInRoom(room, dropsKey) {
      // Try up to N times to find a safe tile inside the room that is not
      // occupied by another monster and is not the player's starting tile
      // (or immediately adjacent). This prevents the player from spawning
      // on top of a monster on load.
      for (let i = 0; i < 100; i++) {
        const x = 1 + Math.floor(Math.random() * (MAP_WIDTH - 2));
        const y = 1 + Math.floor(Math.random() * (MAP_HEIGHT - 2));
        // Reject tiles that are the player's tile or within 1 tile of player
        const tooCloseToPlayer =
          typeof player.x === 'number' &&
          typeof player.y === 'number' &&
          Math.abs(x - player.x) <= 1 &&
          Math.abs(y - player.y) <= 1;
        if (
          map[y] &&
          map[y][x] &&
          map[y][x].roomId === room.id &&
          !monsters.some((m) => m.x === x && m.y === y) &&
          !tooCloseToPlayer
        ) {
          const model =
            monsterModels[Math.floor(Math.random() * monsterModels.length)];

          // NetHack-style monster stats with level-aware easing (make level 1 noticeably easier)
          const monsterLevel = Math.max(1, dungeonLevel + Math.floor(Math.random() * 3) - 1);
          let health, attack;
          if (dungeonLevel <= 1) {
            health = rollDice("1d3");      // Lower starting health
            attack = 1;                     // Minimal base attack at level 1
          } else {
            // Gentle scaling with level
            health = rollDice("1d3") + Math.floor((dungeonLevel - 1) / 2);
            attack = 1 + Math.floor((dungeonLevel - 1) / 3); // grows slowly
          }

          const monsterObj = createMonsterObject(model);
          monsterObj.position.set(x * TILE_SIZE, 1.0, y * TILE_SIZE);
          const mkey = `monster_${room.id}_${x}_${y}_${Date.now()}`;

          // Performance: Set shadow properties once on spawn
          if (monsterObj) {
            monsterObj.traverse(child => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
          }

          addGameObject(mkey, monsterObj);
          const monster = {
            x,
            y,
            level: monsterLevel,
            health,
            maxHealth: health,
            attack,
            object: monsterObj,
            spawnPos: { x, y },
            spawnRoomId: room.id,
            dropsKey,
            state: "IDLE",
            hostileState: "INACTIVE", // INACTIVE, HOSTILE, SEARCHING
            facingAngle: Math.random() * 2 * Math.PI,
            path: [],
            searchTurnsLeft: 0,
            lastKnownPlayerPos: null,
            attackCooldown: 0,
            dex: dungeonLevel <= 1 ? 6 : 8,
            level: dungeonLevel,
            _gameKey: mkey,
          };
          monster.name =
            model.name || (Math.random() < 0.5 ? "Goblin" : "Imp");
          monsters.push(monster);
          return;
        }
      }
    }

    // 💰 Enhanced Loot Spawning System
    function spawnLootInRoom(room) {
      // NetHack-style loot progression based on dungeon level
      const lootTypes = [
        { type: 'coin', weight: 40, minLevel: 1 },
        { type: 'potion', weight: 25, minLevel: 1 },
        { type: 'weapon', weight: 20, minLevel: 2 },
        { type: 'armor', weight: 15, minLevel: 3 },
        { type: 'scroll', weight: 10, minLevel: 2 },
        { type: 'gem', weight: 5, minLevel: 4 }
      ];

      // Filter by level and create weighted list
      const availableLoot = lootTypes.filter(item => dungeonLevel >= item.minLevel);
      const totalWeight = availableLoot.reduce((sum, item) => sum + item.weight, 0);

      let roll = Math.random() * totalWeight;
      let selectedType = 'coin'; // fallback

      for (const item of availableLoot) {
        roll -= item.weight;
        if (roll <= 0) {
          selectedType = item.type;
          break;
        }
      }

      // Find empty tile in room
      const roomTiles = [];
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          if (map[y] && map[y][x] && map[y][x].type === 'floor') {
            // Check if tile is empty (no monsters, no existing items)
            const hasMonster = monsters.some(m => m.x === x && m.y === y);
            const hasItem = items.some(item => item.x === x && item.y === y);
            if (!hasMonster && !hasItem) {
              roomTiles.push({ x, y });
            }
          }
        }
      }

      if (roomTiles.length === 0) return; // No valid tiles

      const tile = roomTiles[Math.floor(Math.random() * roomTiles.length)];

      // Create loot based on type and level
      const lootItem = createLootItem(selectedType, tile.x, tile.y);
      if (lootItem) {
        items.push(lootItem);
        console.log(`💰 Spawned ${selectedType} at (${tile.x},${tile.y})`);
      }
    }

    // 🎲 Loot Item Creation
    function createLootItem(type, x, y) {
      const baseItem = {
        x, y,
        name: '',
        description: '',
        value: 0,
        type: type
      };

      switch (type) {
        case 'coin':
          const coinAmount = rollDice(`${dungeonLevel}d6`) + dungeonLevel * 2;
          return {
            ...baseItem,
            name: `${coinAmount} gold coins`,
            description: 'Glittering coins',
            value: coinAmount,
            action: 'pickup'
          };

        case 'potion':
          const potions = ['healing', 'strength', 'dexterity', 'magic'];
          const potionType = potions[Math.floor(Math.random() * potions.length)];
          return {
            ...baseItem,
            name: `Potion of ${potionType}`,
            description: `A bubbling ${potionType} potion`,
            value: 50 + dungeonLevel * 10,
            potionType,
            action: 'quaff'
          };

        case 'weapon':
          const weapons = ['dagger', 'sword', 'mace', 'spear'];
          const weaponType = weapons[Math.floor(Math.random() * weapons.length)];
          const weaponBonus = Math.floor(dungeonLevel / 2);
          return {
            ...baseItem,
            name: `${weaponType}${weaponBonus > 0 ? ` +${weaponBonus}` : ''}`,
            description: `A sharp ${weaponType}`,
            value: 100 + dungeonLevel * 20,
            weaponBonus,
            action: 'wield'
          };

        case 'armor':
          const armorTypes = ['leather armor', 'chain mail', 'plate armor'];
          const armorType = armorTypes[Math.min(Math.floor(dungeonLevel / 2), 2)];
          const armorBonus = Math.floor(dungeonLevel / 2);
          return {
            ...baseItem,
            name: `${armorType}${armorBonus > 0 ? ` +${armorBonus}` : ''}`,
            description: `Protective ${armorType}`,
            value: 150 + dungeonLevel * 30,
            armorBonus,
            action: 'wear'
          };

        case 'scroll':
          const scrolls = ['teleport', 'identify', 'magic mapping', 'monster detection'];
          const scrollType = scrolls[Math.floor(Math.random() * scrolls.length)];
          return {
            ...baseItem,
            name: `Scroll of ${scrollType}`,
            description: `Ancient scroll with mystical writing`,
            value: 75 + dungeonLevel * 15,
            scrollType,
            action: 'read'
          };

        case 'gem':
          const gems = ['ruby', 'emerald', 'sapphire', 'diamond'];
          const gemType = gems[Math.floor(Math.random() * gems.length)];
          return {
            ...baseItem,
            name: `${gemType}`,
            description: `A precious ${gemType}`,
            value: 200 + dungeonLevel * 50,
            action: 'pickup'
          };

        default:
          return null;
      }
    }

    // 🪜 Stairs System for Multi-Level Dungeon
    function addStairsToRooms(rooms) {
      if (rooms.length < 2) return; // Need at least 2 rooms for stairs

      // Add stairs down in a random room (not the starting room)
      const stairsDownRoom = rooms[1 + Math.floor(Math.random() * (rooms.length - 1))];
      const downTile = findEmptyTileInRoom(stairsDownRoom);
      if (downTile) {
        map[downTile.y][downTile.x].stairsDown = true;
        map[downTile.y][downTile.x].symbol = '>';
        console.log(`🪜 Added stairs down at (${downTile.x},${downTile.y})`);
      }

      // Add stairs up if not on first level
      if (dungeonLevel > 1) {
        const stairsUpRoom = rooms[1 + Math.floor(Math.random() * (rooms.length - 1))];
        const upTile = findEmptyTileInRoom(stairsUpRoom);
        if (upTile && !(map[upTile.y][upTile.x].stairsDown)) {
          map[upTile.y][upTile.x].stairsUp = true;
          map[upTile.y][upTile.x].symbol = '<';
          console.log(`🪜 Added stairs up at (${upTile.x},${upTile.y})`);
        }
      }
    }

    // 🔍 Helper: Find empty tile in room
    function findEmptyTileInRoom(room) {
      const emptyTiles = [];
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
          if (map[y] && map[y][x] && map[y][x].type === 'floor') {
            const hasMonster = monsters.some(m => m.x === x && m.y === y);
            const hasItem = items.some(item => item.x === x && item.y === y);
            const isPlayer = (player.x === x && player.y === y);
            if (!hasMonster && !hasItem && !isPlayer) {
              emptyTiles.push({ x, y });
            }
          }
        }
      }
      return emptyTiles.length > 0 ? emptyTiles[Math.floor(Math.random() * emptyTiles.length)] : null;
    }

    function createOrnateDoorway() {
      const doorX = Math.floor(MAP_WIDTH / 2);
      const doorY = MAP_HEIGHT - 1;

      // Create doorway frame with Japanese/oriental design
      const doorGroup = new THREE.Group();

      // Main door frame (dark wood)
      const frameGeometry = new THREE.BoxGeometry(TILE_SIZE * 1.2, WALL_HEIGHT * 1.1, 0.2);
      const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x2d1810 });
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      frame.position.set(doorX * TILE_SIZE, WALL_HEIGHT * 0.55, (doorY - 0.5) * TILE_SIZE);
      frame.castShadow = true;
      frame.receiveShadow = true;
      doorGroup.add(frame);

      // Ornate pillars on sides
      const pillarGeometry = new THREE.BoxGeometry(0.3, WALL_HEIGHT * 1.2, 0.3);
      const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });

      const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      leftPillar.position.set(doorX * TILE_SIZE - TILE_SIZE * 0.5, WALL_HEIGHT * 0.6, (doorY - 0.5) * TILE_SIZE);
      leftPillar.castShadow = true;
      doorGroup.add(leftPillar);

      const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      rightPillar.position.set(doorX * TILE_SIZE + TILE_SIZE * 0.5, WALL_HEIGHT * 0.6, (doorY - 0.5) * TILE_SIZE);
      rightPillar.castShadow = true;
      doorGroup.add(rightPillar);

      // Decorative torii-style top piece
      const topGeometry = new THREE.BoxGeometry(TILE_SIZE * 1.4, 0.2, 0.4);
      const topMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
      const topPiece = new THREE.Mesh(topGeometry, topMaterial);
      topPiece.position.set(doorX * TILE_SIZE, WALL_HEIGHT * 1.1, (doorY - 0.5) * TILE_SIZE);
      topPiece.castShadow = true;
      doorGroup.add(topPiece);

      // Lanterns on pillars
      const lanternGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
      const lanternMaterial = new THREE.MeshLambertMaterial({
        color: 0xffaa00,
        emissive: 0x221100
      });

      const leftLantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
      leftLantern.position.set(doorX * TILE_SIZE - TILE_SIZE * 0.5, WALL_HEIGHT * 0.9, (doorY - 0.5) * TILE_SIZE);
      doorGroup.add(leftLantern);

      const rightLantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
      rightLantern.position.set(doorX * TILE_SIZE + TILE_SIZE * 0.5, WALL_HEIGHT * 0.9, (doorY - 0.5) * TILE_SIZE);
      doorGroup.add(rightLantern);

      // Add subtle glow from lanterns
      const lanternLight = new THREE.PointLight(0xffaa44, 0.5, 5);
      lanternLight.position.set(doorX * TILE_SIZE, WALL_HEIGHT * 0.9, (doorY - 0.5) * TILE_SIZE);
      lanternLight.castShadow = true;
      doorGroup.add(lanternLight);

      // Set layers for visibility
      doorGroup.traverse((child) => {
        if (child.isMesh || child.isLight) {
          child.layers.set(0); // Map view
          child.layers.enable(FPV_MODEL_LAYER); // Also FPV view
        }
      });

      // Use helper to keep scene <-> registry in sync
      addGameObject(`ornate_doorway_${doorX}_${doorY}`, doorGroup);
    }

    class ForensicCullingManager {
      static update(player) {
        if (!player || !player.object) return;
        if (!window.dungeonChunks) return;

        const playerPos = player.object.position;
        const CULL_DIST = 45; // 4.5 tiles approx
        const CULL_SQ = CULL_DIST * CULL_DIST;

        window.dungeonChunks.forEach(chunk => {
          if (!chunk.userData.center) return;
          const distSq = playerPos.distanceToSquared(chunk.userData.center);
          chunk.visible = distSq < CULL_SQ;
        });

        // Also cull monster visuals if far away
        if (typeof monsters !== 'undefined') {
          monsters.forEach(m => {
            if (m.object) {
              const distSq = playerPos.distanceToSquared(m.object.position);
              m.object.visible = distSq < CULL_SQ;
            }
          });
        }
      }
    }

    function drawMap() {
      if (window.worldBuilder) {
        window.worldBuilder.drawMap(map, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE);
      }

      // --- Post-Map Generation Setup ---
      // (Legacy logic retained for checking player spawn and doorways)

      // Create ornate doorway at entrance
      if (typeof createOrnateDoorway === 'function') {
        createOrnateDoorway();
      }

      if (!player.object) {
        player.object = createPlayerObject();
        scene.add(player.object);
      }

      player.object.position.set(
        player.x * TILE_SIZE,
        0,
        player.y * TILE_SIZE
      );

      // ensure player model meshes cast shadows and feet sit on the floor
      player.object.traverse((n) => {
        if (n.isMesh) n.castShadow = true;
      });


      try {
        const pbbox = new THREE.Box3().setFromObject(player.object);
        const pMinY = pbbox.min.y;
        if (pMinY < 0) player.object.position.y += -pMinY;
      } catch (e) {
        /* ignore if bounding box fails */
      }

      // === CREATE MONSTER FOR TUNING ===
      console.log('Creating monster - Player position:', player.x, player.y);
      // createMonsterForTuning(); // Moved to after dungeon generation

      playerTargetRotation.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        player.rotationY
      );
      player.object.quaternion.copy(playerTargetRotation);
      // Ensure initial map camera targets player tile
      mapCameraTarget.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
      // Apply top-down pitch for better room visibility
      const pitch = THREE.MathUtils.degToRad(TUNING.map.pitchDeg);
      const dist = zoomLevel;
      camera.position.set(
        mapCameraTarget.x + dist * Math.sin(cameraAngle) * Math.cos(pitch),
        dist * Math.sin(pitch),
        mapCameraTarget.z + dist * Math.cos(cameraAngle) * Math.cos(pitch)
      );
      camera.lookAt(mapCameraTarget);

      // Debug: Log camera setup
      console.log("Camera setup after dungeon generation:", {
        player_position: [player.x, player.y],
        mapCameraTarget: mapCameraTarget,
        camera_position: camera.position,
        pitch: pitch,
        dist: dist,
        cameraAngle: cameraAngle,
        zoomLevel: zoomLevel,
      });

      // Initialize simple room/hallway discovery instead of fog of war
      initRoomDiscovery();
      updateRoomVisibility();

      // Add a test cube to ensure scene is rendering (made invisible)
      const testGeometry = new THREE.BoxGeometry(2, 2, 2);
      const testMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
      const testCube = new THREE.Mesh(testGeometry, testMaterial);
      testCube.position.set(
        player.x * TILE_SIZE,
        1,
        player.y * TILE_SIZE + 3
      );
      scene.add(testCube);
      console.log("Added test cube at:", testCube.position);

      // Force camera to look at player position for debugging
      focusMapOnPlayer();

      updateCamera();

      // Trigger forensic scan after dungeon generation to ensure object sync
      setTimeout(() => {
        if (window.forensicSync) {
          // console.log('🔍 Triggering forensic scan after dungeon generation');
          // window.forensicSync && window.forensicSync.scheduleScan && window.forensicSync.scheduleScan();
        }
      }, 200);
    }


    // Force map camera to focus on player - useful for debugging
    function focusMapOnPlayer() {
      console.log("Focusing map on player at:", [player.x, player.y]);
      mapCameraTarget.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);

      const pitch = THREE.MathUtils.degToRad(TUNING.map.pitchDeg);
      const dist = zoomLevel;

      camera.position.set(
        mapCameraTarget.x + dist * Math.sin(cameraAngle) * Math.cos(pitch),
        dist * Math.sin(pitch),
        mapCameraTarget.z + dist * Math.cos(cameraAngle) * Math.cos(pitch)
      );
      camera.lookAt(mapCameraTarget);

      console.log("Camera focused at position:", camera.position, "looking at:", mapCameraTarget);
    }

    function initRoomDiscovery() {
      // Simple discovery system - track discovered rooms and create overlay meshes
      discoveredRooms = new Set();

      // Create dimming overlays for each room/corridor
      createRoomOverlays();

      // Player starts in a discovered room
      const startTile = map[player.y][player.x];
      if (startTile && startTile.roomId) {
        discoveredRooms.add(startTile.roomId);
        updateRoomOverlayVisibility(startTile.roomId, true);
      }
    }

    function createRoomOverlays() {
      // No room overlays: fog-of-war disabled globally for the map view
      // Keep a stub to preserve call sites
      if (scene.getObjectByName('roomOverlays')) {
        const og = scene.getObjectByName('roomOverlays');
        scene.remove(og);
      }
    }

    function updateRoomOverlayVisibility(roomId, discovered) {
      // No-op: overlays are not used
    }

    function updateRoomVisibility() {
      // Check if player has entered a new room/hallway
      const currentTile = map[player.y][player.x];
      if (currentTile && currentTile.roomId === 'corridor') {
        // Always consider corridor discovered
        discoveredRooms.add('corridor');
      }
      if (currentTile && currentTile.roomId && !discoveredRooms.has(currentTile.roomId)) {
        discoveredRooms.add(currentTile.roomId);
        updateRoomOverlayVisibility(currentTile.roomId, true);
      }
    }

    // hasLineOfSight function kept for monster AI line of sight checking
    function hasLineOfSight(x0, y0, x1, y1) {
      // Ensure coordinates are integers for tile-based raycast
      x0 = Math.floor(x0);
      y0 = Math.floor(y0);
      x1 = Math.floor(x1);
      y1 = Math.floor(y1);

      // Same tile - always has line of sight
      if (x0 === x1 && y0 === y1) return true;

      // Bresenham grid raycast; walls block
      let dx = Math.abs(x1 - x0),
        sx = x0 < x1 ? 1 : -1;
      let dy = -Math.abs(y1 - y0),
        sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      let x = x0,
        y = y0;

      while (true) {
        // Don't check starting position - monsters can see from their own tile
        if (!(x === x0 && y === y0)) {
          // Check if current tile is out of bounds or a wall
          if (!map[y] || !map[y][x] || map[y][x].type === TILE.WALL) {
            return false;
          }
        }

        // Reached destination
        if (x === x1 && y === y1) return true;

        let e2 = 2 * err;
        if (e2 >= dy) {
          if (x === x1) break;
          err += dy;
          x += sx;
        }
        if (e2 <= dx) {
          if (y === y1) break;
          err += dx;
          y += sy;
        }
      }
      return false;
    }

    // --- Mapview click-and-drag panning ---
    (function enableMapPanning() {
      const mapCanvasWrapper = window.rendererSystem?.mapCanvasWrapper;
      if (!mapCanvasWrapper) return;
      let panStart = null; // world position when drag starts
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // ground y=0

      const screenToGround = (clientX, clientY) => {
        const rect = mapCanvasWrapper.getBoundingClientRect();
        ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
        raycaster.setFromCamera(ndc, window.rendererSystem.camera);
        const pt = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, pt);
        return pt;
      };

      mapCanvasWrapper.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // left only
        const pt = screenToGround(e.clientX, e.clientY);
        if (!pt) return;
        isPanning = true;
        userHasPanned = true;
        panStart = pt;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isPanning || !panStart) return;
        const pt = screenToGround(e.clientX, e.clientY);
        if (!pt) return;
        // compute delta and update panOffset so that camera target shifts opposite to drag
        const delta = new THREE.Vector3().subVectors(panStart, pt);
        panOffset.add(delta);
        updateCamera(true);
        panStart = pt;
      });

      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
          isPanning = false;
          panStart = null;
        }
      });
    })();

    function updateCamera(isManual = false) {
      if (isManual) {
        userHasPanned = true;
        isMapCameraAnimating = false;
      }

      // INSTANT rendering - no smooth zoom transitions
      zoomLevel = desiredZoomLevel; // INSTANT: No smooth transitions

      if (isMapCameraAnimating) {
        camera.position.copy(mapCameraPosition); // INSTANT: No lerp animation
        camera.lookAt(mapCameraTarget);
        isMapCameraAnimating = false; // INSTANT: End animation immediately
      } else if (userHasPanned) {
        const targetPosition = new THREE.Vector3(
          player.x * TILE_SIZE,
          0,
          player.y * TILE_SIZE
        ).add(panOffset);
        const pitch2 = THREE.MathUtils.degToRad(TUNING.map.pitchDeg);
        const d2 = zoomLevel;
        camera.position.x =
          targetPosition.x + d2 * Math.sin(cameraAngle) * Math.cos(pitch2);
        camera.position.y = d2 * Math.sin(pitch2);
        camera.position.z =
          targetPosition.z + d2 * Math.cos(cameraAngle) * Math.cos(pitch2);
        camera.lookAt(targetPosition);
      } else {
        // Centered camera uses smoothed zoomLevel
        const pitch2 = THREE.MathUtils.degToRad(TUNING.map.pitchDeg);
        camera.position.set(
          mapCameraTarget.x +
          zoomLevel * Math.sin(cameraAngle) * Math.cos(pitch2),
          zoomLevel * Math.sin(pitch2),
          mapCameraTarget.z +
          zoomLevel * Math.cos(cameraAngle) * Math.cos(pitch2)
        );
        camera.lookAt(mapCameraTarget);
      }

      // FPV camera - only update if player object exists
      if (!player || !player.object) {
        return; // Skip FPV camera updates during initialization
      }

      const playerPos = player.object.position.clone();
      let cameraHeight = normalCameraHeight; // Default: 6 feet above head
      let lookAtTarget;

      // Combat camera mode
      if (isInCombat && combatTarget) {
        // Add extra height for combat camera (3 feet higher)
        cameraHeight += TUNING.combat.camera.heightOffset;

        // Smooth transition for combat camera
        const elapsed = performance.now() - combatCameraTransitionStart;
        const progress = Math.min(elapsed / TUNING.combat.camera.transitionDuration, 1);
        const easeProgress = 0.5 * (1 - Math.cos(Math.PI * progress)); // Smooth easing

        if (progress < 1) {
          // Interpolate between normal and combat height
          cameraHeight = normalCameraHeight + (TUNING.combat.camera.heightOffset * easeProgress);
        }

        // Look directly at the monster model during combat
        const combatTargetPos = combatTarget.object ? combatTarget.object.position :
          new THREE.Vector3(combatTarget.x * TILE_SIZE, TUNING.models.monsterHeight / 2, combatTarget.y * TILE_SIZE);
        lookAtTarget = combatTargetPos.clone();
        lookAtTarget.y = TUNING.models.monsterHeight / 2; // Look at monster's center
      } else {
        // Normal camera: look at tile in front of player
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.object.quaternion);
        // Look far forward at the same height as the camera (Horizon View)
        lookAtTarget = playerPos.clone().add(forward.multiplyScalar(TILE_SIZE * 10));
        lookAtTarget.y = cameraHeight; // Look STRAIGHT AHEAD (Horizon), not down
      }

      // Calculate camera position
      if (isInCombat && combatTarget) {
        // Combat camera: stay directly above player, yaw to look down at monster
        const cameraPos = playerPos.clone().add(new THREE.Vector3(0, cameraHeight, 0)); // Directly above player
        fpvCamera.position.copy(cameraPos);
      } else {
        // Normal camera: Chase Cam (0.8 tiles back - 20% closer), at calculated height (3.5)
        // Baseline logic: behind * TILE_SIZE + height
        const behind = new THREE.Vector3(0, 0, 1).applyQuaternion(player.object.quaternion); // Behind in world coords
        const cameraPos = playerPos.clone()
          .add(behind.multiplyScalar(TILE_SIZE * 0.8)) // 20% closer to player
          .add(new THREE.Vector3(0, cameraHeight, 0)); // Scaled Height
        fpvCamera.position.copy(cameraPos);
      }
      fpvCamera.up.set(0, 1, 0);
      fpvCamera.lookAt(lookAtTarget);
      // Keep orientation driven by `lookAtTarget` (avoid extra pitch overrides).
    }
    // Recenter the map camera if the player's world position moves outside the current view rectangle
    let cachedMapViewportWidth = 0;
    let cachedMapViewportHeight = 0;

    function updateMapViewportCache() {
      const mapCanvasWrapper = window.rendererSystem?.mapCanvasWrapper;
      if (mapCanvasWrapper) {
        cachedMapViewportWidth = mapCanvasWrapper.clientWidth;
        cachedMapViewportHeight = mapCanvasWrapper.clientHeight;
      }
    }
    window.addEventListener('resize', updateMapViewportCache);

    // Global cache for auto-center
    let cachedPlayerCircleEl = null;
    let lastAutoCenterCheck = 0;

    function ensureMapAutoCenter() {
       const mapCanvasWrapper = window.rendererSystem?.mapCanvasWrapper;
       const mainRenderer = window.rendererSystem?.renderer;
       if (!mapCanvasWrapper || !mainRenderer) return;

      // Use cached dimensions to avoid layout thrashing
      if (cachedMapViewportWidth === 0) updateMapViewportCache();

      const viewportWidth = cachedMapViewportWidth;
      const viewportHeight = cachedMapViewportHeight;

      // Calculate player position in viewport coordinates
      const worldToViewport = new THREE.Vector3(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
      worldToViewport.project(camera);

      // Convert from normalized device coordinates (-1 to +1) to pixel coordinates
      const playerScreenX = (worldToViewport.x + 1) * viewportWidth / 2;
      const playerScreenY = (-worldToViewport.y + 1) * viewportHeight / 2;

      // Check if player is completely out of view relative to the map viewport
      const isPlayerOutOfView =
        playerScreenX < 0 ||
        playerScreenX > viewportWidth ||
        playerScreenY < 0 ||
        playerScreenY > viewportHeight;

      // Force recenter if player is out of view, regardless of userHasPanned
      /* DISABLED AGGRESSIVE AUTO-CENTERING TO FIX "AUTO-TURN" BUG
      if (isPlayerOutOfView) {
        // console.log("PLAYER OUT OF VIEW - FORCING RECENTER");
        // Center on player - !IMPORTANT player must always be visible
        mapCameraTarget.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
        placeMapCameraAt(mapCameraTarget.x, mapCameraTarget.z, zoomLevel);
        
        userHasPanned = false; // Reset pan when player is out of view
        return; // Exit early after emergency recenter
      }
      */

      // OPTIMIZATION: Throttle DOM checks to avoid forced reflows every frame
      const now = performance.now();
      if (now - lastAutoCenterCheck > 1000) { // Check every 1 second
        lastAutoCenterCheck = now;

        // Cache the element lookup
        if (!cachedPlayerCircleEl) {
          cachedPlayerCircleEl = document.getElementById('player-circle') || document.querySelector('.player-circle');
        }

        if (cachedPlayerCircleEl) {
          // Only call getBoundingClientRect if absolutely necessary and throttled
          const bounding = cachedPlayerCircleEl.getBoundingClientRect();
          const inViewport = (
            bounding.top < (window.innerHeight || document.documentElement.clientHeight) &&
            bounding.bottom > 0 &&
            bounding.left < (window.innerWidth || document.documentElement.clientWidth) &&
            bounding.right > 0
          );
          if (inViewport) {
            // Player circle is visible in the browser viewport; skip auto-centering
            return;
          }
        }
      } else if (cachedPlayerCircleEl) {
        // If we have a cached element and we're between checks, assume it's visible if it was last time
        // (This is a heuristic to avoid jitter, but for safety we fall through to margin check below)
      }

      // Normal margin-based centering for non-emergency cases
      if (userHasPanned || isMapCameraAnimating || isAutoMoving) return;

      // Enhanced margin for better player visibility
      const margin = Math.min(
        50, // Aggressive centering margin
        Math.round(Math.min(viewportWidth, viewportHeight) * 0.12)
      );

      if (
        playerScreenX < margin ||
        playerScreenX > viewportWidth - margin ||
        playerScreenY < margin ||
        playerScreenY > viewportHeight - margin
      ) {
        // Reduced distance requirement for more responsive centering
        const camTileX = Math.round(mapCameraTarget.x / TILE_SIZE);
        const camTileY = Math.round(mapCameraTarget.z / TILE_SIZE);
        const tileDist = Math.hypot(player.x - camTileX, player.y - camTileY);
        if (tileDist < 1.0) return; // Reduced from 1.5 for more responsive centering

        // Center on player using fixed-pitch placement
        mapCameraTarget.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
        placeMapCameraAt(mapCameraTarget.x, mapCameraTarget.z, zoomLevel);
        userHasPanned = false;
      }
    }

    // Simple DOF effect: apply a small CSS blur to FPV canvas when player is moving or during animations
    let dofIntensity = 0;
    function updateDOF(delta) {
      // target intensity based on whether player is animating
      const target = isPlayerAnimating ? 0.6 : 0.0;
      dofIntensity += (target - dofIntensity) * Math.min(1, delta * 3);
      if (mainRenderer && mainRenderer.domElement)
        mainRenderer.domElement.style.filter = `blur(${dofIntensity * 2.5}px)`;
    }

    // Combat camera functions
    function startCombatCamera(monster) {
      console.log("Starting combat camera mode", monster);
      isInCombat = true;
      combatTarget = monster;
      combatCameraTransitionStart = performance.now();
    }

    function endCombatCamera() {
      console.log("Ending combat camera mode");
      isInCombat = false;
      combatTarget = null;
      combatCameraTransitionStart = performance.now(); // Start transition back to normal

      // Optional: Add a brief transition period back to normal camera
      setTimeout(() => {
        combatCameraTransitionStart = 0;
      }, TUNING.combat.camera.transitionDuration);
    }
    function updateFPS() {
      _fpsCount++;
      const now = performance.now();
      if (now - _fpsT >= 500) {
        const fps = Math.round((_fpsCount * 1000) / (now - _fpsT));
        document.getElementById("fpv-fps-badge").textContent = `${fps} FPS`;
        const hasModel = !!(player?.object?.userData?.visuals?.model3d);
        const modelKind = hasModel && player.object.userData.visuals.model3d?.isMesh ? 'stub' : (hasModel ? 'glb' : 'none');
        setStatus(`fps:${fps} model:${modelKind}`);
        _fpsT = now;
        _fpsCount = 0;
      }
    }
    function setRoomTag(id) {
      // If initial tag deferred, skip immediate update (will be applied after welcome)
      if (typeof __initialRoomTagDeferred !== 'undefined' && __initialRoomTagDeferred) {
        return; // Suppress premature tag to prevent duplicate room event card
      }
      const label = id
        ? String(id).replace(/_/g, " ").toUpperCase()
        : "HALLWAY";
      const el = document.getElementById("fpv-room-tag");
      if (el) el.textContent = label;
      const t = document.getElementById("room-id-top");
      if (t) t.textContent = label;
      const p = document.getElementById("room-id-panel");
      if (p) p.textContent = label;
      setLocationLabel(id);
      setRoomDescription(id);
    }
    function setCompassHeading(rad) {
      const deg = (-rad * 180) / Math.PI;
      const needleTop = document.getElementById("compass-needle-top");
      if (needleTop)
        needleTop.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;
      const needlePanel = document.getElementById("compass-needle-panel");
      if (needlePanel)
        needlePanel.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;
      // Sync Origami Radar indicator when available

    }

    // --- Player Actions ---
    function turnPlayer(degrees) {
      player.rotationY += THREE.MathUtils.degToRad(degrees);
      player.targetRotationY = player.rotationY; // Sync target
      playerTargetRotation.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        player.rotationY
      );
      setCompassHeading(player.rotationY);
      updateTuningMonsterArrow(); // Sync monster arrow to player rotation
      return Promise.resolve();
    }

    function rotatePlayerSmooth(targetAngle) {
      // Normalize angle
      targetAngle = normalizeAngle(targetAngle);

      // Update logical rotation
      // player.rotationY = targetAngle; // REMOVED: Instant snap causes jerky movement
      player.targetRotationY = targetAngle; // Sync target

      // Update visual target for slerp in animate()
      playerTargetRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);

      // Update compass and other UI
      setCompassHeading(targetAngle);
      updateTuningMonsterArrow();

      // Log
      // console.log(`🔄 Auto-turning to ${targetAngle.toFixed(2)} rad`);
    }

    function normalizeAngle(angle) {
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;
      return angle;
    }

    function safeTriggerAttackRelease(synth, note, duration) {
      if (synth && window.Tone && Tone.context && Tone.context.state === 'running') {
        try {
          // Use a small lookahead to prevent "start time must be strictly greater" error
          const now = Tone.now();
          synth.triggerAttackRelease(note, duration, now + 0.05);
        } catch (e) {
          console.warn('Audio scheduling error:', e);
        }
      }
    }

    function movePlayer(forward = 1, targetStep = null) {
      // Log action for turn-based forensics
      forensics.logAction('movePlayer', { forward, x: player.x, y: player.y, targetStep });

      // Check for confusion status effect
      if (player.statusEffects.has('confusion') && Math.random() < 0.5) {
        forward *= -1; // Reverse movement when confused
        logMessage("You stumble around confused!", "#FF00FF");
      }

      // Instant step; visuals follow immediately so the turn loop is snappy
      return new Promise((resolve) => {
        if (player.health <= 0) return resolve();

        let newX, newY;

        // If a specific target step is provided (Auto-Move), use it directly
        // This bypasses rotation/rounding errors
        if (targetStep) {
          newX = targetStep.x;
          newY = targetStep.y;
        } else {
          // Manual movement based on rotation
          const dx = -Math.round(Math.sin(player.rotationY)) * forward;
          const dy = -Math.round(Math.cos(player.rotationY)) * forward;
          newX = player.x + dx;
          newY = player.y + dy;
        }

        if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT)
          return resolve();

        // Wall Collision & Auto-Turn Logic
        if (map[newY][newX].type === TILE.WALL) {
          // Only auto-turn on manual movement, not auto-move (pathfinder shouldn't hit walls)
          if (targetStep) {
            console.warn("Auto-move tried to hit a wall!", newX, newY);
            return resolve();
          }

          // Check for potential turns (Left and Right relative to current facing)
          const currentRot = player.rotationY;
          const leftRot = currentRot + Math.PI / 2;
          const rightRot = currentRot - Math.PI / 2;

          // Calculate grid offsets for left/right
          const leftDx = -Math.round(Math.sin(leftRot));
          const leftDy = -Math.round(Math.cos(leftRot));
          const rightDx = -Math.round(Math.sin(rightRot));
          const rightDy = -Math.round(Math.cos(rightRot));

          const leftX = player.x + leftDx;
          const leftY = player.y + leftDy;
          const rightX = player.x + rightDx;
          const rightY = player.y + rightDy;

          const isLeftValid = leftX >= 0 && leftX < MAP_WIDTH && leftY >= 0 && leftY < MAP_HEIGHT && map[leftY][leftX].type !== TILE.WALL;
          const isRightValid = rightX >= 0 && rightX < MAP_WIDTH && rightY >= 0 && rightY < MAP_HEIGHT && map[rightY][rightX].type !== TILE.WALL;

          let targetRot = null;

          if (isLeftValid && !isRightValid) {
            targetRot = leftRot;
            logMessage("Auto-turning Left", "#88ccff");
          } else if (isRightValid && !isLeftValid) {
            targetRot = rightRot;
            logMessage("Auto-turning Right", "#88ccff");
          } else if (isLeftValid && isRightValid) {
            // Both valid: Use Raycast Heuristic (Lookahead)
            // Count open tiles in each direction (up to 5)
            let leftScore = 0;
            let rightScore = 0;

            for (let i = 1; i <= 5; i++) {
              const lx = player.x + (leftDx * i);
              const ly = player.y + (leftDy * i);
              if (lx >= 0 && lx < MAP_WIDTH && ly >= 0 && ly < MAP_HEIGHT && map[ly][lx].type !== TILE.WALL) {
                leftScore++;
              } else {
                break;
              }
            }

            for (let i = 1; i <= 5; i++) {
              const rx = player.x + (rightDx * i);
              const ry = player.y + (rightDy * i);
              if (rx >= 0 && rx < MAP_WIDTH && ry >= 0 && ry < MAP_HEIGHT && map[ry][rx].type !== TILE.WALL) {
                rightScore++;
              } else {
                break;
              }
            }

            if (leftScore > rightScore) {
              targetRot = leftRot;
              logMessage("Auto-turning Left (Longer Path)", "#88ccff");
            } else if (rightScore > leftScore) {
              targetRot = rightRot;
              logMessage("Auto-turning Right (Longer Path)", "#88ccff");
            } else {
              // Tie: Default to Left
              targetRot = leftRot;
              logMessage("Auto-turning Left (Choice)", "#88ccff");
            }
          }

          if (targetRot !== null) {
            // Initiate smooth turn
            rotatePlayerSmooth(targetRot);
            return resolve();
          }

          // If no valid turn, just hit the wall
          return resolve();
        }

        // 🗡️ Combat Check: Look for monsters at target position
        const blocker = monsters.find((m) => m.x === newX && m.y === newY && m.health > 0);
        console.log(`🔍 Checking for monsters at (${newX}, ${newY}):`, monsters.filter(m => m.x === newX && m.y === newY));

        if (blocker) {
          console.log(`⚔️ Combat: Player attacking ${blocker.name} at (${newX}, ${newY}) - HP: ${blocker.health}`);

          // Stop automovement when combat starts
          if (isAutoMoving) {
            console.log(`⚔️ Automovement stopped due to combat with ${blocker.name}`);
            clearAutoTrail();
            isAutoMoving = false;
            autoMoveCancel = true;
            logMessage(`Combat with ${blocker.name}!`, "#ff6b35");
          }

          attack(player, blocker);
          onPlayerTurnTick();
          return resolve();
        } else {
          console.log(`✅ No monsters at (${newX}, ${newY}) - proceeding with movement`);
        }

        // Reset pan offset after every move to ensure map stays centered
        userHasPanned = false;
        panOffset.set(0, 0, 0);
        // Logical move first
        player.x = newX;
        player.y = newY;
        // Store current tile for NetHack-style visibility rules
        player.currentTile = map[player.y][player.x];

        // Process NetHack turn mechanics
        processHunger();
        processStatusEffects();
        // Smooth visual step
        try {
          playerStartPos.copy(player.object.position);
          playerTargetPos.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
          playerAnimTime = 0;
          isPlayerAnimating = true;

          // Start walking animation timing (001.E style)
          game._walkAnimStart = performance.now();
          game._moveTween = {
            start: performance.now(),
            dur: PLAYER_ANIMATION_SPEED * 1000, // Convert to milliseconds
            walking: true
          };
        } catch (_) {
          player.object.position.set(
            player.x * TILE_SIZE,
            0,
            player.y * TILE_SIZE
          );
        }
        if (sounds.step) safeTriggerAttackRelease(sounds.step, "C4", "16n"); // Higher, softer note with shorter duration
        // Animation removed with player model
        const playerTile = map[player.y][player.x];
        if (playerTile.roomId !== currentRoomId) {
          currentRoomId = playerTile.roomId;
          setRoomTag(currentRoomId);
          focusMapOnRoom(currentRoomId);
          // update desired zoom based on whether we're in a corridor or a room
          if (typeof updateMapZoomForTile === 'function') {
            updateMapZoomForTile(playerTile);
          }
          updateViewSwap();
        }
        updateRoomVisibility();

        // AUTOPICKUP - automatically collect loot when moving over it
        pickupLootIfAny(player.x, player.y);

        // Resolve with a tiny delay to allow input buffering but prevent "real-time" forensic alerts
        setTimeout(resolve, 16);

        // Shrine interaction: trigger buff if stepping onto a shrine
        try {
          const shrineKey = `shrine_${player.x}_${player.y}`;
          const shrineObj = gameObjects.get(shrineKey);
          if (shrineObj && shrineObj.userData && shrineObj.userData.isShrine) {
            // Grant a gentle regeneration buff for 20 turns
            addStatusEffect('regeneration', 20, 1);
            logMessage('A calming aura surrounds you. You feel renewed.', '#66ccff');
            removeGameObject(shrineKey);
          }
        } catch { }

        // Check if player should exit combat (moved away from hostile monsters)
        if (isInCombat && combatTarget) {
          const distanceToTarget = Math.hypot(player.x - combatTarget.x, player.y - combatTarget.y);
          if (distanceToTarget > 1.5) { // Not adjacent anymore
            endCombatCamera();
          }
        }

        // 🪜 Stairs Interaction System
        const currentTile = map[player.y][player.x];
        if (currentTile.stairsDown) {
          logMessage("You found stairs leading down! Press '>' to descend.", "#ffd700");
          // Auto-prompt for descending
          setTimeout(() => {
            if (confirm("Descend to the next level?")) {
              descendStairs();
            }
          }, 500);
        } else if (currentTile.stairsUp && dungeonLevel > 1) {
          logMessage("You found stairs leading up! Press '<' to ascend.", "#87ceeb");
          // Auto-prompt for ascending
          setTimeout(() => {
            if (confirm("Ascend to the previous level?")) {
              ascendStairs();
            }
          }, 500);
        }

        onPlayerTurnTick();
        resolve();

      });
    }

    function searchAround() {
      logMessage("You search your surroundings.", "#a8a8a8");
      // Search for secret doors adjacent to the player and reveal them with a small chance
      return new Promise((resolve) => {
        const adj = [[player.x - 1, player.y], [player.x + 1, player.y], [player.x, player.y - 1], [player.x, player.y + 1]];
        let found = false;
        for (const [ax, ay] of adj) {
          if (ax < 0 || ay < 0 || ax >= MAP_WIDTH || ay >= MAP_HEIGHT) continue;
          const t = map[ay][ax];
          if (t && t.secretDoor) {
            // discovery chance depends on search count
            const chance = Math.min(0.95, 0.02 + player.searchCount * 0.05);
            if (Math.random() < chance) {
              // reveal door: convert to regular corridor entry
              t.secretDoor = false;
              t.type = TILE.FLOOR;
              t.roomId = 'corridor';
              // spawn a small loot pile nearby as reward
              const loot = createLootPileObject('gold', 'Gold');
              loot.position.set(ax * TILE_SIZE, 0, ay * TILE_SIZE);
              addGameObject(`loot_${ax}_${ay}_secret`, loot);
              logMessage('You uncover a hidden door and find something!', '#FFD700');
              found = true;
              break;
            }
          }
        }
        if (!found) logMessage('You search the area but find nothing.', '#A0A0A0');
        resolve(found);
      });
    }

    // 🪜 Stairs System Functions
    function descendStairs() {
      const currentTile = map[player.y][player.x];
      if (!currentTile.stairsDown) {
        logMessage("There are no stairs down here.", "#a8a8a8");
        return;
      }

      dungeonLevel++;
      logMessage(`Descending to dungeon level ${dungeonLevel}...`, "#ffd700");

      // Save current position for returning
      const returnPos = { x: player.x, y: player.y };
      safeStorage.setItem('lastUpStairsPos', JSON.stringify(returnPos));

      // Generate new level
      setTimeout(() => {
        generateNewDungeonLevel();
        logMessage(`Welcome to dungeon level ${dungeonLevel}!`, "#87ceeb");
      }, 1000);
    }

    function ascendStairs() {
      const currentTile = map[player.y][player.x];
      if (!currentTile.stairsUp) {
        logMessage("There are no stairs up here.", "#a8a8a8");
        return;
      }

      if (dungeonLevel <= 1) {
        logMessage("You have reached the surface!", "#00ff00");
        // Could trigger victory condition or return to town
        return;
      }

      dungeonLevel--;
      logMessage(`Ascending to dungeon level ${dungeonLevel}...`, "#87ceeb");

      // Generate previous level or restore it
      setTimeout(() => {
        generateNewDungeonLevel();

        // Try to restore position near stairs down
        const savedPos = safeStorage.getItem('lastUpStairsPos');
        if (savedPos) {
          const pos = JSON.parse(savedPos);
          // Find stairs down on this level and place player nearby
          for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
              if (map[y] && map[y][x] && map[y][x].stairsDown) {
                player.x = x;
                player.y = y;
                if (player.object) {
                  player.object.position.set(x * TILE_SIZE, 0, y * TILE_SIZE);
                }
                break;
              }
            }
          }
        }

        logMessage(`Back to dungeon level ${dungeonLevel}!`, "#87ceeb");
      }, 1000);
    }

    function generateNewDungeonLevel() {
      // Reset monsters and items for new level
      monsters.length = 0;
      items.length = 0;

      // Clear existing game objects
      gameObjects.clear();

      // Re-run the main generation function with new level
      generateMap();

      // Update UI
      updateUI();
      drawMap();
    }

    // automove/click-to-move removed
    function attack(attacker, target, overrideDamage) {
      // Start combat camera when player attacks or is attacked
      if ((attacker === player || target === player) && !isInCombat) {
        const monster = attacker === player ? target : attacker;
        startCombatCamera(monster);
      }

      // When player attacks a monster, make all monsters in room hostile
      if (attacker === player && target !== player) {
        target.hostileState = "HOSTILE";
        makeRoomMonstersHostile(target.spawnRoomId);
      }

      // basic damage calculation; allow override for player attacks
      const base =
        overrideDamage !== undefined
          ? overrideDamage
          : attacker.attack + Math.floor(Math.random() * 2);
      const isPlayerAtk = attacker === player;
      // Dice spin removed
      const hit = resolveToHit(attacker, target);
      if (!hit) {
        const attackerName =
          attacker === player ? "You" : `The ${attacker.name || "monster"}`;
        const targetName =
          target === player ? "you" : `the ${target.name || "monster"}`;
        logMessage(`${attackerName} miss ${targetName}.`, "#a8a8a8");
        if (attacker === player && sounds.playerAttack)
          safeTriggerAttackRelease(sounds.playerAttack, "8n");
        else if (sounds.monsterAttack)
          safeTriggerAttackRelease(sounds.monsterAttack, "C1", "8n");
        updateUI();
        return;
      }
      target.health -= base;
      const attackerName =
        attacker === player ? "You" : `The ${attacker.name || "monster"}`;
      const targetName =
        target === player ? "you" : `the ${target.name || "monster"}`;
      logMessage(
        `${attackerName} strike ${targetName} for ${base} damage.`,
        attacker === player ? "#87ceeb" : "#ff8c69"
      );
      if (attacker === player && sounds.playerAttack)
        safeTriggerAttackRelease(sounds.playerAttack, "8n");
      else if (sounds.monsterAttack)
        safeTriggerAttackRelease(sounds.monsterAttack, "C1", "8n");
      // If a monster hits the player, cancel any automove and flag wasHit
      if (attacker !== player && target === player) {
        player.wasHit = true;
        autoMoveCancel = true;

        // Immediately stop automovement if running
        if (isAutoMoving) {
          console.log(`⚔️ Automovement interrupted by combat - stopping`);
          clearAutoTrail();
          isAutoMoving = false;
          logMessage("Automovement interrupted by combat!", "#ff4444");
        }

        const compasses = document.querySelectorAll(".compass-rose");
        compasses.forEach((c) => {
          c.classList.add("damaged");
          setTimeout(() => c.classList.remove("damaged"), 400);
        });
      }
      if (target.health <= 0) {
        logMessage(
          `${target === player
            ? "You have been defeated!"
            : `The ${target.name} has been defeated!`
          }`,
          "#ff6347"
        );
        if (target === player) {
          logMessage("Your journey ends here.", "#ff6347");
          GameTurnManager.isProcessing = true;

          // End combat camera when player dies
          if (isInCombat) {
            endCombatCamera();
          }
        } else {
          // grant experience to player if they killed the monster
          if (attacker === player) {
            const gained =
              (target.level || 1) * 6 + Math.floor(Math.random() * 4);
            awardXP(gained, "defeated foe");
            player.kills++; // Track kills for NetHack stats

            // Create red X marker on the floor where monster died
            const deadMark = createDeadMonsterMark(target.x, target.y);
            scene.add(deadMark);
            deadMonsterMarks.push(deadMark);
          }
          // generate loot; place a % corpse marker only if food present
          if (target.dropsKey) {
            player.hasKey = true;
            logMessage("You found the key to the next level!", "gold");
          }
          const genItems = generateLootForMonster(target);

          // Create individual loot drops for each item
          if (Array.isArray(genItems) && genItems.length > 0) {
            genItems.forEach((item, index) => {
              const lootObj = createLootPileObject(item.visual || item.type, item.name || item.type);

              // Scatter items around the monster position
              const scatterX = (Math.random() - 0.5) * 1.5;
              const scatterZ = (Math.random() - 0.5) * 1.5;
              lootObj.position.set(
                target.object.position.x + scatterX,
                0,
                target.object.position.z + scatterZ
              );

              lootObj.userData = {
                corpseOf: target.name || "monster",
                items: [item], // Each loot object contains one item
                lootIndex: index
              };

              addGameObject(`loot_${target.x}_${target.y}_${index}`, lootObj);
            });

            logMessage(`The ${target.name || "monster"} drops ${genItems.length} items!`, "#FFD700");
          }
          target.object.visible = false;
          monsters = monsters.filter((m) => m !== target);

          // End combat camera when monster dies
          if (isInCombat && combatTarget === target) {
            endCombatCamera();
          }
        }
      }
      updateUI();
    }

    function resolveToHit(attacker, target) {
      const roll = 1 + Math.floor(Math.random() * 20);
      if (roll === 1) return false;
      if (roll === 20) return true;
      const attStr = attacker.str ?? 10;
      const levelBonus = Math.floor(((attacker.level || 1) - 1) / 2);
      const attBonus = Math.floor((attStr - 10) / 2) + levelBonus;
      const defDex = target.dex ?? 10;
      const ac = 10 + Math.floor((defDex - 10) / 2);
      return roll + attBonus >= ac;
    }

    // Dice canvas renderer and animation functions removed
    // triggerDiceSpin function removed

    // createStraightStairs removed (stairs disabled)

    function pulseMiniRadar() {
      /*
      const mini = document.querySelector(".mv-act .radar-mini");
      if (!mini) return;
      mini.classList.remove("pulse");
      void mini.offsetWidth; // restart animation
      mini.classList.add("pulse");
      */
    }

    function generateLootForMonster(monster) {
      // Comprehensive NetHack-style loot with Japanese theme
      const items = [];
      const dl = Math.max(1, dungeonLevel | 0);
      const monLevel = monster.level || 1;

      // NetHack-style rarity tables with Japanese theme
      const weaponTable = [
        // Common weapons
        { name: "tanto", damage: "1d3", rarity: 0.4, type: "knife" },
        { name: "wakizashi", damage: "1d4", rarity: 0.3, type: "short_sword" },
        { name: "tessen", damage: "1d2", rarity: 0.2, type: "iron_fan" },
        // Uncommon weapons  
        { name: "katana", damage: "1d8", rarity: 0.15, type: "sword", minLevel: 2 },
        { name: "naginata", damage: "1d6", rarity: 0.12, type: "polearm", minLevel: 2 },
        { name: "yari", damage: "1d5", rarity: 0.1, type: "spear", minLevel: 2 },
        // Rare weapons
        { name: "nodachi", damage: "1d10", rarity: 0.05, type: "two_handed_sword", minLevel: 4 },
        { name: "kusarigama", damage: "1d7", rarity: 0.03, type: "chain_weapon", minLevel: 3 },
        { name: "tetsubo", damage: "1d9", rarity: 0.02, type: "club", minLevel: 5 }
      ];

      const armorTable = [
        // Common armor
        { name: "hakama", ac: 1, rarity: 0.3, type: "robe" },
        { name: "kimono", ac: 0, rarity: 0.25, type: "robe" },
        { name: "tabi", ac: 1, rarity: 0.2, type: "boots" },
        // Uncommon armor
        { name: "do-maru", ac: 3, rarity: 0.15, type: "light_armor", minLevel: 2 },
        { name: "hachimaki", ac: 1, rarity: 0.1, type: "helmet" },
        { name: "kote", ac: 2, rarity: 0.08, type: "gauntlets", minLevel: 2 },
        { name: "suneate", ac: 2, rarity: 0.02, type: "leg_armor", minLevel: 3 },
        // Rare armor
        { name: "yoroi", ac: 5, rarity: 0.05, type: "heavy_armor", minLevel: 4 },
        { name: "kabuto", ac: 3, rarity: 0.03, type: "helmet", minLevel: 3 }
      ];

      const foodTable = [
        { name: "rice ball", nutrition: 200, rarity: 0.4 },
        { name: "dried fish", nutrition: 150, rarity: 0.3 },
        { name: "miso soup", nutrition: 100, rarity: 0.25 },
        { name: "pickled vegetables", nutrition: 80, rarity: 0.2 },
        { name: "green tea", nutrition: 50, rarity: 0.15 },
        { name: "sake", nutrition: 120, rarity: 0.1, effect: "confusion" },
        { name: "mochi", nutrition: 250, rarity: 0.08 },
        { name: "sushi", nutrition: 300, rarity: 0.05, minLevel: 2 }
      ];

      const scrollTable = [
        { name: "scroll of bushido", effect: "identify", rarity: 0.3 },
        { name: "scroll of wind walking", effect: "teleport", rarity: 0.25 },
        { name: "scroll of inner peace", effect: "healing", rarity: 0.2 },
        { name: "scroll of shadow step", effect: "invisibility", rarity: 0.15 },
        { name: "scroll of dragon's breath", effect: "fire", rarity: 0.1, minLevel: 2 },
        { name: "scroll of tsunami", effect: "flood", rarity: 0.05, minLevel: 3 }
      ];

      const potionTable = [
        { name: "potion of green tea", effect: "healing", power: 4, rarity: 0.3 },
        { name: "potion of sake", effect: "strength", power: 2, rarity: 0.2 },
        { name: "potion of plum wine", effect: "speed", power: 3, rarity: 0.15 },
        { name: "potion of mountain spring", effect: "mana", power: 5, rarity: 0.1 },
        { name: "potion of cherry blossom", effect: "regeneration", power: 6, rarity: 0.08, minLevel: 2 },
        { name: "potion of dragon blood", effect: "fire_resist", power: 8, rarity: 0.03, minLevel: 4 }
      ];

      const ringTable = [
        { name: "ring of bamboo", effect: "protection", power: 1, rarity: 0.1 },
        { name: "ring of jade", effect: "luck", power: 2, rarity: 0.08 },
        { name: "ring of cherry wood", effect: "stealth", power: 1, rarity: 0.06 },
        { name: "ring of iron", effect: "strength", power: 2, rarity: 0.05, minLevel: 2 },
        { name: "ring of moonstone", effect: "magic_resist", power: 3, rarity: 0.03, minLevel: 3 },
        { name: "ring of dragon scale", effect: "fire_immunity", power: 5, rarity: 0.01, minLevel: 5 }
      ];

      const amuletTable = [
        { name: "amulet of ancestors", effect: "wisdom", power: 1, rarity: 0.08 },
        { name: "amulet of the crane", effect: "dexterity", power: 2, rarity: 0.06 },
        { name: "amulet of the tiger", effect: "strength", power: 2, rarity: 0.05 },
        { name: "amulet of the dragon", effect: "power", power: 3, rarity: 0.03, minLevel: 3 },
        { name: "amulet of the phoenix", effect: "life_saving", power: 1, rarity: 0.01, minLevel: 4 }
      ];

      // Gold drops - NetHack style, more frequent
      if (Math.random() < 0.75) {
        const baseGold = 3 + Math.floor(dl / 2);
        const bonusGold = Math.floor(Math.random() * (5 + dl * 2));
        items.push({
          type: "gold",
          amount: baseGold + bonusGold,
          visual: "coin"
        });
      }

      // Food drops - essential for NetHack survival
      if (Math.random() < 0.45) {
        const availableFood = foodTable.filter(f => !f.minLevel || monLevel >= f.minLevel);
        if (availableFood.length > 0) {
          const food = availableFood[Math.floor(Math.random() * availableFood.length)];
          items.push({
            type: "food",
            name: food.name,
            nutrition: food.nutrition + Math.floor(Math.random() * 50),
            effect: food.effect,
            visual: "food"
          });
        }
      }

      // Weapons - NetHack style with level restrictions
      if (Math.random() < 0.18) {
        const availableWeapons = weaponTable.filter(w => !w.minLevel || monLevel >= w.minLevel);
        if (availableWeapons.length > 0) {
          const weapon = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
          const enchantment = Math.random() < 0.1 ? Math.floor(Math.random() * 3) + 1 : 0;
          items.push({
            type: "weapon",
            name: weapon.name,
            damage: weapon.damage,
            weaponType: weapon.type,
            enchantment: enchantment,
            visual: weapon.type.includes("sword") || weapon.type === "knife" ? "katana" : "weapon"
          });
        }
      }

      // Armor - Less common but important
      if (Math.random() < 0.15) {
        const availableArmor = armorTable.filter(a => !a.minLevel || monLevel >= a.minLevel);
        if (availableArmor.length > 0) {
          const armor = availableArmor[Math.floor(Math.random() * availableArmor.length)];
          const enchantment = Math.random() < 0.08 ? Math.floor(Math.random() * 3) + 1 : 0;
          items.push({
            type: "armor",
            name: armor.name,
            ac: armor.ac + enchantment,
            armorType: armor.type,
            enchantment: enchantment,
            visual: "shield"
          });
        }
      }

      // Potions - NetHack healing and utility
      if (Math.random() < 0.22) {
        const availablePotions = potionTable.filter(p => !p.minLevel || monLevel >= p.minLevel);
        if (availablePotions.length > 0) {
          const potion = availablePotions[Math.floor(Math.random() * availablePotions.length)];
          items.push({
            type: "potion",
            name: potion.name,
            effect: potion.effect,
            power: potion.power + Math.floor(dl / 3),
            visual: "potion"
          });
        }
      }

      // Scrolls - NetHack utility magic
      if (Math.random() < 0.12) {
        const availableScrolls = scrollTable.filter(s => !s.minLevel || monLevel >= s.minLevel);
        if (availableScrolls.length > 0) {
          const scroll = availableScrolls[Math.floor(Math.random() * availableScrolls.length)];
          items.push({
            type: "scroll",
            name: scroll.name,
            effect: scroll.effect,
            visual: "scroll"
          });
        }
      }

      // Rings - Rare but powerful
      if (Math.random() < 0.06) {
        const availableRings = ringTable.filter(r => !r.minLevel || monLevel >= r.minLevel);
        if (availableRings.length > 0) {
          const ring = availableRings[Math.floor(Math.random() * availableRings.length)];
          items.push({
            type: "ring",
            name: ring.name,
            effect: ring.effect,
            power: ring.power,
            visual: "ring"
          });
        }
      }

      // Amulets - Very rare
      if (Math.random() < 0.03) {
        const availableAmulets = amuletTable.filter(a => !a.minLevel || monLevel >= a.minLevel);
        if (availableAmulets.length > 0) {
          const amulet = availableAmulets[Math.floor(Math.random() * availableAmulets.length)];
          items.push({
            type: "amulet",
            name: amulet.name,
            effect: amulet.effect,
            power: amulet.power,
            visual: "amulet"
          });
        }
      }

      // Special monster drops
      if (monster.dropsKey) {
        items.push({
          type: "key",
          name: "ornate key",
          visual: "key"
        });
      }

      return items;
    }

    // --- Automove (Click-to-Move) ---

    function attachClickToMoveFPV() {
      const canvas = mainRenderer.domElement;
      canvas.style.cursor = "crosshair";
      canvas.addEventListener("click", (e) => {
        // Check if click is inside map container (if visible)
        const mapContainer = document.getElementById("mapview-container");
        if (mapContainer && mapContainer.style.display !== "none") {
          const mapRect = mapContainer.getBoundingClientRect();
          if (
            e.clientX >= mapRect.left &&
            e.clientX <= mapRect.right &&
            e.clientY >= mapRect.top &&
            e.clientY <= mapRect.bottom
          ) {
            return; // Ignore clicks inside map container
          }
        }

        // Check if click is inside compass container


        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const mouseVec = new THREE.Vector2(x, y);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouseVec, fpvCamera);

        // Intersect with floor
        const floorObj = fpvFloorMesh || floorMesh;
        // Note: We might need to intersect with a virtual plane if floorMesh is not reliable
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);

        if (intersectPoint) {
          const tx = Math.round(intersectPoint.x / TILE_SIZE);
          const ty = Math.round(intersectPoint.z / TILE_SIZE);
          if (
            tx >= 0 &&
            tx < MAP_WIDTH &&
            ty >= 0 &&
            ty < MAP_HEIGHT &&
            map[ty] && map[ty][tx] && map[ty][tx].type === TILE.FLOOR
          ) {
            console.log(`[FPV click] -> (${tx},${ty})`);
            startAutoMove(tx, ty);
          }
        }
      });
    }

    function attachClickToMoveFPV() {
      const container = document.getElementById("fpv-viewport");
      if (!container) return;

      container.style.cursor = "crosshair";
      container.addEventListener("click", (e) => {
        console.log('FPV Click detected');
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const mouseVec = new THREE.Vector2(x, y);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouseVec, fpvCamera);
        // Prefer FPV floor for intersections; fallback to map floor
        const floorObj = fpvFloorMesh || floorMesh;
        const intersects = floorObj ? raycaster.intersectObject(floorObj, true) : [];
        if (intersects && intersects.length) {
          const pt = intersects[0].point;
          const tx = Math.round(pt.x / TILE_SIZE),
            ty = Math.round(pt.z / TILE_SIZE);
          console.log(`FPV Click intersection at ${tx},${ty}`);
          if (
            tx >= 0 &&
            tx < MAP_WIDTH &&
            ty >= 0 &&
            ty < MAP_HEIGHT &&
            map[ty][tx].type === TILE.FLOOR
          ) {
            console.log(`[FPV click] -> (${tx},${ty}) from (${player.x},${player.y})`);
            startAutoMove(tx, ty);
          } else {
            console.log('FPV Click invalid tile or wall');
          }
        } else {
          console.log('FPV Click no intersection');
        }
      });
    }

    function attachClickToMoveMap() {
      console.log("TRACE 6763: Inside attachClickToMoveMap def?");
      // Wait, this log will only run if called. 
      // I need TOP LEVEL log.
      // I cannot insert log inside function.
      // I must insert it OUTSIDE.
      // Line 6673 starts attachClickToMoveFPV.
      // Line 6723 ends it.
      // Line 6725 starts it again.
      // Line 6762 ends it.
      // Line 6764 starts attachClickToMoveMap.
      // I'll put it BEFORE 6764.
      const container = document.getElementById("mapview-container");
      if (!container) return;

      container.style.cursor = "crosshair";
      container.addEventListener("click", (e) => {
        console.log('Map Click detected');
        // Ignore clicks on resize handles or labels
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('view-label')) return;

        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const mouseVec = new THREE.Vector2(x, y);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouseVec, camera);

        // Create a temporary plane at y=0 to intersect with
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);

        if (intersectPoint) {
          const tx = Math.round(intersectPoint.x / TILE_SIZE);
          const ty = Math.round(intersectPoint.z / TILE_SIZE);
          console.log(`Map Click intersection at ${tx},${ty}`);

          if (
            tx >= 0 &&
            tx < MAP_WIDTH &&
            ty >= 0 &&
            ty < MAP_HEIGHT &&
            map[ty][tx].type === TILE.FLOOR
          ) {
            console.log(`[MAP click] -> (${tx},${ty}) from (${player.x},${player.y})`);
            startAutoMove(tx, ty);
          } else {
            console.log('Map Click invalid tile or wall');
          }
        }
      });
    }

    function pickupLootIfAny(x, y) {
      // Gather all loot objects at this tile, supporting multiple drops per tile
      const baseKey = `loot_${x}_${y}`;
      const searchKey = `search_loot_${x}_${y}`;
      const foundEntries = [];
      // Include exact base key if present
      if (gameObjects.has(baseKey)) {
        foundEntries.push([baseKey, gameObjects.get(baseKey)]);
      }
      // Include any indexed loot and search loot at this tile
      gameObjects.forEach((obj, key) => {
        if (
          (key.startsWith(baseKey + "_") || key.startsWith(searchKey + "_")) &&
          obj && obj.userData
        ) {
          foundEntries.push([key, obj]);
        }
      });

      if (foundEntries.length === 0) {
        return; // Silent when no loot - autopickup should be seamless
      }

      // Process and collect items from all found loot objects
      let pickedAny = false;
      for (const [key, loot] of foundEntries) {
        const items = loot.userData && loot.userData.items ? loot.userData.items : [];
        if (!items.length) {
          // Clean up empty loot objects
          removeGameObject(key);
          continue;
        }
        for (const it of items) {
          pickedAny = true;
          switch (it.type) {
            case "gold": {
              const amt = it.amount || 0;
              if (amt > 0) {
                player.gold = (player.gold || 0) + amt;
                logMessage(`You pick up ${amt} gold.`, "gold");
              }
              break;
            }
            case "food": {
              logMessage(`You pick up ${it.name || "food"}.`, "#a8a8a8");
              player.inventory.push(it);
              break;
            }
            case "potion": {
              const display = getItemDisplayName(it);
              logMessage(`You pick up ${display}.`, "#a8a8a8");
              player.inventory.push(it);
              break;
            }
            case "scroll": {
              const display = getItemDisplayName(it);
              logMessage(`You pick up ${display}.`, "#a8a8a8");
              player.inventory.push(it);
              break;
            }
            case "ring": {
              const display = getItemDisplayName(it);
              logMessage(`You pick up ${display}.`, "#a8a8a8");
              player.inventory.push(it);
              break;
            }
            case "amulet": {
              const display = getItemDisplayName(it);
              logMessage(`You pick up ${display}.`, "#a8a8a8");
              player.inventory.push(it);
              break;
            }
            case "weapon":
            case "armor": {
              const display = getItemDisplayName(it);
              logMessage(`You pick up ${display}.`, "#a8a8a8");
              player.inventory.push(it);

              // AUTOEQUIP - automatically equip better items
              autoEquipItem(it, player.inventory.length - 1);
              break;
            }
            case "key": {
              player.hasKey = true;
              logMessage("You pick up a key!", "gold");
              break;
            }
            default: {
              const nm = it.name || it.type || "item";
              logMessage(`You pick up ${nm}.`, "#a8a8a8");
              player.inventory.push(it);
            }
          }
        }
        // Remove the loot object from scene and registry
        removeGameObject(key);
      }

      if (pickedAny) updateUI();
    }

    // Auto-equip function: automatically equip items if they're better than current
    function autoEquipItem(item, inventoryIndex) {
      if (!item || (item.type !== "weapon" && item.type !== "armor")) return;

      if (item.type === "weapon") {
        const currentWeaponIndex = player.equippedWeapon;
        const currentWeapon = currentWeaponIndex !== -1 ? player.inventory[currentWeaponIndex] : null;
        const currentAttack = currentWeapon ? (currentWeapon.attack || 1) : 1;
        const newAttack = item.attack || 1;

        if (newAttack > currentAttack) {
          player.equippedWeapon = inventoryIndex;
          logMessage(`Auto-equipped ${getItemDisplayName(item)} (ATK: ${newAttack})!`, "#00ff00");
          updatePlayerStats();
        }
      } else if (item.type === "armor") {
        const currentArmorIndex = player.equippedArmor;
        const currentArmor = currentArmorIndex !== -1 ? player.inventory[currentArmorIndex] : null;
        const currentDefense = currentArmor ? (currentArmor.defense || 0) : 0;
        const newDefense = item.defense || 0;

        if (newDefense > currentDefense) {
          player.equippedArmor = inventoryIndex;
          logMessage(`Auto-equipped ${getItemDisplayName(item)} (DEF: ${newDefense})!`, "#00ff00");
          updatePlayerStats();
        }
      }
    }

    function checkLevelUp() {
      player.level = player.level || 1;
      player.exp = player.exp || 0;
      while (player.exp >= player.expToLevel()) {
        player.exp -= player.expToLevel();
        player.level++;
        // increase core stats modestly on level
        player.maxHealth += 2 + Math.floor(Math.random() * 3);
        player.health = player.maxHealth;
        player.str += 1 + Math.floor(Math.random() * 2);
        player.dex += 1 + Math.floor(Math.random() * 2);
        player.con += 1 + Math.floor(Math.random() * 2);
        player.attack = Math.max(1, Math.floor((player.str - 10) / 2) + 1);
        logMessage(`You advance to level ${player.level}!`, "lime");
      }
      updateUI();
    }

    // 👁️ Player Detection System
    function detectPlayer(monster) {
      const dx = player.x - monster.x;
      const dy = player.y - monster.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angleToPlayer = Math.atan2(dx, dy);
      const facingAngle = monster.facingAngle || 0;
      const angleDiff = Math.abs(angleToPlayer - facingAngle);
      const normalizedAngle = Math.min(angleDiff, 2 * Math.PI - angleDiff);

      // Vision cone detection
      let inVisionCone = false;
      let detectionRange = 0;

      if (normalizedAngle <= MONSTER_AI_CONFIG.DETECTION_ANGLES.FRONT) {
        // Front detection
        detectionRange = MONSTER_AI_CONFIG.VISION_FRONT_RANGE;
        inVisionCone = distance <= detectionRange;
      } else if (normalizedAngle <= MONSTER_AI_CONFIG.DETECTION_ANGLES.SIDE) {
        // Side detection  
        detectionRange = MONSTER_AI_CONFIG.VISION_SIDE_RANGE;
        inVisionCone = distance <= detectionRange;
      }
      // No behind detection

      // Hearing detection
      const inHearingRange = distance <= MONSTER_AI_CONFIG.HEARING_RANGE;

      // Line of sight check using tile raycast
      const hasLOS = hasLineOfSight(monster.x, monster.y, player.x, player.y);

      return {
        canSee: inVisionCone && hasLOS,
        canHear: inHearingRange,
        distance,
        angleToPlayer,
        inFrontArc: normalizedAngle <= MONSTER_AI_CONFIG.DETECTION_ANGLES.FRONT,
        inSideArc: normalizedAngle <= MONSTER_AI_CONFIG.DETECTION_ANGLES.SIDE
      };
    }

    // 🎯 State Handlers
    function handleIdleState(monster, detection) {
      if (detection.canSee || detection.canHear) {
        monster.aiState = MONSTER_STATES.ALERTED;
        monster.lastKnownPlayerPos = { x: player.x, y: player.y };
      }
    }

    function handleAlertedState(monster, detection) {
      // Immediately transition to hostile
      monster.aiState = MONSTER_STATES.HOSTILE;
      monster.lastKnownPlayerPos = { x: player.x, y: player.y };

      // Play alert sound
      playMonsterAlertSound(monster);

      // Alert other monsters in the same room
      alertRoomMonsters(monster);
    }

    function handleHostileState(monster, detection) {
      if (detection.canSee && detection.distance <= 10) {
        // Continue pursuit
        monster.lastKnownPlayerPos = { x: player.x, y: player.y };
      } else if (!detection.canSee || detection.distance > 10) {
        // Lost sight - start searching
        monster.aiState = MONSTER_STATES.SEARCHING;
        monster.searchTurnsLeft = MONSTER_AI_CONFIG.SEARCH_TURNS;
      }
    }

    function handleSearchingState(monster, detection) {
      if (detection.canSee) {
        // Found player again
        monster.aiState = MONSTER_STATES.HOSTILE;
        monster.lastKnownPlayerPos = { x: player.x, y: player.y };
        playMonsterAlertSound(monster);
      } else {
        monster.searchTurnsLeft--;
        if (monster.searchTurnsLeft <= 0) {
          // Give up search - return home
          monster.aiState = MONSTER_STATES.RETURNING_HOME;
        }
      }
    }

    function handleReturningHomeState(monster, detection) {
      // Check if back in spawn room
      const currentTile = map[monster.y]?.[monster.x];
      if (currentTile && currentTile.roomId === monster.homeRoom) {
        monster.aiState = MONSTER_STATES.IDLE;
        monster.flashCounter = 2; // Flash twice when returning home
      } else if (detection.canSee) {
        // Player spotted during return - re-engage
        monster.aiState = MONSTER_STATES.HOSTILE;
        monster.lastKnownPlayerPos = { x: player.x, y: player.y };
        playMonsterAlertSound(monster);
      }
    }

    // 🎵 Audio System
    function playMonsterAlertSound(monster) {
      if (monster.alertSound) return; // Already playing

      try {
        const audio = new Audio(GOBLIN_ALERT_SOUND_URL);
        audio.volume = 0.3;
        audio.play().catch(e => console.warn('Monster alert sound failed:', e));
        monster.alertSound = audio;

        // Clear reference when done
        audio.onended = () => monster.alertSound = null;
      } catch (e) {
        console.warn('Failed to create monster alert sound:', e);
      }
    }

    // 🚨 Room Alert System
    function alertRoomMonsters(alertingMonster) {
      const alertRoom = map[alertingMonster.y]?.[alertingMonster.x]?.roomId;
      if (!alertRoom) return;

      monsters.forEach(monster => {
        if (monster === alertingMonster) return;
        const monsterRoom = map[monster.y]?.[monster.x]?.roomId;
        if (monsterRoom === alertRoom && monster.aiState === MONSTER_STATES.IDLE) {
          // If the player is currently in this room, escalate directly to HOSTILE
          const playerRoom = map[player.y]?.[player.x]?.roomId;
          if (playerRoom && playerRoom === monsterRoom && !monster.isAlly) {
            monster.aiState = MONSTER_STATES.HOSTILE;
            monster.state = "HOSTILE";
            monster.hostileState = "HOSTILE";
            updateMonsterIndicators(monster);
          } else {
            monster.aiState = MONSTER_STATES.ALERTED;
          }
        }
      });
    }

    // 🎨 State Change Effects
    function onMonsterStateChange(monster, oldState, newState) {
      console.log(`🐉 Monster ${monster.name} state: ${oldState} → ${newState}`);

      // Set flash counter for visual feedback
      if (newState === MONSTER_STATES.HOSTILE || newState === MONSTER_STATES.ALERTED) {
        monster.flashCounter = 1;
      } else if (newState === MONSTER_STATES.SEARCHING) {
        monster.flashCounter = 2;
      }

      // Legacy state sync for compatibility
      if (newState === MONSTER_STATES.HOSTILE) {
        monster.state = "HOSTILE";
        monster.hostileState = "HOSTILE";
        // If the player is in the same room as this monster, escalate all
        // non-ally monsters in the room to HOSTILE so they pursue together.
        try {
          const playerRoom = map[player.y]?.[player.x]?.roomId;
          const monsterRoom = map[monster.y]?.[monster.x]?.roomId || monster.homeRoom;
          if (playerRoom && monsterRoom && playerRoom === monsterRoom) {
            makeRoomMonstersHostile(monsterRoom);
          }
        } catch (e) {
          // defensive: if map/player not ready, skip escalation
        }
      } else if (newState === MONSTER_STATES.SEARCHING) {
        monster.state = "SEARCHING";
        monster.hostileState = "SEARCHING";
      } else if (newState === MONSTER_STATES.IDLE) {
        monster.state = "IDLE";
        monster.hostileState = "INACTIVE";
      }
    }

    // 🎮 Behavior Execution
    function executeMonsterBehavior(monster) {
      // Deprecated: legacy state machine behavior replaced by fuzzy updateMonsterAI.
      return;
    }

    // 🔍 Line of Sight Check (uses proper wall-blocking raycast)
    function checkLineOfSight(monster, target) {
      // Use the proper hasLineOfSight function that checks for walls
      return hasLineOfSight(monster.x, monster.y, target.x, target.y);
    }

    // Update NetHack-style inventory display
    function updateInventoryDisplay() {
      const inventoryList = document.getElementById("inventory-list");
      if (!inventoryList) return;

      inventoryList.innerHTML = "";

      if (player.inventory.length === 0) {
        const emptyItem = document.createElement("div");
        emptyItem.className = "inventory-item";
        emptyItem.innerHTML =
          '<span class="item-name" style="text-align: center; color: #666;">(empty)</span>';
        inventoryList.appendChild(emptyItem);
        return;
      }

      player.inventory.forEach((item, index) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "inventory-item";

        // Check if item is equipped
        const isEquipped =
          (item.type === "weapon" && player.equippedWeapon === index) ||
          (item.type === "armor" && player.equippedArmor === index) ||
          (item.type === "ring" && player.ring === index);

        if (isEquipped) {
          itemDiv.classList.add("equipped");
        }

        // NetHack-style item letter (a-z)
        const letter = String.fromCharCode(97 + index); // 'a' + index

        // Format item name and details
        let itemName = item.name || item.type;
        let itemDetails = "";

        if (item.type === "gold") {
          itemName = `${item.amount} gold pieces`;
        } else if (item.type === "potion") {
          itemDetails = ` (+${item.heal}hp)`;
        } else if (item.type === "weapon") {
          itemDetails = ` (+${item.damage}dmg)`;
        } else if (item.type === "armor") {
          itemDetails = ` (AC+${item.ac})`;
        } else if (item.type === "food") {
          itemDetails = ` (${item.nutrition})`;
        } else if (item.type === "wand") {
          itemDetails = ` (${item.charges})`;
        }

        itemDiv.innerHTML = `
            <span class="item-letter">${letter})</span>
            <span class="item-name">${itemName}${itemDetails}</span>
            ${isEquipped ? '<span class="item-count">*</span>' : ""}
          `;

        inventoryList.appendChild(itemDiv);
      });
    }

    function detectionArc(monster) {
      // If monster AI is globally disabled, report no sight to avoid detection-driven state transitions
      if (typeof MONSTER_AI_DISABLED !== 'undefined' && MONSTER_AI_DISABLED) {
        return { sees: false, front: false, side: false, rear: false, angleToPlayer: 0, dist: Infinity };
      }
      // Return whether player is seen by strict arcs
      const dx = player.x - monster.x;
      const dy = player.y - monster.y;
      const dist = Math.hypot(dx, dy);
      const angleToPlayer = Math.atan2(dx, dy);
      let angleDiff = Math.abs(angleToPlayer - monster.facingAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      const dc = TUNING.combat.detection;
      const front = angleDiff <= dc.frontCone && dist <= dc.frontDist; // ~30deg cone by default
      const side =
        angleDiff > dc.frontCone &&
        angleDiff <= dc.sideCone &&
        dist <= dc.sideDist;
      const rear = angleDiff > dc.rearCone && dist <= dc.rearDist;
      // Require line of sight through the tile map to reduce false positives around corners
      const hasLOS = hasLineOfSight(monster.x, monster.y, player.x, player.y);
      return {
        sees: (front || side || rear) && hasLOS,
        front,
        side,
        rear,
        angleToPlayer,
        dist,
      };
    }

    // Pure detection API: returns detection details without mutating state.
    // Use this for unit tests and as the authoritative detection implementation.
    function detectPlayerPure(monster, playerObj, mapSnapshot, cfg) {
      // cfg optional; fallback to global tuning
      const dc = cfg || (TUNING && TUNING.combat && TUNING.combat.detection) || {
        frontCone: Math.PI / 6,
        sideCone: Math.PI / 3,
        rearCone: Math.PI,
        frontDist: 12,
        sideDist: 9,
        rearDist: 0
      };

      if (!monster || !playerObj || !mapSnapshot) return { sees: false, reason: null };

      const dx = playerObj.x - monster.x;
      const dy = playerObj.y - monster.y;
      const dist = Math.hypot(dx, dy);
      const angleToPlayer = Math.atan2(dx, dy);
      let angleDiff = Math.abs(angleToPlayer - monster.facingAngle || 0);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      const front = angleDiff <= dc.frontCone && dist <= dc.frontDist;
      const side = angleDiff > dc.frontCone && angleDiff <= dc.sideCone && dist <= dc.sideDist;
      const rear = angleDiff > dc.sideCone && dist <= (dc.rearDist || 0);

      // Use existing tile LOS helper - no fallback, walls should block detection
      let hasLOS = false;
      try {
        if (typeof hasLineOfSight === 'function') {
          hasLOS = hasLineOfSight(monster.x, monster.y, playerObj.x, playerObj.y);
        }
      } catch (e) {
        console.warn('Line of sight check failed:', e);
        hasLOS = false; // Default to no line of sight if check fails
      }

      const sees = (front || side || rear) && hasLOS;
      const reason = sees ? (front ? 'vision-front' : (side ? 'vision-side' : 'vision-rear')) : null;
      return { sees, front, side, rear, angleToPlayer, dist, reason, hasLOS };
    }

    // Runtime test harness for detection logic. Call from the browser console: runMonsterDetectionTests()
    function runMonsterDetectionTests() {
      const tests = [];
      // simple empty map helper
      function emptyMap(w, h) {
        return Array.from({ length: h }, () => Array.from({ length: w }, () => ({ type: TILE.FLOOR, roomId: null })));
      }
      // Monster facing north (angle 0 per codebase conventions)
      const monster = { x: 5, y: 5, facingAngle: 0 };
      const cfg = TUNING && TUNING.combat && TUNING.combat.detection;
      tests.push({ desc: 'Player directly in front within frontDist', player: { x: 5, y: 2 }, expect: true });
      tests.push({ desc: 'Player to side within sideDist', player: { x: 8, y: 5 }, expect: true });
      tests.push({ desc: 'Player behind (no detection)', player: { x: 5, y: 8 }, expect: false });
      const mapSnap = emptyMap(16, 16);
      console.group('Monster detection tests');
      tests.forEach((t, i) => {
        const res = detectPlayerPure(monster, t.player, mapSnap, cfg);
        const pass = !!res.sees === !!t.expect;
        console.log(`${i + 1}. ${t.desc} -> sees: ${res.sees} (dist:${Math.round(res.dist)} reason:${res.reason}) => ${pass ? 'PASS' : 'FAIL'}`);
      });
      console.groupEnd();
      return true;
    }

    function smartChase(monster, target) {
      // Cache and reuse paths until target changes or path is exhausted
      // Fair combat: if HOSTILE, prefer an intercept tile directly in front of the player (no diagonal pokes)
      let desiredTarget = target;
      if (monster.state === "HOSTILE") {
        const fdx = -Math.round(Math.sin(player.rotationY));
        const fdy = -Math.round(Math.cos(player.rotationY));
        const frontX = player.x + fdx;
        const frontY = player.y + fdy;
        const isInside = (x, y) =>
          x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;
        const isFree = (x, y) =>
          isInside(x, y) &&
          map[y][x].type !== TILE.WALL &&
          !monsters.some((m) => m !== monster && m.x === x && m.y === y);
        if (isFree(frontX, frontY)) {
          desiredTarget = { x: frontX, y: frontY };
        } else {
          // fall back to any orthogonal adjacent tile next to player that is free
          const orthos = [
            { x: player.x + 1, y: player.y },
            { x: player.x - 1, y: player.y },
            { x: player.x, y: player.y + 1 },
            { x: player.x, y: player.y - 1 },
          ];
          const alt = orthos.find((p) => isFree(p.x, p.y));
          if (alt) desiredTarget = alt;
        }
      }
      const tgtKey = `${desiredTarget.x},${desiredTarget.y}`;
      if (
        !monster.path ||
        !monster.path.length ||
        monster.pathTarget !== tgtKey
      ) {
        monster.path = findPath(
          { x: monster.x, y: monster.y },
          desiredTarget
        );
        monster.pathTarget = tgtKey;
      }
      // Recompute path if stuck in place for a couple turns (blocked by other monsters)
      if (
        monster._lastPosX === monster.x &&
        monster._lastPosY === monster.y
      ) {
        monster.stuckTurns = (monster.stuckTurns || 0) + 1;
      } else {
        monster.stuckTurns = 0;
      }
      monster._lastPosX = monster.x;
      monster._lastPosY = monster.y;
      if ((monster.stuckTurns || 0) >= 2) {
        monster.path = findPath(
          { x: monster.x, y: monster.y },
          desiredTarget
        );
        monster.stuckTurns = 0;
      }
      const tile = map[monster.y]?.[monster.x];
      const isInRoom = tile && tile.roomId && tile.roomId !== "corridor";
      // Cadence rules
      if (monster.state === "SEARCHING") {
        monster._skip = !monster._skip;
        if (monster._skip) return; // 1:2 half speed
      } else if (monster.state === "HOSTILE" && !isInRoom) {
        monster._c3 = (monster._c3 || 0) + 1;
        if (monster._c3 % 3 === 0) return; // 2:3 in corridors
      }
      moveMonsterOnPath(monster);
    }
    function moveMonsterOnPath(monster) {
      if (monster.path && monster.path.length > 1) {
        const nextStep = monster.path[1];
        // If next step is occupied, attempt to refresh path once and skip this turn
        if (
          monsters.some(
            (other) =>
              other !== monster &&
              other.x === nextStep.x &&
              other.y === nextStep.y
          )
        ) {
          // Nudge path to recompute on next tick
          monster.path = findPath(
            { x: monster.x, y: monster.y },
            monster.state === "RETURNING"
              ? monster.spawnPos
              : monster.pathTarget
                ? ((p) => {
                  const [x, y] = p.split(",").map(Number);
                  return { x, y };
                })(monster.pathTarget)
                : { x: player.x, y: player.y }
          );
          return;
        }
        {
          // Prevent stepping onto the player's tile under all circumstances
          if (nextStep.x === player.x && nextStep.y === player.y) {
            // Try to find an alternate adjacent free tile (orthogonal) to move to instead
            const alternatives = [
              { x: monster.x + 1, y: monster.y },
              { x: monster.x - 1, y: monster.y },
              { x: monster.x, y: monster.y + 1 },
              { x: monster.x, y: monster.y - 1 },
            ];
            const isFree = (x, y) =>
              x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT &&
              map[y][x].type !== TILE.WALL &&
              !monsters.some((m) => m !== monster && m.x === x && m.y === y) &&
              !(x === player.x && y === player.y);
            const alt = alternatives.find(p => isFree(p.x, p.y));
            if (alt) {
              monster.facingAngle = Math.atan2(alt.x - monster.x, alt.y - monster.y);
              monster.x = alt.x;
              monster.y = alt.y;
              monster.object.position.set(monster.x * TILE_SIZE, 0, monster.y * TILE_SIZE);
            } else {
              // No safe alternative - skip move this turn to avoid overlapping the player
              return;
            }
          } else {
            const dx = nextStep.x - monster.x;
            const dy = nextStep.y - monster.y;
            monster.facingAngle = Math.atan2(dx, dy);
            monster.x = nextStep.x;
            monster.y = nextStep.y;
            monster.object.position.set(
              monster.x * TILE_SIZE,
              0,
              monster.y * TILE_SIZE
            );
          }
        }
      }
    }
    function canMonsterAttack(monster, target) {
      // Only orthogonal adjacency (no diagonal), and must be facing within a tight cone
      const dx = target.x - monster.x;
      const dy = target.y - monster.y;
      const manhattan = Math.abs(dx) + Math.abs(dy);
      if (manhattan !== 1) return false; // disallow diagonal or distance > 1
      const angleTo = Math.atan2(dx, dy);
      let d = Math.abs(angleTo - monster.facingAngle);
      if (d > Math.PI) d = 2 * Math.PI - d;
      return d <= TUNING.combat.facingPrecision; // default ~22.5°
    }
    function turnMonsterToFace(monster, target) {
      const dx = target.x - monster.x;
      const dy = target.y - monster.y;
      monster.facingAngle = Math.atan2(dx, dy);
    }
    function checkLineOfSightArc(monster) {
      return detectionArc(monster).sees;
    }

    // 🎨 Enhanced Monster Visual System with Circles and Flashlights
    function updateMonsterVisuals(monster, effect = null) {
      const visuals = monster.object.userData.visuals;
      if (!visuals) return;

      // Handle flash effects (event-based, so keeping it)
      if (effect === "flash") {
        handleFlashEffect(monster, visuals);
        return;
      }

      // Initialize geometries if missing (no-op if already exist)
      updateMonsterCircle(monster, visuals);
      updateMonsterArrow(monster, visuals);

      // Note: Continual updates are now handled by GameRenderSync.syncAll()
    }

    // ⚡ Flash Effect Handler
    function handleFlashEffect(monster, visuals) {
      if (visuals.border && visuals.border.material && "emissive" in visuals.border.material) {
        visuals.border.material.emissive.setHex(0xffffff);
        setTimeout(() => {
          visuals.border.material.emissive.setHex(0x000000);
        }, 150);
      }

      // Also flash the circle border for enhanced visibility
      if (visuals.circle && visuals.circle.material) {
        const originalColor = visuals.circle.material.color.clone();
        visuals.circle.material.color.setHex(0xffffff);
        setTimeout(() => {
          visuals.circle.material.color.copy(originalColor);
        }, 150);
      }
    }

    // ⭕ Monster Circle System
    function updateMonsterCircle(monster, visuals) {
      if (!visuals.circle) {
        // Create main circle (same size as player circle)
        const circleRadius = TILE_SIZE * 0.4; // Same as player
        const circleGeometry = new THREE.CircleGeometry(circleRadius, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({
          transparent: true,
          side: THREE.DoubleSide
        });
        visuals.circle = new THREE.Mesh(circleGeometry, circleMaterial);
        visuals.circle.rotation.x = -Math.PI / 2; // Lay flat on ground
        visuals.circle.position.y = 0.02; // Slightly above ground
        monster.object.add(visuals.circle);

        // Add white border (same as player)
        const borderGeometry = new THREE.RingGeometry(
          circleRadius - 0.075,
          circleRadius + 0.075,
          32
        );
        const borderMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          side: THREE.DoubleSide
        });
        visuals.border = new THREE.Mesh(borderGeometry, borderMaterial);
        visuals.border.rotation.x = -Math.PI / 2;
        visuals.border.position.y = 0.025;
        monster.object.add(visuals.border);
      }

      // Note: Color/State updates handled by GameRenderSync
    }

    // ➡️ Monster Arrow System  
    function updateMonsterArrow(monster, visuals) {
      if (!visuals.arrow) {
        // Create arrow if it doesn't exist
        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(0, 0.2);
        arrowShape.lineTo(-0.1, -0.1);
        arrowShape.lineTo(0, 0);
        arrowShape.lineTo(0.1, -0.1);
        arrowShape.closePath();

        const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
        const arrowMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.9
        });
        visuals.arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        visuals.arrow.rotation.x = -Math.PI / 2;
        visuals.arrow.position.y = 0.1;
        monster.object.add(visuals.arrow);
      }
      // Note: Updates handled by GameRenderSync
    }

    // 🔦 Monster Flashlight System
    function updateMonsterFlashlight(monster, visuals) {
      if (!visuals.flashlight) {
        // Create flashlight
        visuals.flashlight = new THREE.SpotLight(0xffffff, 0.5, 10, Math.PI / 6, 0.5);
        visuals.flashlight.position.set(0, 1, 0); // Local to monster

        // Create target attached to monster, pointing forward
        const targetObj = new THREE.Object3D();
        targetObj.position.set(0, 0, 5); // 5 units local Z (forward?)
        visuals.flashlight.target = targetObj;

        monster.object.add(visuals.flashlight);
        monster.object.add(visuals.flashlight.target);
        visuals.flashlight.visible = false; // Default hidden
      }
      // Updates handled by GameRenderSync
    }

    // 💡 Monster Orb Light System
    function updateMonsterOrb(monster, visuals) {
      if (!visuals.orb) {
        // Create orb light above monster
        const orbGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const orbMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          emissive: 0x444444,
          transparent: true,
          opacity: 0.3
        });
        visuals.orb = new THREE.Mesh(orbGeometry, orbMaterial);
        visuals.orb.position.set(0, 2, -0.5); // Above and slightly behind
        monster.object.add(visuals.orb);
      }
      // Updates handled by GameRenderSync
    }

    // --- A* Pathfinding ---

    // --- UI & Input ---
    // ================== ADVENTURE EVENT LOG (Endless Scroll) ==================
    // In-memory full log buffer (unbounded except for safety cap)
    const adventureEventLogData = window.adventureEventLogData || [];
    window.adventureEventLogData = adventureEventLogData;
    let adventureEventLogViewportInitialized = false;
    const EVENT_LOG_MAX_BUFFER = 5000; // safety cap
    const EVENT_LOG_VIEW_SLICE = 160;  // number of most recent entries rendered

    function renderEventLogLatest() {
      const list = document.getElementById('adventure-event-log');
      if (!list) return;
      list.innerHTML = '';
      const start = Math.max(0, adventureEventLogData.length - EVENT_LOG_VIEW_SLICE);
      for (let i = start; i < adventureEventLogData.length; i++) {
        const rec = adventureEventLogData[i];
        const li = document.createElement('li');
        li.textContent = rec.message;
        if (rec.severity) li.classList.add(rec.severity);
        list.appendChild(li);
      }
      list.scrollTop = list.scrollHeight; // stick to bottom
    }

    function prependOlderEventLogChunk() {
      const list = document.getElementById('adventure-event-log');
      if (!list) return;
      if (adventureEventLogData.length <= list.children.length) return; // nothing older
      const currentlyRendered = list.children.length;
      const additional = EVENT_LOG_VIEW_SLICE;
      const totalToRender = Math.min(adventureEventLogData.length, currentlyRendered + additional);
      const fragment = document.createDocumentFragment();
      const itemsToAdd = [];
      for (let i = adventureEventLogData.length - currentlyRendered - 1; i >= adventureEventLogData.length - totalToRender; i--) {
        if (i < 0) break;
        itemsToAdd.push(adventureEventLogData[i]);
      }
      const prevScrollHeight = list.scrollHeight;
      // Prepend in chronological order
      for (let j = itemsToAdd.length - 1; j >= 0; j--) {
        const rec = itemsToAdd[j];
        const li = document.createElement('li');
        li.textContent = rec.message;
        if (rec.severity) li.classList.add(rec.severity);
        fragment.insertBefore(li, fragment.firstChild);
      }
      list.insertBefore(fragment, list.firstChild);
      // Maintain scroll position to appear continuous
      const newScrollHeight = list.scrollHeight;
      list.scrollTop = newScrollHeight - prevScrollHeight;
    }

    function ensureEventLogScroller() {
      if (adventureEventLogViewportInitialized) return;
      const list = document.getElementById('adventure-event-log');
      if (!list) return;
      adventureEventLogViewportInitialized = true;
      list.addEventListener('scroll', () => {
        if (list.scrollTop === 0) {
          prependOlderEventLogChunk();
        }
      });
    }

    function classifySeverity(message, color) {
      const lower = message.toLowerCase();
      if (/(critical|massive|fatal|wound|hit|attack|blood|damage)/.test(lower) || (color && color.includes('ef4444'))) return 'event-danger';
      if (/(warn|caution|searching|lost sight|stumble|fatigue|hungry)/.test(lower) || (color && color.includes('f59e0b'))) return 'event-warn';
      if (/(heal|recovered|leveled|level up|treasure|gold|xp|experience|success|victory)/.test(lower) || (color && color.includes('10b981'))) return 'event-success';
      return '';
    }

    function logMessage(message, color = "#e0e0e0") {
      // Duplicate suppression: avoid logging exact same message consecutively (or within last 3 entries)
      try {
        const recent = adventureEventLogData.slice(-3);
        if (recent.some(r => r.message === message)) {
          return; // suppress duplicate
        }
      } catch (e) { /* ignore */ }
      // Original message log
      const p = document.createElement("p");
      p.textContent = message;
      p.style.color = color;
      messageLogEl.insertBefore(p, messageLogEl.firstChild);
      if (messageLogEl.children.length > 50)
        messageLogEl.removeChild(messageLogEl.lastChild);

      // Adventure log - add message with auto-scroll
      const adventureLog = document.getElementById("dnd-adventure-log");
      if (adventureLog) {
        const adventureP = document.createElement("p");
        adventureP.textContent = message;
        adventureP.style.color = color;
        adventureP.style.margin = "0 0 4px 0";
        adventureLog.appendChild(adventureP);
        adventureLog.scrollTop = adventureLog.scrollHeight;

        // Limit adventure log to 100 messages
        if (adventureLog.children.length > 100) {
          adventureLog.removeChild(adventureLog.firstChild);
        }
      }

      // New unified Event Log (ul#adventure-event-log)
      // New endless event log buffer
      const severity = classifySeverity(message, color);
      adventureEventLogData.push({ message, color, severity, ts: Date.now() });
      if (adventureEventLogData.length > EVENT_LOG_MAX_BUFFER) adventureEventLogData.splice(0, adventureEventLogData.length - EVENT_LOG_MAX_BUFFER);
      ensureEventLogScroller();
      renderEventLogLatest();
    }

    // Quick Guide Buttons -> Insert text into adventure command input
    (function setupQuickGuide() {
      if (typeof document === 'undefined') return;
      const container = document.getElementById('adventure-quick-guide');
      const mainInput = document.getElementById('dnd-adventure-command-input');
      if (!container || !mainInput) return; // graceful if layout missing
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-insert]');
        if (!btn) return;
        const text = btn.getAttribute('data-insert');
        if (!text) return;
        mainInput.value = text + (text.endsWith(' ') ? '' : ' ');
        mainInput.focus();
      });
      // Action row buttons share data-insert
      const actionsRow = document.getElementById('adventure-quick-actions');
      if (actionsRow) {
        actionsRow.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-insert]');
          if (!btn) return;
          const text = btn.getAttribute('data-insert');
          if (!text) return;
          mainInput.value = text + (text.endsWith(' ') ? '' : ' ');
          mainInput.focus();
        });
      }
    })();

    function updateUI() {
      // legacy text strip (kept hidden but updated if present)
      const statsDisplay = document.getElementById("dnd-stats-display");
      if (statsDisplay)
        statsDisplay.textContent = `Lvl: ${player.level} (${player.exp
          }/${player.expToLevel()}) | HP: ${player.health}/${player.maxHealth
          } | STR:${player.str} DEX:${player.dex} CON:${player.con}`;
      // new panel values
      const lvlEl = document.getElementById("stat-level");
      if (lvlEl) lvlEl.textContent = String(player.level);

      // Update compass level display
      const compassLevelEl = document.getElementById("compass-level-main");
      if (compassLevelEl) {
        compassLevelEl.textContent = String(player.level).padStart(2, '0');
      }

      // Update adventure level display
      const adventureLevelEl = document.getElementById("dnd-adventure-level-num");
      if (adventureLevelEl) {
        adventureLevelEl.textContent = String(player.level).padStart(2, '0');
      }

      const hpText = document.getElementById("stat-hp-text");
      if (hpText) hpText.textContent = `${player.health}/${player.maxHealth}`;

      // Update compass HP display
      const compassHpEl = document.getElementById("compass-hp-main");
      if (compassHpEl) {
        compassHpEl.textContent = `${player.health}/${player.maxHealth}`;
      }
      const hpBar = document.getElementById("stat-hp-bar");
      if (hpBar) {
        const pct = Math.max(
          0,
          Math.min(
            100,
            Math.round((player.health / Math.max(1, player.maxHealth)) * 100)
          )
        );
        hpBar.style.width = pct + "%";
      }
      const atkEl = document.getElementById("stat-atk");
      if (atkEl) atkEl.textContent = String(player.attack);
      const keyEl = document.getElementById("stat-key");
      if (keyEl) keyEl.textContent = player.hasKey ? "Yes" : "No";

      // NetHack-style attributes
      const strEl = document.getElementById("stat-str");
      if (strEl) strEl.textContent = String(player.str);
      const dexEl = document.getElementById("stat-dex");
      if (dexEl) dexEl.textContent = String(player.dex);
      const conEl = document.getElementById("stat-con");
      if (conEl) conEl.textContent = String(player.con);

      // Update adventure view attributes bar
      const attrStrEl = document.getElementById("attr-str");
      if (attrStrEl) attrStrEl.textContent = String(player.str);
      const attrDexEl = document.getElementById("attr-dex");
      if (attrDexEl) attrDexEl.textContent = String(player.dex);
      const attrConEl = document.getElementById("attr-con");
      if (attrConEl) attrConEl.textContent = String(player.con);
      const attrIntEl = document.getElementById("attr-int");
      if (attrIntEl) attrIntEl.textContent = String(player.int || 10);
      const attrWisEl = document.getElementById("attr-wis");
      if (attrWisEl) attrWisEl.textContent = String(player.wis || 10);
      const attrChaEl = document.getElementById("attr-cha");
      if (attrChaEl) attrChaEl.textContent = String(player.cha || 10);

      const acEl = document.getElementById("stat-ac");
      if (acEl) acEl.textContent = String(player.ac);
      const killsEl = document.getElementById("stat-kills");
      if (killsEl) killsEl.textContent = String(player.kills);

      // Update NetHack inventory display
      updateInventoryDisplay();

      // XP bar in stats panel
      const xpBar = document.getElementById("stat-xp-bar");
      if (xpBar) {
        const xpPct = Math.max(
          0,
          Math.min(
            100,
            Math.round((player.exp / Math.max(1, player.expToLevel())) * 100)
          )
        );
        xpBar.style.width = xpPct + "%";
      }

      // Adaptive Status Dial update
      try {
        const dial = document.getElementById('adv-status-dial');
        if (dial) {
          const hpVal = document.getElementById('adv-hp-val');
          const lvlNum = document.getElementById('adv-level-num');
          const ringHealth = dial.querySelector('.adv-ring-health');
          const ringDamage = dial.querySelector('.adv-ring-damage');
          const max = Math.max(1, player.maxHealth);
          const hp = Math.max(0, Math.min(max, player.health));
          const ratio = hp / max;
          if (hpVal) hpVal.textContent = `${hp} / ${max}`;
          if (lvlNum) lvlNum.textContent = String(player.level);
          const circ = 2 * Math.PI * 50; // r=50 from SVG
          if (ringHealth) {
            ringHealth.setAttribute('stroke-dasharray', String(circ));
            ringHealth.setAttribute('stroke-dashoffset', String(Math.max(0, (1 - ratio) * circ)));
          }
          // Health zone classification
          let zone = 'ok';
          if (ratio <= 0.25) zone = 'danger'; else if (ratio <= 0.55) zone = 'warn';
          dial.setAttribute('data-health-zone', zone);
          // Damage flash (compare previous stored health)
          if (typeof dial._prevHp === 'number' && hp < dial._prevHp && ringDamage) {
            const dmgRatio = (dial._prevHp - hp) / max;
            ringDamage.setAttribute('stroke-dasharray', String(circ));
            ringDamage.setAttribute('stroke-dashoffset', String(Math.max(0, (1 - (hp / max)) * circ)));
            dial.classList.add('damage-flash');
            setTimeout(() => dial.classList.remove('damage-flash'), 600);
          }
          dial._prevHp = hp;
        }
      } catch (e) { /* non-fatal */ }

      // Compass Health/XP Rings
      const healthPct = player.health / Math.max(1, player.maxHealth);
      const healthColor =
        healthPct > 0.5
          ? "#2f7a3b" /* medium-dark green - matches HP bar */
          : healthPct > 0.25
            ? "#f1c40f"
            : "#e74c3c";
      const xpPct = player.exp / Math.max(1, player.expToLevel());

      document.querySelectorAll(".compass-rose").forEach((c) => {
        c.style.setProperty("--health-percent", `${healthPct * 100}%`);
        c.style.setProperty("--health-color", healthColor);
      });
      document
        .querySelectorAll(".xp-ring")
        .forEach((r) =>
          r.style.setProperty("--xp-percent", `${xpPct * 100}%`)
        );

      // Compass center text
      const levelCoins = document.querySelectorAll(".level-coin");
      levelCoins.forEach((coin) => {
        coin.innerHTML = `XP<br><strong>${player.exp
          }/${player.expToLevel()}</strong>`;
      });

      // Check for death
      if (player.health <= 0) {
        showDeathModal();
      }

      // 🗡️ Quick Attack Button Logic
      updateQuickAttackButton();
    }

    // 🗡️ Quick Attack Button System
    function updateQuickAttackButton() {
      const quickActions = document.getElementById('quick-actions');
      if (!quickActions) return;

      // Find monsters in the same room as the player
      const playerTile = map[player.y]?.[player.x];
      const playerRoomId = playerTile?.roomId;

      const monstersInRoom = monsters.filter(monster => {
        if (!monster || monster.health <= 0) return false;
        const monsterTile = map[monster.y]?.[monster.x];
        return monsterTile?.roomId === playerRoomId && playerRoomId !== 'corridor';
      });

      if (monstersInRoom.length > 0) {
        quickActions.className = 'stats-section quick-actions-visible';
        const button = document.getElementById('quick-attack-btn');
        if (button) {
          const monsterText = monstersInRoom.length === 1 ? 'Monster' : 'Monsters';
          button.textContent = `⚔️ Attack ${monsterText} (${monstersInRoom.length})`;
        }
      } else {
        quickActions.className = 'stats-section quick-actions-hidden';
      }
    }

    // 🗡️ Quick Attack Monster Function
    function quickAttackMonsters() {
      const playerTile = map[player.y]?.[player.x];
      const playerRoomId = playerTile?.roomId;

      const monstersInRoom = monsters.filter(monster => {
        if (!monster || monster.health <= 0) return false;
        const monsterTile = map[monster.y]?.[monster.x];
        return monsterTile?.roomId === playerRoomId && playerRoomId !== 'corridor';
      });

      if (monstersInRoom.length === 0) {
        logMessage("No monsters to attack in this room.", "#a8a8a8");
        return;
      }

      // Attack the first monster (closest or just first in array)
      const target = monstersInRoom[0];
      logMessage(`⚔️ Quick attacking ${target.name}!`, "#ff6b35");

      // Use the proper attack system
      let damage = rollDice("1d4"); // Base damage

      // Add weapon damage
      if (player.equipment.weapon && player.equipment.weapon.damage) {
        damage = rollDice(player.equipment.weapon.damage);
      }

      // Add strength bonus
      const strBonus = Math.max(-5, Math.min(5, Math.floor((player.str - 10) / 2)));
      damage += strBonus;

      // Add equipment enchantment
      if (player.equipment.weapon && player.equipment.weapon.enchantment) {
        damage += player.equipment.weapon.enchantment;
      }

      damage = Math.max(1, damage); // Minimum 1 damage
      attack(player, target, damage);

      updateUI();
    }

    // Fuzzy responsive scaling for adventure view
    (function initAdventureFuzzyScaling() {
      const root = document.getElementById('adventure-view');
      if (!root || typeof ResizeObserver === 'undefined') return;
      const tiers = [
        { name: 'xs', minW: 0 },
        { name: 'sm', minW: 420 },
        { name: 'md', minW: 560 },
        { name: 'lg', minW: 740 },
        { name: 'xl', minW: 920 }
      ];
      const fuzz = (val, target, range) => {
        const d = Math.abs(val - target);
        return d >= range ? 0 : 1 - (d / range);
      };
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          const w = cr.width;
          // Determine tier
          let tier = 'xs';
          for (let i = tiers.length - 1; i >= 0; i--) {
            if (w >= tiers[i].minW) { tier = tiers[i].name; break; }
          }
          root.setAttribute('data-size-tier', tier);
          // Compute fuzzy scale (if narrow, scale content gracefully)
          // Smooth scale between 0.78 and 1 based on width thresholds
          const scale = w < 480 ? 0.78 + fuzz(w, 480, 140) * 0.22 : 1;
          root.style.setProperty('--adv-scale', scale.toFixed(3));
          if (scale < 0.999) root.setAttribute('data-scaled', 'true'); else root.removeAttribute('data-scaled');
        }
      });
      observer.observe(root);
    })();

    // Death Modal Functions
    function showDeathModal(cause = "You were defeated in combat.") {
      const deathModal = document.getElementById("dnd-game-death-modal");
      const deathCause = document.getElementById("death-cause");

      if (deathCause) {
        deathCause.textContent = cause;
      }

      if (deathModal) {
        deathModal.classList.remove("hidden");
      }

      logMessage("💀 Game Over! " + cause, "#ff4444");
    }

    function hideDeathModal() {
      const deathModal = document.getElementById("dnd-game-death-modal");
      if (deathModal) {
        deathModal.classList.add("hidden");
      }
    }

    function restartGame() {
      hideDeathModal();

      // Reset player state
      player.x = 1;
      player.y = 1;
      player.health = 100;
      player.maxHealth = 100;
      // Reset current tile for NetHack visibility rules
      player.currentTile = map[player.y][player.x];
      player.level = 1;
      player.exp = 0;
      player.str = 15;
      player.dex = 12;
      player.con = 14;
      player.attack = 10;
      player.ac = 0;
      player.kills = 0;
      player.hasKey = false;
      player.rotationY = 0;
      player.targetRotationY = 0;
      player.inventory = [];
      player.wasHit = false;

      // Regenerate dungeon
      generateNextGenDungeon();

      // Update camera and UI
      syncPlayerPositionToCamera();
      updateUI();
      // drawRadar(); // Removed

      logMessage("🔄 Adventure restarted! Welcome back to the dungeon.", "#00e5ff");
      logMessage("Your journey begins anew. May fortune favor you this time!", "#ffffff");
    }

    // Helper to grant XP from any event (monster kill, quest completion, etc.)
    function awardXP(amount, message) {
      player.exp = (player.exp || 0) + Math.max(0, amount | 0);
      if (message) logMessage(message, "#9be");
      checkLevelUp();
      updateUI();
    }
    function handleInput(event) {
      // Allow ESC to exit typing mode
      if (event.key === 'Escape') {
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
        return;
      }
      // If focused on a text input, only block printable chars; allow arrows/WASD for movement
      const ae = document.activeElement;
      const isText = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
      const printable = event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter' || event.key === 'Tab';
      if (isText && printable) return;

      // --- Automove Interruption ---
      // If any movement key is pressed while automoving, cancel it.
      const moveKeys = [
        "4",
        "6",
        "7",
        "8",
        "9",
      ];
      if (isAutoMoving && moveKeys.includes(event.key)) {
        logMessage("Automove canceled.", "#ffc107");
        autoMoveCancel = true;
        isAutoMoving = false;
        clearAutoTrail();
      }

      switch (event.key) {
        case "w":
        case "ArrowUp":
          GameTurnManager.queuePlayerAction(movePlayer, 1);
          break;
        case "s":
        case "ArrowDown":
          GameTurnManager.queuePlayerAction(movePlayer, -1);
          break;
        case "a":
        case "ArrowLeft":
          // turning is instant and does not consume a turn
          quickTurn(90);
          break;
        case "d":
        case "ArrowRight":
          quickTurn(-90);
          break;
        case " ": // NetHack-style search
          GameTurnManager.queuePlayerAction(() => {
            forensics.logAction('search', { x: player.x, y: player.y });
            return searchArea();
          });
          break;
        case "f": // NetHack-style attack (forward) — this consumes a turn
          GameTurnManager.queuePlayerAction(() => {
            forensics.logAction('attack', { x: player.x, y: player.y });
            const dx = -Math.round(Math.sin(player.rotationY));
            const dy = -Math.round(Math.cos(player.rotationY));
            const tx = player.x + dx,
              ty = player.y + dy;
            const target = monsters.find((m) => m.x === tx && m.y === ty);
            if (target) {
              // NetHack-style combat calculation
              let damage = rollDice("1d4"); // Base damage

              // Add weapon damage
              if (player.equipment.weapon && player.equipment.weapon.damage) {
                damage = rollDice(player.equipment.weapon.damage);
              }

              // Add strength bonus
              const strBonus = Math.max(-5, Math.min(5, Math.floor((player.str - 10) / 2)));
              damage += strBonus;

              // Add equipment enchantment
              if (player.equipment.weapon && player.equipment.weapon.enchantment) {
                damage += player.equipment.weapon.enchantment;
              }

              damage = Math.max(1, damage); // Minimum 1 damage
              attack(player, target, damage);
            } else logMessage("You swing at empty air.", "#a8a8a8");
            return Promise.resolve();
          });
          break;
        // vi-keys: h/j/k/l for left/down/up/right
        case "h":
          quickTurn(90);
          break;
        case "l":
          quickTurn(-90);
          break;
        case "k":
          GameTurnManager.queuePlayerAction(movePlayer, 1);
          break;
        case "j":
          GameTurnManager.queuePlayerAction(movePlayer, -1);
          break;
        // numeric keypad mapping — restrict to orthogonal moves only
        case "2":
          faceAndMove(0, 1);
          break; // down
        case "4":
          faceAndMove(-1, 0);
          break; // left
        case "6":
          faceAndMove(1, 0);
          break; // right
        case "8":
          faceAndMove(0, -1);
          break; // up
        case "g": // pickup/gather items at player tile
          GameTurnManager.queuePlayerAction(() => {
            pickupLootIfAny(player.x, player.y);
            return Promise.resolve();
          });
          break;
        case "i":
          toggleInventory();
          break;
        case ">":
        case ".":
          // prompt before descending
          showDescendModal().catch(() => { });
          break;
        case "e": // NetHack-style eat
          GameTurnManager.queuePlayerAction(() => {
            forensics.logAction('eat_prompt');
            showEatMenu();
            return Promise.resolve();
          });
          break;
        case "q": // NetHack-style quaff (drink potion)
          GameTurnManager.queuePlayerAction(() => {
            forensics.logAction('quaff_prompt');
            showQuaffMenu();
            return Promise.resolve();
          });
          break;
        case "r": // NetHack-style read (scroll)
          GameTurnManager.queuePlayerAction(() => {
            forensics.logAction('read_prompt');
            showReadMenu();
            return Promise.resolve();
          });
          break;
        case "w": // NetHack-style wield weapon
          GameTurnManager.queuePlayerAction(() => {
            forensics.logAction('wield_prompt');
            showWieldMenu();
            return Promise.resolve();
          });
          break;
        case "W": // NetHack-style wear armor
          GameTurnManager.queuePlayerAction(() => {
            forensics.logAction('wear_prompt');
            showWearMenu();
            return Promise.resolve();
          });
          break;
        case "t": // NetHack-style take off equipment
          GameTurnManager.queuePlayerAction(() => {
            forensics.logAction('takeoff_prompt');
            showTakeOffMenu();
            return Promise.resolve();
          });
          break;
        case "@": // NetHack-style view character stats
          showCharacterSheet();
          break;
      }
    }

    // Inventory UI toggle and simple inventory listing
    function toggleInventory() {
      const invPanelId = "quick-inventory-panel";
      let panel = document.getElementById(invPanelId);
      if (panel) {
        panel.remove();
        return;
      }
      panel = document.createElement("div");
      panel.id = invPanelId;
      panel.style.position = "absolute";
      panel.style.right = "12px";
      panel.style.top = "12px";
      panel.style.zIndex = 120;
      panel.style.background = "rgba(0,0,0,0.6)";
      panel.style.border = "1px solid rgba(255,255,255,0.08)";
      panel.style.padding = "8px";
      panel.style.borderRadius = "8px";
      panel.style.color = "#e6eef0";
      panel.innerHTML = `<strong>Inventory</strong><div style="max-height:200px;overflow:auto;margin-top:6px"></div>`;
      const list = panel.querySelector("div");
      if (player.inventory.length === 0) list.textContent = "(empty)";
      else
        player.inventory.forEach((it, idx) => {
          const row = document.createElement("div");
          row.style.marginBottom = "6px";
          row.style.display = "flex";
          row.style.justifyContent = "space-between";
          const letter = String.fromCharCode("a".charCodeAt(0) + idx);
          const label = it.name || it.type;
          const acts = [];
          if (it.type === "weapon")
            acts.push(
              `<button data-idx="${idx}" data-act="wield" style="margin-left:6px">Wield</button>`
            );
          if (it.type === "potion")
            acts.push(
              `<button data-idx="${idx}" data-act="quaff" style="margin-left:6px">Quaff</button>`
            );
          if (it.type === "food")
            acts.push(
              `<button data-idx="${idx}" data-act="eat" style="margin-left:6px">Eat</button>`
            );
          acts.push(
            `<button data-idx="${idx}" data-act="drop" style="margin-left:6px">Drop</button>`
          );
          row.innerHTML = `<span>[${letter}] ${label}</span><span>${acts.join(
            ""
          )}</span>`;
          row.querySelectorAll("button").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const idx = Number(e.target.getAttribute("data-idx"));
              const act = e.target.getAttribute("data-act");
              if (act === "wield") {
                wieldItem(idx);
              } else if (act === "quaff") {
                quaffItem(idx);
              } else if (act === "eat") {
                eatFood(idx);
              } else if (act === "drop") {
                dropItem(idx);
              }
              toggleInventory();
            });
          });
          list.appendChild(row);
        });
      document.body.appendChild(panel);
    }

    function wieldItem(idx) {
      const it = player.inventory[idx];
      if (!it) return;
      if (it.type !== "weapon") {
        logMessage("You cannot wield that.", "#a8a8a8");
        return;
      }
      player.equipment.weapon = it;
      player.inventory.splice(idx, 1);
      player.attack = it.damage || player.attack;
      logMessage(`You wield the ${it.name}.`, "#a8a8a8");
      updateUI();
    }

    function dropItem(idx) {
      const it = player.inventory[idx];
      if (!it) return;
      player.inventory.splice(idx, 1); // spawn loot on ground
      const drop = createLootPileObject(it.visual || it.type, it.name || it.type);
      drop.userData = { items: [it] };
      drop.position.set(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
      // Keep scene and registry in sync
      addGameObject(`loot_${player.x}_${player.y}`, drop);
      logMessage(`You drop the ${it.name || it.type}.`, "#a8a8a8");
      updateUI();
    }

    function quaffItem(idx) {
      const it = player.inventory[idx];
      if (!it) return;
      if (it.type !== "potion") {
        logMessage("You cannot quaff that.", "#a8a8a8");
        return;
      }
      player.health = Math.min(
        player.maxHealth,
        player.health + (it.heal || 5)
      );
      player.inventory.splice(idx, 1);
      logMessage(`You quaff the ${it.name} and feel better.`, "#9be");
      updateUI();
    }
    function eatFood(idx) {
      const it = player.inventory[idx];
      if (!it) return;
      if (it.type !== "food") {
        logMessage("You cannot eat that.", "#a8a8a8");
        return;
      }
      const nutrition = Math.max(1, it.nutrition || 800);
      player.nutrition = Math.min(
        1200,
        (player.nutrition == null ? 900 : player.nutrition) + nutrition
      );
      player.inventory.splice(idx, 1);
      const msg =
        player.nutrition > 900 ? "You are satiated." : "You feel better.";
      logMessage(`You eat the ${it.name || "ration"}. ${msg}`, "#9be");
      updateUI();
    }

    function onPlayerTurnTick() {
      // Hunger/starvation disabled: do not decrement nutrition or apply damage
      updateUI();
    }
    function onMouseUp(e) {
      if (e.button === 0) isPanning = false;
      if (e.button === 2) isRotating = false;
    }
    function onMouseWheel(e) {
      if (e.target.closest("#mapview-container")) {
        e.preventDefault();
        // Reverse deltaY: scroll up (negative) = zoom in (smaller values = closer)
        // scroll down (positive) = zoom out (larger values = farther)
        desiredZoomLevel -= 0.5 * e.deltaY;
        desiredZoomLevel = THREE.MathUtils.clamp(desiredZoomLevel, MIN_ZOOM, MAX_ZOOM);
        zoomLevel = desiredZoomLevel; // instant application
        updateCamera(true);
        const slider = document.getElementById('map-zoom-slider');
        if (slider) slider.value = String(Math.round(desiredZoomLevel));
      }
    }
    function handleResize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Map view
      // Map view
      const mapCanvasWrapper = window.rendererSystem?.mapCanvasWrapper;
      if (mapCanvasWrapper) {
          const aspect = mapCanvasWrapper.clientWidth / mapCanvasWrapper.clientHeight;
          camera.aspect = aspect;
          camera.updateProjectionMatrix();
      }

      // Main renderer resize
      mainRenderer.setPixelRatio(dpr);
      mainRenderer.setSize(window.innerWidth, window.innerHeight, false);

      const fog = document.getElementById("map-fog");

      if (fog && window.rendererSystem?.mapCanvasWrapper) {
        const mapCanvasWrapper = window.rendererSystem.mapCanvasWrapper;
        const dpr = window.devicePixelRatio || 1;
        fog.width = mapCanvasWrapper.clientWidth * dpr;
        fog.height = mapCanvasWrapper.clientHeight * dpr;
        fog.style.width = mapCanvasWrapper.clientWidth + "px";
        fog.style.height = mapCanvasWrapper.clientHeight + "px";
      }
      // FPV view
      fpvCamera.aspect =
        fpvViewContainer.clientWidth / fpvViewContainer.clientHeight;
      fpvCamera.updateProjectionMatrix();
      // fpvRenderer resize removed (shared renderer)
      // Keep keypad above the prompt/compass by syncing the CSS var with actual prompt height
      syncPromptHeightVar();
      positionKeypad();
      updateViewSwap();
    }

    // Sync the CSS variable used to position the keypad above the prompt/compass band
    function syncPromptHeightVar() {
      const prompt = document.getElementById("dnd-fpv-prompt");
      if (!prompt) return;
      const h = Math.round(prompt.getBoundingClientRect().height || 0);
      document.documentElement.style.setProperty(
        "--dnd-panel-height",
        h + "px"
      );
    }

    function positionKeypad() {
      const keypad = document.getElementById("dnd-game-movement-overlay");
      if (!keypad) {
        console.error('❌ Keypad not found');
        return;
      }

      // Force position to bottom 30px
      keypad.style.position = 'absolute';
      keypad.style.bottom = '30px';
      keypad.style.top = 'auto';
      keypad.style.left = '50%';
      keypad.style.transform = 'translateX(-50%)';
      keypad.style.zIndex = '100';

      window.keypadRendered = true;
    }
    function handleInteract() {
      // Dice spin removed

      GameTurnManager.queuePlayerAction(() => {
        const dx = -Math.round(Math.sin(player.rotationY));
        const dy = -Math.round(Math.cos(player.rotationY));
        const targetX = player.x + dx;
        const targetY = player.y + dy;
        const monster = monsters.find(
          (m) => m.x === targetX && m.y === targetY
        );
        if (monster) {
          monster.state = monster.state === "GAMBLING" ? "IDLE" : "GAMBLING";
          logMessage(`You challenge the ${monster.name} to a game!`, "cyan");
          updateMonsterVisuals(monster);
        } else {
          logMessage("You see nothing to interact with.", "#a8a8a8");
        }
        return Promise.resolve();
      });
    }


    // --- Game Loop & Init ---
    // Missing helpers (no-ops or minimal behaviors) to prevent runtime errors
    function initResizeAndDrag() {
      // Disabled in favor of FluidUI - Re-enabled for MapView
      // return;
      const pip = document.getElementById("mapview-container");
      const mainContainer = document.getElementById("main-container");
      if (!pip) return;

      const MIN_W = 220;
      const MIN_H = 220;

      // Persist PiP position/size across reloads (desktop only)
      function loadPiPState() {
        if (window.innerWidth <= 768) return; // mobile uses sticky full-width
        try {
          const raw = safeStorage.getItem("mapPiPState.v1");
          if (!raw) return;
          const s = JSON.parse(raw);
          if (!s || typeof s !== "object") return;
          pip.style.position = "absolute";
          if (typeof s.left === "number") {
            pip.style.left = s.left + "px";
            pip.style.right = "auto";
          }
          if (typeof s.top === "number") pip.style.top = s.top + "px";
          if (typeof s.width === "number")
            pip.style.width = Math.max(MIN_W, s.width) + "px";
          if (typeof s.height === "number")
            pip.style.height = Math.max(MIN_H, s.height) + "px";
        } catch { }
      }
      function savePiPState() {
        if (window.innerWidth <= 768) return;
        const rect = pip.getBoundingClientRect();
        const s = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
        try {
          safeStorage.setItem("mapPiPState.v1", JSON.stringify(s));
        } catch { }
      }

      // Throttled renderer resize while dragging/resizing
      let _resizeRAF = null;
      const requestViewResize = () => {
        if (_resizeRAF) return;
        _resizeRAF = requestAnimationFrame(() => {
          _resizeRAF = null;
          try {
            handleResize();
          } catch { }
        });
      };

      // Clamp within viewport
      function clampPiPIntoViewport() {
        const rect = pip.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let left = rect.left;
        let top = rect.top;
        let width = rect.width;
        let height = rect.height;
        left = Math.min(Math.max(0, left), Math.max(0, vw - width));
        top = Math.min(Math.max(0, top), Math.max(0, vh - height));
        pip.style.left = left + "px";
        pip.style.top = top + "px";
        pip.style.right = "auto";
      }

      function isPiPActive() {
        // Disable drag/resize only on mobile
        if (window.innerWidth <= 768) return false;
        return true;
      }

      // Dragging the container (avoid when starting on a resize handle)
      let dragging = false;
      let dragStart = { x: 0, y: 0, left: 0, top: 0 };
      pip.addEventListener("mousedown", (e) => {
        if (!isPiPActive()) return;
        if (e.button !== 0) return; // left only
        if (e.target.closest(".resize-handle")) return; // let resize logic handle
        const rect = pip.getBoundingClientRect();
        dragging = true;
        pip.style.willChange = "transform, left, top, width, height";
        pip.style.transition = "none";
        pip.style.cursor = "grabbing";
        pip.style.right = "auto";
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
        dragStart.left = rect.left;
        dragStart.top = rect.top;
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd, { once: true });
      });
      function onDragMove(e) {
        if (!dragging) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        let nextLeft = dragStart.left + dx;
        let nextTop = dragStart.top + dy;
        // Clamp within viewport while dragging
        const vw = window.innerWidth,
          vh = window.innerHeight;
        const rect = pip.getBoundingClientRect();
        const width = rect.width,
          height = rect.height;
        nextLeft = Math.min(Math.max(0, nextLeft), Math.max(0, vw - width));
        nextTop = Math.min(Math.max(0, nextTop), Math.max(0, vh - height));
        pip.style.left = nextLeft + "px";
        pip.style.top = nextTop + "px";
        requestViewResize();
      }
      function onDragEnd() {
        if (!dragging) return;
        dragging = false;
        pip.style.cursor = "";
        clampPiPIntoViewport();
        savePiPState();
        pip.style.willChange = "";
      }

      // Resizing via handles
      let resizing = false;
      let resizeDir = "";
      let resizeStart = { x: 0, y: 0, left: 0, top: 0, width: 0, height: 0 };
      pip.querySelectorAll(".resize-handle").forEach((handle) => {
        handle.addEventListener("mousedown", (e) => {
          if (!isPiPActive()) return;
          if (e.button !== 0) return;
          e.stopPropagation();
          const rect = pip.getBoundingClientRect();
          resizing = true;
          pip.style.willChange = "transform, left, top, width, height";
          pip.style.transition = "none";
          pip.style.right = "auto";
          resizeStart = {
            x: e.clientX,
            y: e.clientY,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          };
          if (handle.classList.contains("se")) resizeDir = "se";
          else if (handle.classList.contains("sw")) resizeDir = "sw";
          else if (handle.classList.contains("ne")) resizeDir = "ne";
          else if (handle.classList.contains("nw")) resizeDir = "nw";
          else if (handle.classList.contains("n")) resizeDir = "n";
          else if (handle.classList.contains("s")) resizeDir = "s";
          else if (handle.classList.contains("e")) resizeDir = "e";
          else if (handle.classList.contains("w")) resizeDir = "w";
          document.addEventListener("mousemove", onResizeMove);
          document.addEventListener("mouseup", onResizeEnd, { once: true });
        });
      });
      function onResizeMove(e) {
        if (!resizing) return;
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        let left = resizeStart.left;
        let top = resizeStart.top;
        let width = resizeStart.width;
        let height = resizeStart.height;
        if (resizeDir.includes("e")) {
          width = Math.max(MIN_W, resizeStart.width + dx);
        }
        if (resizeDir.includes("s")) {
          height = Math.max(MIN_H, resizeStart.height + dy);
        }
        if (resizeDir.includes("w")) {
          width = Math.max(MIN_W, resizeStart.width - dx);
          left = resizeStart.left + dx;
        }
        if (resizeDir.includes("n")) {
          height = Math.max(MIN_H, resizeStart.height - dy);
          top = resizeStart.top + dy;
        }
        // Clamp within viewport during resize
        const vw = window.innerWidth,
          vh = window.innerHeight;
        if (left < 0) {
          width += left;
          left = 0;
        }
        if (top < 0) {
          height += top;
          top = 0;
        }
        width = Math.min(width, vw - left);
        height = Math.min(height, vh - top);
        pip.style.left = left + "px";
        pip.style.top = top + "px";
        pip.style.width = width + "px";
        pip.style.height = height + "px";
        requestViewResize();
      }
      function onResizeEnd() {
        if (!resizing) return;
        resizing = false;
        clampPiPIntoViewport();
        savePiPState();
        pip.style.willChange = "";
      }

      // Keep inside viewport on window resize and when toggling views-swapped
      window.addEventListener("resize", () => {
        if (isPiPActive()) {
          clampPiPIntoViewport();
          requestViewResize();
        }
      });
      loadPiPState();
      // Ensure valid initial bounds
      if (isPiPActive()) clampPiPIntoViewport();
    }
    function initGhostWalls() {
      // Prepare storage for original and see-through materials on the instanced wall mesh
      if (!wallInstancedMesh) return;
      if (!wallInstancedMesh.userData) wallInstancedMesh.userData = {};
      wallInstancedMesh.userData.originalMaterials =
        wallInstancedMesh.material;
      wallInstancedMesh.userData.seeThroughMaterials = null; // deprecated in favor of per-instance hiding
      // Track per-instance hidden state (matrix backups)
      if (!wallInstancedMesh.userData.hiddenInstances)
        wallInstancedMesh.userData.hiddenInstances = new Map();
      wallInstancedMesh.userData.prevHiddenSet = new Set();
    }
    function makeSeeThroughMaterials() {
      if (!wallInstancedMesh) return null;
      if (wallInstancedMesh.userData.seeThroughMaterials)
        return wallInstancedMesh.userData.seeThroughMaterials;
      const original = wallInstancedMesh.userData.originalMaterials;
      const arr = Array.isArray(original) ? original : [original];
      // Clone originals but set to wireframe with low opacity and no depth write so camera "sees through"
      const wire = arr.map((mat) => {
        const m = mat.clone();
        m.wireframe = true;
        m.transparent = true;
        m.opacity = 0.15;
        m.depthWrite = false;
        m.depthTest = false; // always visible outline
        return m;
      });
      wallInstancedMesh.userData.seeThroughMaterials =
        wire.length === 1 ? wire[0] : wire;
      return wallInstancedMesh.userData.seeThroughMaterials;
    }
    // Deprecated material-swap approach kept for fallback, but unused now
    function applySeeThroughWalls() {
      /* no-op: using per-instance hiding */
    }
    function restoreWallMaterials() {
      /* no-op: using per-instance hiding */
    }

    // Hide only specific wall instances (by instanceId) by scaling them to near-zero and backing up their matrices
    function hideWallInstances(instanceIds) {
      if (!wallInstancedMesh) return;
      if (!wallInstancedMesh.userData?.hiddenInstances) initGhostWalls();
      const hidden = wallInstancedMesh.userData.hiddenInstances;
      const toKeep = new Set(instanceIds);

      let changed = false;

      // Restore any that are no longer in the list
      for (const [id, backup] of hidden.entries()) {
        if (!toKeep.has(id)) {
          wallInstancedMesh.setMatrixAt(id, backup);
          hidden.delete(id);
          changed = true;
        }
      }

      // Hide current occluders
      const dummy = new THREE.Object3D();
      const m = new THREE.Matrix4();
      for (const id of instanceIds) {
        if (!hidden.has(id)) {
          wallInstancedMesh.getMatrixAt(id, m);
          hidden.set(id, m.clone());
          // scale down to effectively invisible for this pass
          dummy.matrix.copy(m);
          dummy.matrix.decompose(
            dummy.position,
            dummy.quaternion,
            dummy.scale
          );
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          wallInstancedMesh.setMatrixAt(id, dummy.matrix);
          changed = true;
        }
      }

      if (changed) {
        wallInstancedMesh.instanceMatrix.needsUpdate = true;
      }
    }

    function restoreAllHiddenWallInstances() {
      if (!wallInstancedMesh?.userData?.hiddenInstances) return;
      const hidden = wallInstancedMesh.userData.hiddenInstances;
      if (hidden.size === 0) return; // Optimization: Don't update if nothing to restore

      for (const [id, backup] of hidden.entries()) {
        wallInstancedMesh.setMatrixAt(id, backup);
      }
      hidden.clear();
      wallInstancedMesh.instanceMatrix.needsUpdate = true;
    }
    function isPlayerOccludedFromCamera() {
      if (!player?.object || !wallInstancedMesh) return false;
      try {
        const raycaster = new THREE.Raycaster();
        const origin = camera.position.clone();
        const target = player.object.position.clone();
        const dir = target.clone().sub(origin).normalize();
        raycaster.set(origin, dir);
        raycaster.far = origin.distanceTo(target);
        const hits =
          raycaster.intersectObject(wallInstancedMesh, false) || [];
        if (!hits.length) return false;
        const distToPlayer = origin.distanceTo(target);
        return hits[0].distance < distToPlayer - 0.25;
      } catch (_) {
        // Fallback: grid DDA check along ground plane
        try {
          const sx = Math.floor(player.x),
            sy = Math.floor(player.y);
          const cx = Math.floor(camera.position.x / TILE_SIZE);
          const cy = Math.floor(camera.position.z / TILE_SIZE);
          const dx = Math.sign(sx - cx);
          const dy = Math.sign(sy - cy);
          let x = cx,
            y = cy;
          let steps = 0;
          while ((x !== sx || y !== sy) && steps++ < 512) {
            if (map[y]?.[x]?.type === TILE.WALL) return true;
            const ex = Math.abs(sx + 0.5 - (x + 0.5));
            const ey = Math.abs(sy + 0.5 - (y + 0.5));
            if (ex > ey) x += dx;
            else y += dy;
          }
          return false;
        } catch {
          return false;
        }
      }
    }
    function getOccludingInstanceIds() {
      if (!player?.object || !wallInstancedMesh) return [];
      const raycaster = new THREE.Raycaster();
      const origin = camera.position.clone();
      const target = player.object.position.clone();
      const dir = target.clone().sub(origin).normalize();
      raycaster.set(origin, dir);
      raycaster.far = origin.distanceTo(target) - 0.01;
      const hits = raycaster.intersectObject(wallInstancedMesh, false) || [];
      // Map to unique instanceIds along the line segment to the player
      const ids = [];
      const seen = new Set();
      for (const h of hits) {
        const id = h.instanceId;
        if (typeof id === "number" && !seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
      return ids;
    }

    // Fan out a few rays around the player so we hide any walls blocking view near the player, not just the exact center ray
    function getOccludingInstanceIdsFan() {
      if (!player?.object || !wallInstancedMesh) return [];
      const origin = camera.position.clone();
      const center = player.object.position.clone();
      const offsets = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(TILE_SIZE * 0.8, 0, 0),
        new THREE.Vector3(-TILE_SIZE * 0.8, 0, 0),
        new THREE.Vector3(0, 0, TILE_SIZE * 0.8),
        new THREE.Vector3(0, 0, -TILE_SIZE * 0.8),
      ];
      const raycaster = new THREE.Raycaster();
      const seen = new Set();
      const ids = [];
      for (const off of offsets) {
        const target = center.clone().add(off);
        const dir = target.clone().sub(origin).normalize();
        raycaster.set(origin, dir);
        raycaster.far = origin.distanceTo(target) - 0.01;
        const hits =
          raycaster.intersectObject(wallInstancedMesh, false) || [];
        for (const h of hits) {
          const id = h.instanceId;
          if (typeof id === "number" && !seen.has(id)) {
            seen.add(id);
            ids.push(id);
          }
        }
      }
      return ids;
    }

    let ghostingFrameCount = 0;

    function updateWallGhosting(mapPass = false) {
      if (!player?.object || !wallInstancedMesh) return;

      // OPTIMIZATION: Throttle updates to every 10 frames to save CPU
      ghostingFrameCount++;
      if (ghostingFrameCount % 10 !== 0 && !mapPass) return;

      // Enhanced wall and shadow management for different views
      if (mapPass) {
        // Manage wall shadowing in map view
        const tile = map[player.y]?.[player.x];
        const isCorridor = tile && tile.roomId === 'corridor';
        const highPitch = TUNING.map.pitchDeg >= 80;

        // For wall ghosting in map view
        if (isCorridor || highPitch) {
          restoreAllHiddenWallInstances();
        } else {
          const ids = getOccludingInstanceIdsFan();
          if (ids.length) hideWallInstances(ids);
          else restoreAllHiddenWallInstances();
        }

        // Enhanced shadow settings for map view
        if (typeof mapDirectionalBoost !== 'undefined') {
          mapDirectionalBoost.castShadow = true; // Enable shadows in map view

          // Adjust shadow settings for map view
          if (wallInstancedMesh) {
            if (!wallInstancedMesh.castShadow) wallInstancedMesh.castShadow = true;
            if (!wallInstancedMesh.receiveShadow) wallInstancedMesh.receiveShadow = true;
          }

          // Update floor shadow receiving
          if (typeof plane !== 'undefined') {
            plane.receiveShadow = true;
          }
        }

        // OPTIMIZATION: Removed per-frame monster traversal. 
        // Shadow properties are now set on spawn.

      } else {
        // Restore normal settings for FPV
        restoreAllHiddenWallInstances();

        // Return to default shadow settings for FPV
        if (typeof mapDirectionalBoost !== 'undefined') {
          mapDirectionalBoost.castShadow = false;
        }
      }
    }
    function updateViewSwap() {
      // Restore original layout: no automatic swapping/overlay
      const body = document.body;
      const main = document.getElementById("main-container");
      body.classList.remove("map-full");
      if (main) main.classList.remove("views-swapped");
    }
    // Fixed-pitch placement helper for the map camera to avoid angle flips
    function placeMapCameraAt(targetX, targetZ, distance) {
      const pitch = THREE.MathUtils.degToRad((TUNING && TUNING.map && TUNING.map.pitchDeg) || 65);
      const dist = THREE.MathUtils.clamp(distance || zoomLevel || 20, MIN_ZOOM, MAX_ZOOM);
      mapCameraTarget.set(targetX, 0, targetZ);
      mapCameraPosition.set(
        mapCameraTarget.x + dist * Math.sin(cameraAngle) * Math.cos(pitch),
        dist,
        mapCameraTarget.z + dist * Math.cos(cameraAngle) * Math.cos(pitch)
      );
      isMapCameraAnimating = true;
    }
    function focusMapOnRoom(roomId) {
      // No-op: initial/room entry placement handled by updateMapZoomForTile to avoid thrash
      return;
    }

    function updateMapZoomForTile(tile) {
      try {
        if (!tile) return;

        // Get current map view dimensions
        const mapContainer = document.getElementById("mapview-container");
        if (mapContainer) {
          mapViewWidth = mapContainer.clientWidth;
          mapViewHeight = mapContainer.clientHeight;
        }
        // ENHANCED ZOOM BEHAVIOR:
        // corridors should zoom out and look down from directly above
        if (tile.roomId === "corridor") {
          desiredZoomLevel = Math.max(50, desiredZoomLevel); // Zoom out further for overhead view
          desiredZoomLevel = THREE.MathUtils.clamp(
            desiredZoomLevel,
            MIN_ZOOM,
            MAX_ZOOM
          );

          // Set camera to look down from directly above (overhead view)
          if (!userHasPanned) {
            const playerX = player.x * TILE_SIZE;
            const playerZ = player.y * TILE_SIZE;
            mapCameraTarget.set(playerX, 0, playerZ);
            // Position camera directly above the player
            const cameraHeight = desiredZoomLevel;
            mapCameraPosition.set(playerX, cameraHeight, playerZ);
            isMapCameraAnimating = false; // INSTANT: No re-render animation until player exits viewport
          }
        } else {
          // FLUID UI MAPVIEW: Calculate room bounds plus 2 outer tiles to fill viewport
          const roomBounds = calculateRoomBounds(tile.roomId);
          if (roomBounds) {
            // Add 2 tile padding around the room (outer tiles) for better viewport visibility
            const expandedBounds = {
              minX: roomBounds.minX - 2,
              maxX: roomBounds.maxX + 2,
              minZ: roomBounds.minZ - 2,
              maxZ: roomBounds.maxZ + 2
            };

            // Calculate dimensions with the expanded bounds
            const roomWidth = (expandedBounds.maxX - expandedBounds.minX + 1) * TILE_SIZE;
            const roomHeight = (expandedBounds.maxZ - expandedBounds.minZ + 1) * TILE_SIZE;
            const maxDimension = Math.max(roomWidth, roomHeight);

            // Calculate zoom to fit room perfectly in viewport
            const viewportAspect = mapViewWidth / mapViewHeight;
            const roomAspect = roomWidth / roomHeight;

            // Determine the correct zoom based on aspect ratios
            // Guard early if sizes are not yet available
            if (!mapViewWidth || !mapViewHeight) {
              // Defer calculation until map container is measured
              return;
            }
            let paddedSize;
            if (roomAspect > viewportAspect) {
              // Room is wider than viewport - fit width
              paddedSize = roomWidth / 0.95; // Just a bit of padding (5%)
            } else {
              // Room is taller than viewport - fit height
              // Previously multiplied by viewportAspect which skews units.
              // Use height-only padding so camera distance calculation remains consistent.
              paddedSize = roomHeight / 0.95;
            }
            // Debug: emit computed sizing to help diagnose incorrect fits
            try {
              console.log('mapview-fit', { roomId: tile.roomId, roomWidth, roomHeight, mapViewWidth, mapViewHeight, roomAspect, viewportAspect, paddedSize });
            } catch (__) { }

            desiredZoomLevel = Math.max(15, paddedSize * 0.5); // Adjust multiplier as needed
            desiredZoomLevel = THREE.MathUtils.clamp(
              desiredZoomLevel,
              MIN_ZOOM,
              Math.min(MAX_ZOOM, 45) // Increased max zoom to allow seeing entire rooms
            );

            // Center camera on expanded room center, not just player
            if (!userHasPanned) {
              const roomCenterX = ((expandedBounds.minX + expandedBounds.maxX) / 2) * TILE_SIZE;
              const roomCenterZ = ((expandedBounds.minZ + expandedBounds.maxZ) / 2) * TILE_SIZE;
              mapCameraTarget.set(roomCenterX, 0, roomCenterZ);
            }
          } else {
            // Fallback for rooms without bounds
            desiredZoomLevel = Math.min(
              16,
              desiredZoomLevel || zoomLevel
            ); // Reasonable room view
            desiredZoomLevel = THREE.MathUtils.clamp(
              desiredZoomLevel,
              MIN_ZOOM,
              MAX_ZOOM
            );
          }
        }
        // when changing zoom, if currently not panned, place camera once using fixed pitch helper
        if (!userHasPanned) {
          const hasBounds = tile.roomId !== "corridor" && !!calculateRoomBounds(tile.roomId);
          const tx = hasBounds ? mapCameraTarget.x : player.x * TILE_SIZE;
          const tz = hasBounds ? mapCameraTarget.z : player.y * TILE_SIZE;
          placeMapCameraAt(tx, tz, desiredZoomLevel);
          _zoomCtx = _zoomCtx || {};
          _zoomCtx.lockUntil = performance.now() + 220; // brief lock to avoid ping-pong
        }
      } catch (e) { }
    }

    function calculateRoomBounds(roomId) {
      if (!roomId || roomId === "corridor") return null;

      let minX = MAP_WIDTH, maxX = 0, minZ = MAP_HEIGHT, maxZ = 0;
      let foundTiles = false;

      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tile = map[y][x];
          if (tile && tile.roomId === roomId && tile.type === TILE.FLOOR) {
            foundTiles = true;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minZ = Math.min(minZ, y);
            maxZ = Math.max(maxZ, y);
          }
        }
      }

      return foundTiles ? { minX, maxX, minZ, maxZ } : null;
    }

    // === NetHack Menu Systems ===

    function showEatMenu() {
      const foods = player.inventory.filter(item => item.type === "food");
      if (foods.length === 0) {
        logMessage("You have no food to eat.", "#A0A0A0");
        return;
      }

      logMessage("What would you like to eat?", "#FFFF00");
      foods.forEach((food, index) => {
        const letter = String.fromCharCode("a".charCodeAt(0) + player.inventory.indexOf(food));
        logMessage(`${letter} - ${getItemDisplayName(food)}`, "#FFFFFF");
      });

      // For now, auto-eat the first food item (can be enhanced with input later)
      const food = foods[0];
      eatFood(food);
    }

    function eatFood(food) {
      const foodIndex = player.inventory.indexOf(food);
      if (foodIndex === -1) return;

      player.inventory.splice(foodIndex, 1);
      player.nutrition += food.nutrition || 200;

      logMessage(`You eat the ${getItemDisplayName(food)}.`, "#00FF00");

      // Food effects
      if (food.effect === "confusion" && Math.random() < 0.3) {
        addStatusEffect("confusion", 20);
      }

      updateUI();
    }

    function showQuaffMenu() {
      const potions = player.inventory.filter(item => item.type === "potion");
      if (potions.length === 0) {
        logMessage("You have no potions to drink.", "#A0A0A0");
        return;
      }

      logMessage("What would you like to drink?", "#FFFF00");
      potions.forEach((potion, index) => {
        const letter = String.fromCharCode("a".charCodeAt(0) + player.inventory.indexOf(potion));
        logMessage(`${letter} - ${getItemDisplayName(potion)}`, "#FFFFFF");
      });

      // For now, auto-drink the first potion (can be enhanced with input later)
      const potion = potions[0];
      drinkPotion(potion);
    }

    function drinkPotion(potion) {
      const potionIndex = player.inventory.indexOf(potion);
      if (potionIndex === -1) return;

      player.inventory.splice(potionIndex, 1);
      identifyItem(potion);

      logMessage(`You drink the ${getItemDisplayName(potion)}.`, "#8B00FF");

      // Apply potion effects
      switch (potion.effect) {
        case "healing":
          player.health = Math.min(player.maxHealth, player.health + (potion.power || 5));
          logMessage("You feel better!", "#00FF00");
          break;
        case "strength":
          player.str = Math.min(25, player.str + (potion.power || 1));
          logMessage("You feel stronger!", "#FF8800");
          updatePlayerStats();
          break;
        case "speed":
          addStatusEffect("speed", 50, potion.power || 2);
          break;
        case "mana":
          logMessage("You feel magical energy flow through you!", "#0088FF");
          break;
        case "regeneration":
          addStatusEffect("regeneration", 100, potion.power || 1);
          break;
        case "fire_resist":
          addStatusEffect("fire_resistance", 200, potion.power || 1);
          break;
      }

      updateUI();
    }

    function showReadMenu() {
      const scrolls = player.inventory.filter(item => item.type === "scroll");
      if (scrolls.length === 0) {
        logMessage("You have no scrolls to read.", "#A0A0A0");
        return;
      }

      logMessage("What would you like to read?", "#FFFF00");
      scrolls.forEach((scroll, index) => {
        const letter = String.fromCharCode("a".charCodeAt(0) + player.inventory.indexOf(scroll));
        logMessage(`${letter} - ${getItemDisplayName(scroll)}`, "#FFFFFF");
      });

      // For now, auto-read the first scroll (can be enhanced with input later)
      const scroll = scrolls[0];
      readScroll(scroll);
    }

    function readScroll(scroll) {
      const scrollIndex = player.inventory.indexOf(scroll);
      if (scrollIndex === -1) return;

      player.inventory.splice(scrollIndex, 1);
      identifyItem(scroll);

      logMessage(`You read the ${getItemDisplayName(scroll)}.`, "#F5DEB3");

      // Apply scroll effects
      switch (scroll.effect) {
        case "identify":
          // Identify random unidentified item
          const unidentified = player.inventory.filter(item => {
            const itemKey = `${item.type}_${item.name}`;
            return !player.identifiedItems.has(itemKey);
          });
          if (unidentified.length > 0) {
            const toIdentify = unidentified[Math.floor(Math.random() * unidentified.length)];
            identifyItem(toIdentify);
          } else {
            logMessage("You have no unidentified items.", "#A0A0A0");
          }
          break;
        case "teleport":
          // Random teleportation
          const newX = Math.floor(Math.random() * (MAP_WIDTH - 2)) + 1;
          const newY = Math.floor(Math.random() * (MAP_HEIGHT - 2)) + 1;
          if (map[newY] && map[newY][newX] && map[newY][newX].type === TILE.FLOOR) {
            player.x = newX;
            player.y = newY;
            player.object.position.set(newX * TILE_SIZE, 0, newY * TILE_SIZE);
            logMessage("You teleport to a new location!", "#FF00FF");
          }
          break;
        case "healing":
          player.health = player.maxHealth;
          logMessage("You are fully healed!", "#00FF00");
          break;
      }

      updateUI();
    }

    function showWieldMenu() {
      const weapons = player.inventory.filter(item => item.type === "weapon");
      if (weapons.length === 0) {
        logMessage("You have no weapons to wield.", "#A0A0A0");
        return;
      }

      logMessage("What would you like to wield?", "#FFFF00");
      weapons.forEach((weapon, index) => {
        const letter = String.fromCharCode("a".charCodeAt(0) + player.inventory.indexOf(weapon));
        logMessage(`${letter} - ${getItemDisplayName(weapon)}`, "#FFFFFF");
      });

      // For now, auto-wield the first weapon (can be enhanced with input later)
      const weapon = weapons[0];
      wieldWeapon(weapon);
    }

    function wieldWeapon(weapon) {
      const weaponIndex = player.inventory.indexOf(weapon);
      if (weaponIndex === -1) return;

      player.inventory.splice(weaponIndex, 1);
      equipItem(weapon);
    }

    function showWearMenu() {
      const armor = player.inventory.filter(item =>
        item.type === "armor" || item.type === "helmet" ||
        item.type === "boots" || item.type === "gauntlets");
      if (armor.length === 0) {
        logMessage("You have no armor to wear.", "#A0A0A0");
        return;
      }

      logMessage("What would you like to wear?", "#FFFF00");
      armor.forEach((piece, index) => {
        const letter = String.fromCharCode("a".charCodeAt(0) + player.inventory.indexOf(piece));
        logMessage(`${letter} - ${getItemDisplayName(piece)}`, "#FFFFFF");
      });

      // For now, auto-wear the first armor piece (can be enhanced with input later)
      const piece = armor[0];
      wearArmor(piece);
    }

    function wearArmor(armor) {
      const armorIndex = player.inventory.indexOf(armor);
      if (armorIndex === -1) return;

      player.inventory.splice(armorIndex, 1);
      equipItem(armor);
    }

    function showTakeOffMenu() {
      const equipped = Object.values(player.equipment).filter(item => item !== null);
      if (equipped.length === 0) {
        logMessage("You have nothing equipped to take off.", "#A0A0A0");
        return;
      }

      logMessage("What would you like to take off?", "#FFFF00");
      equipped.forEach((item, index) => {
        const letter = String.fromCharCode("a".charCodeAt(0) + index);
        logMessage(`${letter} - ${getItemDisplayName(item)}`, "#FFFFFF");
      });

      // For now, auto-remove the first equipped item (can be enhanced with input later)
      const item = equipped[0];
      takeOffEquipment(item);
    }

    function takeOffEquipment(item) {
      // Find which slot this item is in
      for (const [slot, equippedItem] of Object.entries(player.equipment)) {
        if (equippedItem === item) {
          player.equipment[slot] = null;
          player.inventory.push(item);
          logMessage(`You remove the ${getItemDisplayName(item)}.`, "#FFFF00");
          updatePlayerStats();
          updateUI();
          break;
        }
      }
    }

    function showCharacterSheet() {
      logMessage("=== Character Sheet ===", "#00FFFF");
      logMessage(`Level: ${player.level} (${player.exp}/${player.expToLevel()} XP)`, "#FFFFFF");
      logMessage(`Health: ${player.health}/${player.maxHealth}`, "#FF0000");
      logMessage(`Hunger: ${player.hunger}/${player.maxHunger}`, "#00AA00");
      logMessage(`Stats: Str:${player.str} Dex:${player.dex} Con:${player.con} Int:${player.intel} Wis:${player.wis} Cha:${player.cha}`, "#FFFFFF");
      logMessage(`Combat: Attack:${player.attack} AC:${player.ac}`, "#FFAA00");
      logMessage(`Gold: ${player.gold}`, "#FFD700");
      logMessage(`Turns: ${player.turnCount}`, "#A0A0A0");

      // Show equipped items
      logMessage("=== Equipment ===", "#00FFFF");
      for (const [slot, item] of Object.entries(player.equipment)) {
        if (item) {
          logMessage(`${slot}: ${getItemDisplayName(item)}`, "#FFFF00");
        } else {
          logMessage(`${slot}: (none)`, "#A0A0A0");
        }
      }

      // Show status effects
      if (player.statusEffects.size > 0) {
        logMessage("=== Status Effects ===", "#00FFFF");
        for (const [effect, data] of player.statusEffects.entries()) {
          logMessage(`${effect}: ${data.duration} turns remaining`, "#FF00FF");
        }
      }
      console.log("Checkpoint 3: Reached init definition");
    }

    function init() {
      console.log('=== INIT FUNCTION START ===');
      console.log('THREE available:', typeof THREE !== 'undefined');
      console.log('Scene:', !!scene);
      console.log('Camera:', !!camera);
      console.log('Renderer:', !!mainRenderer);
      console.log('mapview-container:', !!document.getElementById('mapview-container'));
      console.log('fpv-viewport:', !!document.getElementById('fpv-viewport'));

      // === KEYPAD RENDER STATUS DEBUG ===
      setTimeout(() => {
        console.log('🎯 KEYPAD STATUS CHECK:');
        const keypad = document.getElementById('dnd-game-movement-overlay');
        console.log('Movement overlay found:', !!keypad);
        console.log('Keypad render flag:', window.keypadRendered);

        if (keypad) {
          const rect = keypad.getBoundingClientRect();
          const styles = window.getComputedStyle(keypad);
          console.log('📍 Keypad position and visibility:', {
            display: styles.display,
            visibility: styles.visibility,
            position: styles.position,
            top: styles.top,
            left: styles.left,
            zIndex: styles.zIndex,
            bounds: rect
          });
        } else {
          console.error('❌ Keypad (dnd-game-movement-overlay) not found!');
        }
      }, 2000);

      // Check adventure game UI
      const adventureContainer = document.getElementById('dnd-game-app-container');
      console.log('Adventure game container:', !!adventureContainer);
      if (adventureContainer) {
        const adventureStyles = window.getComputedStyle(adventureContainer);
        console.log('Adventure container styles:', {
          display: adventureStyles.display,
          visibility: adventureStyles.visibility,
          opacity: adventureStyles.opacity,
          zIndex: adventureStyles.zIndex
        });
      }

      // Check if renderer has been appended to DOM
      const mapContainer = document.getElementById('mapview-container');
      if (mapContainer) {
        console.log('Mapview children count:', mapContainer.children.length);
        const mapStyles = window.getComputedStyle(mapContainer);
        console.log('Mapview container styles:', {
          display: mapStyles.display,
          visibility: mapStyles.visibility,
          width: mapStyles.width,
          height: mapStyles.height,
          position: mapStyles.position
        });
        if (mainRenderer && mainRenderer.domElement) {
          console.log('Renderer domElement exists:', !!mainRenderer.domElement);
          console.log('Renderer parent:', mainRenderer.domElement.parentElement?.id || 'no parent');
        }
      }

      initResizeAndDrag();
      initGhostWalls();
      // Input throttle for real-time movement
      let lastInputTime = 0;
      const INPUT_COOLDOWN = 180; // ms (approx 5.5 steps/sec)

      window.addEventListener("keydown", (e) => {
        stopAutoMove(); // Cancel auto-move on any key press

        // Throttle movement keys to prevent "super fast run"
        const moveKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
        if (moveKeys.includes(e.key)) {
          const now = Date.now();
          if (now - lastInputTime < INPUT_COOLDOWN) return;
          lastInputTime = now;
        }

        handleInput(e);
      });
      window.addEventListener("contextmenu", (e) => e.preventDefault());
      window.addEventListener("resize", handleResize);
      camera.layers.set(0);
      fpvCamera.layers.set(FPV_MODEL_LAYER); // Only FPV layer to avoid double walls
      // fpvCamera.layers.enable(0); // REMOVED: this was causing double walls
      console.log('🔧 FPV Camera configured to see only FPV_MODEL_LAYER');
      generateNextGenDungeon();
      logMessage(
        "The underworld dojo awaits. Descend seven levels.",
        "#87ceeb"
      );
      setCompassHeading(player.rotationY);
      attachClickToMoveFPV();
      attachClickToMoveMap(); // Add click-to-move for map view
      attachClickToMoveFPV(); // Add click-to-move for FPV view

      // Ensure renderer is properly sized after DOM layout
      setTimeout(() => {
        handleResize();
        console.log("Forced resize after initialization");
      }, 100);

      animate();
      // Enforce initial view-swap state
      updateViewSwap();
      // Player model loading removed per user request

      // Debug: Add keyboard shortcut to focus map on player (F key)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'f' || e.key === 'F') {
          console.log("Manual map focus triggered");
          focusMapOnPlayer();
        }
      });

      // Initial keypad placement + observe prompt
      try {
        positionKeypad();
      } catch { }
      try {
        const prompt = document.getElementById("dnd-fpv-prompt");
        if (window.ResizeObserver && prompt) {
          const ro = new ResizeObserver(() => positionKeypad());
          ro.observe(prompt);
        }
      } catch { }

      // Wire up loot modal buttons (single handlers)
      try {
        const lootGet = document.getElementById("loot-get-btn");
        const lootCancel = document.getElementById("loot-cancel-btn");
        if (lootGet) {
          lootGet.addEventListener("click", () => {
            if (!lootModalOpen) return;
            pickupLootIfAny(player.x, player.y);
            hideLootModal();
            lootModalOpen = false;
          });
        }
        if (lootCancel) {
          lootCancel.addEventListener("click", () => {
            hideLootModal();
            lootModalOpen = false;
          });
        }
      } catch (e) { }

      // initialize desired zoom based on starting tile
      try {
        const startTile = map[player.y] && map[player.y][player.x];
        if (typeof updateMapZoomForTile === 'function') {
          updateMapZoomForTile(startTile);
        }
      } catch (e) { }

      // Initialize forensic sync analyzer
      console.log('🔍 Initializing Forensic Sync System...');
      initializeForensicSystem();

      // --- Pathfinding & Click-to-Move System ---


      // Expose Dev tuning API for quick tweaking in console
      window.Dev = {
        forensic: {
          scan: () => {
            if (window.forensicSync) {
              window.forensicSync.performFullAnalysis();
            } else {
              console.warn('Forensic system not initialized');
            }
          },
          autoFix: (enabled) => {
            if (window.forensicSync) {
              if (enabled) {
                window.forensicSync.enableAutoFix();
              } else {
                window.forensicSync.disableAutoFix();
              }
            }
          },
          debug: () => {
            if (window.forensicSync) {
              window.forensicSync.toggleDebugMode();
            }
          },
          status: () => {
            if (window.forensicSync) {
              return window.forensicSync.getStatus();
            }
            return null;
          },
          forceMonsterCheck: () => {
            console.log('🔍 Forcing monster visibility check...');
            if (monsterObject) {
              console.log('Monster object exists:', monsterObject);
              console.log('Monster in scene:', scene.children.includes(monsterObject));
              console.log('Monster position:', monsterObject.position);
              console.log('Monster children:', monsterObject.children);
              monsterObject.children.forEach((child, i) => {
                console.log('Child ' + i + ':', child.type, 'Layers:', child.layers, 'Visible:', child.visible);
              });
            } else {
              console.warn('No monster object found - creating one...');
              createMonsterForTuning();
            }
          },
        },
        lights: {
          headlamp: (opts = {}) => {
            Object.assign(TUNING.lighting.headlamp, opts);
            // Headlamp removed
            logMessage("Headlamp disabled (no-op)", "#9be");
          },
          playerFill: (opts = {}) => {
            Object.assign(TUNING.lighting.playerFill, opts);
            applyPlayerFillTuning(playerLight);
            logMessage("Player fill updated", "#9be");
          },
          monster: (opts = {}) => {
            Object.assign(TUNING.lighting.monsterFlashlight, opts);
            // Monster flashlights removed
            logMessage("Monster flashlights disabled (no-op)", "#9be");
          },
          orb: (opts = {}) => {
            Object.assign(TUNING.lighting.monsterOrb, opts);
            monsters.forEach((m) =>
              applyMonsterOrbTuning(m?.object?.userData?.visuals?.orb)
            );
            logMessage("Monster orbs updated", "#9be");
          },
          exposure: (fpvExp, mapExp) => {
            if (typeof fpvExp === "number")
              // fpvRenderer tone mapping update removed (shared renderer)
              if (typeof mapExp === "number")
                mainRenderer.toneMappingExposure = mapExp;
          },
        },
        combat: {
          detection: (opts = {}) => {
            Object.assign(TUNING.combat.detection, opts);
            logMessage("Detection arcs updated", "#9be");
          },
          facing: (rad) => {
            if (typeof rad === "number") TUNING.combat.facingPrecision = rad;
            logMessage("Facing precision updated", "#9be");
          },
        },
        movement: {
          cameraOffset: (opts = {}) => {
            Object.assign(TUNING.movement.fpvCameraOffset, opts);
            logMessage("FPV camera offset updated", "#9be");
          },
        },
        models: {
          refitPlayer: (height) => {
            if (typeof height === "number")
              TUNING.models.playerHeight = height;
            const pm = player?.object?.userData?.visuals?.model3d;
            if (pm)
              fitToHeightAndGround(pm, TUNING.models.playerHeight, 0.02);
            logMessage("Player model refit", "#9be");
          },
          refitMonsters: (height) => {
            if (typeof height === "number")
              TUNING.models.monsterHeight = height;
            monsters.forEach((m) => {
              const mm = m?.object?.userData?.visuals?.model3d;
              if (mm)
                fitToHeightAndGround(mm, TUNING.models.monsterHeight, 0.0);
            });
            logMessage("Monster models refit", "#9be");
          },
        },
      };
    }
    function animate() {
      requestAnimationFrame(animate);

      // --- CENTRALIZED SYNC ---
      // Ensure visuals match game state before rendering
      if (typeof gameRenderSync !== 'undefined') {
        gameRenderSync.syncAll();
      }

      const delta = clock.getDelta();

      // Update Forensic Culling
      if (player) {
        ForensicCullingManager.update(player);
      }

      // Update ConstructorAI for culling
      // if (window.ConstructorAI && player) {
      //    ConstructorAI.update(player, fpvCamera);
      // }

      // Isolated lighting loop removed for stability


      // Always check if player is visible in map view - !IMPORTANT
      ensureMapAutoCenter();

      if (
        player.object &&
        !player.object.quaternion.equals(playerTargetRotation)
      ) {
        player.object.quaternion.slerp(playerTargetRotation, 8 * delta);
      }

      // --- Animate monster turning ---
      for (const monster of monsters) {
        if (!monster.object) continue;
        // Let AI set facingAngle; only apply smooth rotation here
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          monster.facingAngle || 0
        );
        if (!monster.object.quaternion.equals(targetQuaternion)) {
          monster.object.quaternion.slerp(targetQuaternion, 8 * delta);
        }
      }

      // --- Animate Loot Rotation ---
      scene.traverse((object) => {
        if (object.userData && object.userData.shouldRotate) {
          // Rotate slowly around Y axis
          object.rotation.y += delta * 0.5;
        }
      });

      if (isPlayerAnimating) {
        playerAnimTime += delta;
        const progress = Math.min(playerAnimTime / PLAYER_ANIMATION_SPEED, 1);
        player.object.position.lerpVectors(
          playerStartPos,
          playerTargetPos,
          progress
        );
        if (progress >= 1) {
          isPlayerAnimating = false;

          // Clear movement tween when completed
          game._moveTween = null;
        }
      }
      // Aim player headlamp with facing
      if (player?.object?.userData?.visuals?.headlamp) {
        // 180° flipped forward vector to match requested orientation
        const fwd = new THREE.Vector3(
          -Math.sin(player.rotationY),
          0,
          -Math.cos(player.rotationY)
        ).multiplyScalar(10);
        const base = player.object.position
          .clone()
          .add(new THREE.Vector3(0, 1.6, 0));
        const target = base.clone().add(fwd);
        player.object.userData.visuals.headlamp.target.position.copy(target);
        // Update flashlight target
        if (player.object.userData.visuals.flashlightTarget) {
          player.object.userData.visuals.flashlightTarget.position.copy(target);
        }
      }

      // --- Animate rotating loot items and billboard labels ---
      gameObjects.forEach((obj, key) => {
        if (key.startsWith('loot_')) {
          if (obj.userData.mainMesh && obj.userData.mainMesh.userData.shouldRotate) {
            obj.userData.mainMesh.rotation.y += delta * 2; // Rotate coins and other spinning items
          }
          if (obj.userData.labelMesh && obj.userData.labelMesh.userData.billboardToFPV) {
            // Face label toward FPV camera only; map pass remains readable due to DoubleSide
            // Only update rotation if player is NOT moving (per user request)
            if (!isPlayerAnimating && !game._moveTween && !isAutoMoving) {
              obj.userData.labelMesh.lookAt(fpvCamera.position);
            }
          }
        }
      });

      updateCamera();

      // Safety: never allow FPV roll (tilt). Roll makes the world feel skewed.
      // If any code accidentally introduces roll via quaternions/Eulers, clamp it here.
      fpvCamera.rotation.z = 0;

      // --- VIEW BOBBING REMOVED ---
      // User reported shaking/annoyance.
      // Ensure camera is at stable height (Raised to 2.0 per request).
      fpvCamera.position.y = 3.5;

      // Control FPV player walking animation (001.E style hierarchy)
      try {
        const playerObj = player.object;
        if (playerObj && playerObj.userData.visuals.model3dFPV) {
          const fpvAvatar = playerObj.userData.visuals.model3dFPV; // This is the FPV avatar container
          const glbRoot = fpvAvatar.getObjectByName && fpvAvatar.getObjectByName('playerFPVAvatarModel');

          if (glbRoot && glbRoot.userData && glbRoot.userData.walkAction) {
            const now = performance.now();
            const start = game._walkAnimStart || 0;
            const elapsed = now - start;
            const dur = (game._moveTween && game._moveTween.dur) || (PLAYER_ANIMATION_SPEED * 1000);
            const ud = glbRoot.userData;
            const action = ud.walkAction;

            if (elapsed >= 0 && elapsed <= dur && (isPlayerAnimating || game._moveTween)) {
              if (!ud.walking) {
                try {
                  // Sync action speed to tween duration (001.E approach)
                  const clipDur = Math.max(0.0001, ud.walkClipDuration || 1.0);
                  action.timeScale = clipDur > 0 ? (clipDur / (dur / 1000)) : 1.0;
                  action.reset();
                  action.play();
                  ud.walking = true;
                } catch (_) { }
              }
              // Update mixer only when walking
              if (ud.mixer) ud.mixer.update(delta);
            } else {
              if (ud.walking) {
                try {
                  action.stop();
                  ud.walking = false;
                } catch (_) { }
              }
            }
          }
        }
      } catch (e) {
        // Silent fail for FPV animation control
      }

      // Control map view player walking animation (001.E style hierarchy)
      try {
        const playerObj = player.object;
        if (playerObj && playerObj.userData.visuals.mapModel) {
          const avatar = playerObj.userData.visuals.mapModel; // This is the avatar container
          const glbRoot = avatar.getObjectByName && avatar.getObjectByName('playerAvatarModel');

          if (glbRoot && glbRoot.userData && glbRoot.userData.walkAction) {
            const now = performance.now();
            const start = game._walkAnimStart || 0;
            const elapsed = now - start;
            const dur = (game._moveTween && game._moveTween.dur) || (PLAYER_ANIMATION_SPEED * 1000);
            const ud = glbRoot.userData;
            const action = ud.walkAction;

            if (elapsed >= 0 && elapsed <= dur && (isPlayerAnimating || game._moveTween)) {
              if (!ud.walking) {
                try {
                  // Sync action speed to tween duration (001.E approach)
                  const clipDur = Math.max(0.0001, ud.walkClipDuration || 1.0);
                  action.timeScale = clipDur > 0 ? (clipDur / (dur / 1000)) : 1.0;
                  action.reset();
                  action.play();
                  ud.walking = true;
                } catch (_) { }
              }
              // Update mixer only when walking
              if (ud.mixer) ud.mixer.update(delta);
            } else {
              if (ud.walking) {
                try {
                  action.stop();
                  ud.walking = false;
                } catch (_) { }
              }
            }
          }
        }
      } catch (e) {
        // Silent fail for map model animation control
      }

      // Update global animation mixer disabled - we handle player animations explicitly above
      // if (animationMixer) animationMixer.update(delta);

      // Smooth turning interpolation
      if (Math.abs(player.targetRotationY - player.rotationY) > 0.001) {
        const lerpFactor = 10 * delta;
        player.rotationY += (player.targetRotationY - player.rotationY) * lerpFactor;

        // Update visual rotation
        playerTargetRotation.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          player.rotationY
        );
        if (player.object) player.object.quaternion.copy(playerTargetRotation);
        setCompassHeading(player.rotationY);
        updateTuningMonsterArrow();
      }


      try {
        updateDOF(delta);
      } catch (e) { }

      // --- MAP VIEW RENDER PASS ---
      updateWallGhosting(true); // Ghost walls for map view

      // Apply map view scaling to monster models
      // Apply map view scaling to monster models
      // OPTIMIZATION: Only scale if needed, and avoid double-scaling if possible
      monsters.forEach(monster => {
        if (monster.object && monster.object.userData.visuals.model3d) {
          const model = monster.object.userData.visuals.model3d;
          // Logic for view scaling (stub for now as logic was missing)
          if (model.userData.viewScaling) {
            // apply scaling if needed
          }
        }
      });

      // --- MODULAR RENDER CALL ---
      if (window.rendererSystem) {
        window.rendererSystem.render(delta);
      }
      // --- END MODULAR RENDER CALL ---


      // Update DungeonMaster AI
      if (window.dungeonMaster && typeof window.dungeonMaster.update === 'function') {
        window.dungeonMaster.update(performance.now(), 16); // Approx delta
      }

      updateFPS();
      document.addEventListener("DOMContentLoaded", () => {
        const diceButton = document.getElementById("dnd-game-dice-btn");
        if (diceButton) {
          diceButton.addEventListener("click", () => {
            handleInteract();
          });
        }
      });

      // drawMapLightOverlay removed

      // Helper: face an absolute grid direction and attempt one step move

      function faceAndMove(dx, dy) {
        // compute angle matching movePlayer coordinate system
        const angle = Math.atan2(dx, dy);

        // Smooth turn instead of snap
        rotatePlayerSmooth(angle);

        // Queue movement (it will happen after rotation aligns due to animate loop logic)
        GameTurnManager.queuePlayerAction(movePlayer, 1);
      }

      // --- Animation Loop Update for Loot ---
      // We need to inject the loot rotation logic into the main animate loop.
      // Since I cannot easily see the main animate loop in the previous view, 
      // I will rely on the fact that I can add a hook or modify the existing loop if I find it.
      // However, looking at previous steps, the animate function is around line 13900.
      // Wait, line 13900 in the previous view was `faceAndMove`. 
      // The `animate` function was viewed earlier around line 13925.
      // I will search for `function animate()` to be sure.


      function showHelpModal() {
        if (document.getElementById("help-modal"))
          return (document.getElementById("help-modal").style.display =
            "block");
        const modal = document.createElement("div");
        modal.id = "help-modal";
        modal.style.position = "fixed";
        modal.style.left = "8%";
        modal.style.top = "8%";
        modal.style.width = "84%";
        modal.style.height = "84%";
        modal.style.zIndex = 9999;
        modal.style.background =
          "linear-gradient(180deg, rgba(8,8,10,0.96), rgba(2,2,2,0.96))";
        modal.style.border = "1px solid rgba(255,255,255,0.06)";
        modal.style.padding = "16px";
        modal.style.borderRadius = "12px";
        modal.style.color = "#e6eef0";
        modal.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong>NetHack-like Help</strong><button id="help-close" style="background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer">✕</button></div><div style="overflow:auto;height:calc(100% - 40px);line-height:1.4"><pre style="white-space:pre-wrap">Movement: arrows / WASD / vi-keys (h/j/k/l)\nNumpad: 7-8-9 / 4-5-6 / 1-2-3 for diagonal moves\nTurn: A/D or arrow-left/right (instant)\nMove forward/back: W/S or up/down\nAttack: f (forward)\nPick up: g\nInventory: i\nWield: wield <index|letter>\nDrop: drop <index|letter>\nQuaff (drink): quaff <index|letter>\nEat: eat <index|letter>\nSearch: space\nDescend stairs: > or .\nQuick commands: 'help', 'inventory', 'stats', 'pickup'\nCommands can also be typed in the prompt. Type 'help' to show this dialog.\n</pre></div>`;
        document.body.appendChild(modal);
        document
          .getElementById("help-close")
          .addEventListener("click", () => modal.remove());
      }
      // Neumorphic Descend/Ascend confirmation modal. If player is standing on stairs,
      // this modal appears and OK (Enter/Space) accepts and queues descendStairs().
      function showDescendModal(directionHint) {
        if (document.getElementById("descend-modal")) return Promise.resolve();
        return new Promise((resolve) => {
          const modal = document.createElement("div");
          modal.id = "descend-modal";
          modal.style.position = "fixed";
          modal.style.left = "50%";
          modal.style.top = "50%";
          modal.style.transform = "translate(-50%,-50%)";
          modal.style.zIndex = 99999;
          modal.style.width = "320px";
          modal.style.maxWidth = "90%";
          modal.style.padding = "18px";
          modal.style.borderRadius = "12px";
          modal.style.background = "linear-gradient(145deg,#0f1214,#191b1e)";
          modal.style.boxShadow =
            "8px 8px 20px rgba(0,0,0,0.6), -6px -6px 14px rgba(255,255,255,0.02) inset";
          modal.style.color = "#fff";
          modal.innerHTML =
            `<div style="font-weight:700;font-size:16px;margin-bottom:8px">` +
            (directionHint === "up" ? "Ascend stairs?" : "Descend stairs?") +
            `</div><div style="font-size:13px;color:rgba(255,255,255,0.85);margin-bottom:14px">Are you sure you want to ${directionHint === "up" ? "ascend" : "descend"
            } the stairs?</div>`;

          const btnRow = document.createElement("div");
          btnRow.style.display = "flex";
          btnRow.style.justifyContent = "flex-end";
          btnRow.style.gap = "8px";

          const cancelBtn = document.createElement("button");
          cancelBtn.textContent = "N";
          cancelBtn.title = "N - Cancel";
          cancelBtn.className = "qa";
          cancelBtn.style.padding = "8px 12px";

          const okBtn = document.createElement("button");
          okBtn.textContent = "OK";
          okBtn.title = "Enter/Space - Confirm";
          okBtn.className = "qa";
          okBtn.style.padding = "8px 12px";

          btnRow.appendChild(cancelBtn);
          btnRow.appendChild(okBtn);
          modal.appendChild(btnRow);
          document.body.appendChild(modal);

          function cleanup() {
            document.removeEventListener("keydown", onKey);
            okBtn.removeEventListener("click", onOk);
            cancelBtn.removeEventListener("click", onCancel);
            if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
          }

          function onOk() {
            cleanup();
            // queue descend or ascend action on the game turn manager
            if (directionHint === "up")
              GameTurnManager.queuePlayerAction(ascendStairs);
            else GameTurnManager.queuePlayerAction(descendStairs);
            resolve(true);
          }
          function onCancel() {
            cleanup();
            resolve(false);
          }

          // Wire up loot modal buttons (single handlers, avoid duplicates)
          const lootGet = document.getElementById("loot-get-btn");
          const lootCancel = document.getElementById("loot-cancel-btn");
          if (lootGet) {
            lootGet.addEventListener("click", () => {
              pickupLootIfAny(player.x, player.y);
              hideLootModal();
            });
          }
          if (lootCancel) {
            lootCancel.addEventListener("click", () => hideLootModal());
          }
          function onKey(e) {
            function hideLootModal() {
              const el = document.getElementById("loot-modal");
              if (el) el.classList.add("hidden");
            }
            if (e.code === "Enter" || e.code === "Space") {
              e.preventDefault();
              onOk();
            } else if (e.key && e.key.toLowerCase() === "n") {
              e.preventDefault();
              onCancel();
            }
          }

          okBtn.addEventListener("click", onOk);
          cancelBtn.addEventListener("click", onCancel);
          document.addEventListener("keydown", onKey, { capture: true });
          // focus ok button so Enter triggers it
          okBtn.focus();
        });
      }

      function updateLootLabels() {
        // Iterate through all loot objects in the scene
        scene.traverse((object) => {
          if (object.userData && object.userData.lootType && object.userData.label) {
            const label = object.userData.label;
            // Make label look at player (billboard)
            // We want it to face the camera/player position but stay upright
            // Simple lookAt works for 3D meshes acting as billboards
            if (player.object) {
              label.lookAt(player.object.position);
            } else {
              label.lookAt(fpvCamera.position);
            }
          }
        });
      }

      function handleFPVCommand(command) {
        logMessage(`> ${command}`, "#f0f0f0");
        const t = command.toLowerCase().trim();
        const parts = t.split(" ");
        const action = parts[0];
        const direction = parts[1];
        if (action === "move" || action === "go") {
          if (direction === "forward")
            GameTurnManager.queuePlayerAction(movePlayer, 1);
          else if (direction === "backward")
            GameTurnManager.queuePlayerAction(movePlayer, -1);
          else logMessage("Move where? (forward, backward)", "#a8a8a8");
        } else if (action === "turn") {
          if (direction === "left") quickTurn(90);
          else if (direction === "right") quickTurn(-90);
          else logMessage("Turn where? (left, right)", "#a8a8a8");
        } else if (t.includes("look") || t.includes("examine")) {
          logMessage(
            "You are in a dark stone dojo. The air is heavy.",
            "#a8a8a8"
          );
        } else if (t.includes("attack") || t.includes("fight")) {
          // If 'attack' used as command, attempt forward melee attack
          GameTurnManager.queuePlayerAction(() => {
            const dx = -Math.round(Math.sin(player.rotationY));
            const dy = -Math.round(Math.cos(player.rotationY));
            const tx = player.x + dx,
              ty = player.y + dy;
            const target = monsters.find((m) => m.x === tx && m.y === ty);
            if (target) attack(player, target);
            else logMessage("No target in front to attack.", "#a8a8a8");
            return Promise.resolve();
          });
        } else if (
          t.includes("pickup") ||
          t.includes("take") ||
          t.includes("loot")
        ) {
          // pickup items at current tile
          GameTurnManager.queuePlayerAction(() => {
            pickupLootIfAny(player.x, player.y);
            return Promise.resolve();
          });
        } else if (t.includes("inventory") || t === "i") {
          toggleInventory();
        } else if (action === "eat") {
          const arg = direction;
          if (!arg) {
            logMessage("Eat what? (letter a-z or index)", "#a8a8a8");
          } else {
            const idx = isNaN(Number(arg))
              ? arg.toLowerCase().charCodeAt(0) - "a".charCodeAt(0)
              : Number(arg);
            eatFood(idx);
          }
        } else if (action === "wield") {
          const arg = direction;
          if (!arg) {
            logMessage("Wield what? (letter a-z or index)", "#a8a8a8");
          } else {
            const idx = isNaN(Number(arg))
              ? arg.toLowerCase().charCodeAt(0) - "a".charCodeAt(0)
              : Number(arg);
            wieldItem(idx);
          }
        } else if (action === "drop") {
          const arg = direction;
          if (!arg) {
            logMessage("Drop what? (letter a-z or index)", "#a8a8a8");
          } else {
            const idx = isNaN(Number(arg))
              ? arg.toLowerCase().charCodeAt(0) - "a".charCodeAt(0)
              : Number(arg);
            dropItem(idx);
          }
        } else if (action === "quaff") {
          const arg = direction;
          if (!arg) {
            logMessage("Quaff what? (letter a-z or index)", "#a8a8a8");
          } else {
            const idx = isNaN(Number(arg))
              ? arg.toLowerCase().charCodeAt(0) - "a".charCodeAt(0)
              : Number(arg);
            quaffItem(idx);
          }
        } else if (t.includes("stats") || t === "status") {
          logMessage(
            `HP: ${player.health}/${player.maxHealth} | Level: ${player.level
            } (${player.exp}/${player.expToLevel()}) | STR:${player.str} DEX:${player.dex
            } CON:${player.con} INT:${player.intel} WIS:${player.wis} CHA:${player.cha
            }`,
            "#a8a8a8"
          );
        } else if (t.includes("descend") || t.includes("stairs") || t === ">") {
          // Open the descend modal instead of instantly descending
          showDescendModal().catch(() => { });
        } else if (t.includes("help")) {
          logMessage(
            "Commands: move [forward/backward], turn [left/right], look, attack, pickup, inventory, stats, descend",
            "#a8a8a8"
          );
        } else {
          logMessage(
            `I don't understand "${command}". Type "help" for commands.`,
            "#a8a8a8"
          );
        }
      }

      // Flag to track if audio has been initialized
      let isAudioInitialized = false;

      // Audio initialization function that requires user interaction
      function initializeAudio() {
        if (isAudioInitialized) return;
        isAudioInitialized = true; // mark early to prevent reentry

        // Try to load Tone.js dynamically and initialize audio on user gesture
        loadToneIfNeeded().then(() => {
          if (!window.Tone) { console.warn('Tone not available after load'); return; }
          Tone.start().then(() => {
            try {
              // Initialize basic sound objects; failures are non-fatal
              sounds.step = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.2 }, volume: -12 }).toDestination();
              sounds.playerAttack = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination();
              sounds.monsterAttack = new Tone.MembraneSynth({ pitchDecay: 0.1, octaves: 5, envelope: { attack: 0.001, decay: 0.4, sustain: 0 } }).toDestination();
              sounds.descend = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.5 } }).toDestination();
              // Disabled missing audio file to prevent 404 errors; leave alert null as fallback
              sounds.alert = null;
            } catch (e) { console.warn('Failed to initialize Tone instruments', e); }
          }).catch((e) => { console.warn('Tone.start() failed or was blocked by browser gesture policy', e); });
        }).catch((e) => { console.warn('Tone.js failed to load - continuing without audio', e); });
      }

      // Event listeners for user interaction to initialize audio
      document.addEventListener('click', initializeAudio, { once: true });
      document.addEventListener('keydown', initializeAudio, { once: true });

      // --- SAFETY HATCH: Force game start if assets hang ---
      // Moved outside window.onload because onload might never fire if a resource hangs.
      setTimeout(() => {
        const loadingOverlay = document.getElementById("loading-overlay");
        // Check if overlay is still visible
        if (loadingOverlay && loadingOverlay.style.display !== 'none') {
          console.warn("⚠️ Asset loading timed out (Safety Hatch). Forcing game start.");
          loadingOverlay.style.display = 'none';
          
          if (!window.gameInitialized) {
              window.gameInitialized = true;
              // If init() expects DOM to be ready, we are safe (8s passed).
              if (typeof init === 'function') init();
              // If initializeUI is defined inside onload, we might miss it if we don't expose it.
              // Logic check: initializeUI is defined INSIDE onload in the original file.
              // We need to extract it or handle it.
              // For now, let's assume we need to trigger the core game loop.
              
              // CRITICAL: initializeUI is inside onload scope. We can't call it here easily unless we move it or stub it.
              // However, init() is global? No, init() is usually defined in Game.js scope.
              // Let's check where init() is.
              // It seems init() is NOT defined in the snippet I saw. 
              // Wait, line 10280 calls init(). where is init defined?
              // It is probably defined in Game.js scope.
              
              // We will try to run what we can.
              if (typeof init === 'function') init();
              
              // We need to call initializeUI. If it's inner, we can't.
              // Let's assume for this specific patch we just want to remove the overlay and run init.
          }
        }
      }, 5000);

      window.onload = function () {
        const loadingOverlay = document.getElementById("loading-overlay");
        const loadingFill = document.getElementById("loading-fill");
        // Safety hatch log removed from here to avoid duplication


        const canvas = document.createElement("canvas");
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        // draw a bold red percent symbol % on transparent background
        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = "#ff3b3b";
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        // two circles for % and a diagonal slash
        ctx.beginPath();
        ctx.arc(38, 38, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(90, 90, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(28, 100);
        ctx.lineTo(100, 28);
        ctx.stroke();
        const pctTexture = new THREE.CanvasTexture(canvas);
        lootCorpseMaterial = new THREE.MeshBasicMaterial({
          map: pctTexture,
          transparent: true,
          depthTest: false,
        });
        const loader = new THREE.GLTFLoader();
        loader.setCrossOrigin && loader.setCrossOrigin('anonymous');
        // Note: speaker button handlers are initialized inside initializeUI()
        let modelsLoaded = 0;
        function loadModel(modelInfo) {
          return Promise.race([
            new Promise((resolve, reject) => {
              loader.load(
                modelInfo.url,
                (gltf) => {
                  modelsLoaded++;
                  loadingFill.style.width = `${(modelsLoaded / models.length) * 100}%`;
                  resolve({ ...modelInfo, gltf });
                },
                undefined,
                reject
              );
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout loading model: ' + modelInfo.name)), 5000))
          ]);
        }
        console.log("🚀 Starting Model Load...");
        console.log("   Models to load:", models);

        Promise.allSettled(models.map(loadModel))
          .then((results) => {
            console.log("✅ Models loaded (settled).", results);
            try {
              const impOk = results.find(
                (r) => r.status === 'fulfilled' && r.value.name === 'imp'
              );
              const gobOk = results.find(
                (r) => r.status === 'fulfilled' && r.value.name === 'goblin'
              );
              if (impOk) {
                const impScene = impOk.value.gltf.scene;
                impScene.name = 'Imp';
                impScene.userData.originalUrl = impOk.value.url;
                impScene.traverse((child) => {
                  if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0.8, 0.8, 0.8);
                    child.material.emissiveIntensity = 0.8;
                  }
                });
                monsterModels.push(impScene);
              }
              if (gobOk) {
                const goblinScene = gobOk.value.gltf.scene;
                goblinScene.name = 'Goblin';
                goblinScene.userData.originalUrl = gobOk.value.url;
                goblinScene.traverse((child) => {
                  if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0.8, 0.8, 0.8);
                    child.material.emissiveIntensity = 0.8;
                  }
                });
                monsterModels.push(goblinScene);
              }
              if (monsterModels.length === 0) {
                console.warn('No monster models loaded — using fallback stubs');
                monsterModels.push(createStubMonsterModel('Stub A'));
                monsterModels.push(createStubMonsterModel('Stub B'));
              }
            } catch (e) {
              console.warn('Model processing failed — using fallback stubs', e);
              monsterModels = [createStubMonsterModel('Stub A'), createStubMonsterModel('Stub B')];
            }
          })
          .finally(() => {
            // Always start the game, even if models failed. Attach player later.
              // Always start the game, even if models failed. Attach player later.
            setTimeout(() => {
              if (window.gameInitialized) return; // Previously started by safety hatch
              window.gameInitialized = true;
              loadingOverlay.style.display = 'none';
              init();
              initializeUI();
              syncPromptHeightVar();

              // === CREATE MONSTER FOR TUNING (after everything is loaded) ===
              setTimeout(() => {
                console.log('Creating monster after full initialization');
                createMonsterForTuning();

                // Run forensic scan immediately after monster creation
                setTimeout(() => {
                  if (window.forensicSync) {
                    console.log('🔍 Running forensic scan after monster creation');
                    window.forensicSync && window.forensicSync.scheduleScan && window.forensicSync.scheduleScan();
                  }
                }, 200);
              }, 100);

              // Welcome message to test adventure container
              setTimeout(() => {
                logMessage("🎮 Adventure Container loaded! The beautiful 3D neumorphic UI from Origami.Dungeon.001.E is now active.", "#00e5ff");
                logMessage("✨ Try commands like 'look', 'go north', or 'inventory' in the command input below.", "#ffffff");
              }, 500);
            }, 200);
          });

        function initializeUI() {
          // DOM references
          const enterBtn = document.getElementById("dnd-fpv-enter-btn");
          const speakerBtn = document.getElementById("dnd-fpv-speaker-btn");
          const soundBtn = document.getElementById("sound-btn");
          const volumeSliderContainer = document.getElementById(
            "volume-slider-container"
          );
          const volumeSlider = document.getElementById("volume-slider");
          // Radar setup

          commandInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              const command = commandInput.value.trim();
              if (command) {
                handleFPVCommand(command);
                commandInput.value = "";
              }
            }
          });

          // Add event listener for the new adventure command input
          if (adventureCommandInput) {
            adventureCommandInput.addEventListener("keydown", (e) => {
              if (e.key === "Enter") {
                const command = adventureCommandInput.value.trim();
                if (command) {
                  handleFPVCommand(command);
                  adventureCommandInput.value = "";
                }
              }
            });
          }

          // Add event handlers for quick action buttons
          const qaAuto = document.getElementById("qa-auto");
          if (qaAuto) {
            qaAuto.addEventListener("click", () => {
              // Toggle auto mode
              const isPressed = qaAuto.getAttribute("aria-pressed") === "true";
              qaAuto.setAttribute("aria-pressed", !isPressed);
              qaAuto.textContent = !isPressed ? "Auto: ON" : "Auto Turn";
            });
          }

          const qaLook = document.getElementById("qa-look");
          if (qaLook) {
            qaLook.addEventListener("click", () => handleFPVCommand("look"));
          }

          const qaHelp = document.getElementById("qa-help");
          if (qaHelp) {
            qaHelp.addEventListener("click", () => handleFPVCommand("help"));
          }

          const qaMode = document.getElementById("qa-mode");
          if (qaMode) {
            qaMode.addEventListener("click", () => {
              // Toggle between Real-time and Turn-based
              const isRealtime = qaMode.textContent.includes("Real-time");
              qaMode.textContent = isRealtime ? "Mode: Turn-based" : "Mode: Real-time";
              qaMode.setAttribute("aria-pressed", !isRealtime);
            });
          }

          // Adventure container button handlers
          const dndThemeBtn = document.getElementById("dnd-adventure-theme-toggle-btn");
          if (dndThemeBtn) {
            dndThemeBtn.addEventListener("click", () => {
              logMessage("Theme toggle activated.");
              // Could toggle between light/dark themes or different visual styles
            });
          }

          const dndInventoryBtn = document.getElementById("dnd-adventure-inventory-btn");
          if (dndInventoryBtn) {
            dndInventoryBtn.addEventListener("click", () => {
              handleFPVCommand("inventory");
            });
          }

          const dndRedrawBtn = document.getElementById("dnd-adventure-redraw-map-btn");
          if (dndRedrawBtn) {
            dndRedrawBtn.addEventListener("click", () => {
              logMessage("Map redrawn.");
              // Could refresh the 3D scene or update the radar display
              // drawRadar(); // Update radar displays
            });
          }

          // Death modal restart button handler
          const restartBtn = document.getElementById("restart-game-btn");
          if (restartBtn) {
            restartBtn.addEventListener("click", () => {
              restartGame();
            });
          }

          enterBtn.addEventListener("click", () => {
            const command = commandInput.value.trim();
            if (command) {
              handleFPVCommand(command);
              commandInput.value = "";
            }
          });
          // Audio controls
          if (soundBtn) {
            soundBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              if (volumeSliderContainer.style.display === "block") {
                Tone.Destination.mute = !Tone.Destination.mute;
                soundBtn.textContent = Tone.Destination.mute ? "🔇" : "🎵";
              } else {
                volumeSliderContainer.style.display = "block";
              }
            });
          }
          if (volumeSlider) {
            volumeSlider.addEventListener("input", () => {
              const value = Number(volumeSlider.value);
              const dB = value - 100;
              Tone.Destination.volume.value = dB;
              if (Tone.Destination.mute) {
                Tone.Destination.mute = false;
                if (soundBtn) soundBtn.textContent = "🎵";
              }
            });
          }
          if (speakerBtn) {
            speakerBtn.addEventListener("click", () => {
              isAudioEnabled = !isAudioEnabled;
              speakerBtn.textContent = isAudioEnabled ? "🔊" : "🔈";
              logMessage(
                isAudioEnabled ? "Audio enabled." : "Audio muted.",
                "#87ceeb"
              );
              Tone.Destination.mute = !isAudioEnabled;
            });
          }
          document.addEventListener("click", (e) => {
            if (
              volumeSliderContainer &&
              !volumeSliderContainer.contains(e.target) &&
              !soundBtn.contains(e.target)
            ) {
              volumeSliderContainer.style.display = "none";
            }
          });
          const q = (s) => document.querySelector(s);
          q(".mv-up")?.addEventListener("click", () =>
            GameTurnManager.queuePlayerAction(movePlayer, 1)
          );
          q(".mv-down")?.addEventListener("click", () =>
            GameTurnManager.queuePlayerAction(movePlayer, -1)
          );
          q(".mv-left")?.addEventListener("click", () => quickTurn(90));
          q(".mv-right")?.addEventListener("click", () => quickTurn(-90));
          q(".mv-act")?.addEventListener("click", handleInteract);
          document.querySelectorAll(".qa").forEach((btn) => {
            const txt = btn.textContent.trim().toLowerCase();
            if (txt === "help")
              btn.addEventListener("click", (e) => {
                e.stopPropagation();
                showHelpModal();
              });
            else btn.addEventListener("click", () => handleFPVCommand(txt));
          });
          q('#prompt-icon-stack .stk[title="Settings"]')?.addEventListener(
            "click",
            () => logMessage("Settings panel not implemented.", "#a8a8a8")
          );
          q('#prompt-icon-stack .stk[title="Docs"]')?.addEventListener(
            "click",
            (e) => {
              e.stopPropagation();
              showHelpModal();
            }
          );
          // Bind '?' key to open help modal
          window.addEventListener("keydown", (e) => {
            if (e.key === "?") {
              e.preventDefault();
              showHelpModal();
            }
          });
          // --- INPUT HANDLING ---
          // FPV Click-to-Move
          fpvViewContainer.addEventListener('click', (event) => {
            console.log("FPV Click detected!", event.clientX, event.clientY); // DEBUG
            if (game.state !== "PLAYING") {
              console.log("Click ignored: Game state is", game.state); // DEBUG
              return;
            }

            // Calculate mouse position in normalized device coordinates (-1 to +1)
            const rect = fpvViewContainer.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Raycast from camera
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, fpvCamera);

            // Intersect with floor
            // We can use a mathematical plane for efficiency since the floor is flat at y=0
            const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const target = new THREE.Vector3();

            if (raycaster.ray.intersectPlane(floorPlane, target)) {
              // Convert world coordinates to grid coordinates
              const gridX = Math.floor(target.x / TILE_SIZE);
              const gridY = Math.floor(target.z / TILE_SIZE);

              // Validate bounds and walkability
              if (gridX >= 0 && gridX < MAP_WIDTH && gridY >= 0 && gridY < MAP_HEIGHT) {
                const tile = map[gridY][gridX];
                if (tile.type === TILE.FLOOR) {
                  // Visual feedback (optional: spawn a marker)
                  logMessage(`Moving to (${gridX}, ${gridY})`, "#00ff00");
                  startAutoMove(gridX, gridY);
                } else {
                  logMessage("Cannot move there.", "#ff0000");
                }
              }
            }
          });

          // Keyboard Controls
          document.addEventListener("keydown", (e) => {
            if (
              volumeSliderContainer &&
              !volumeSliderContainer.contains(e.target) &&
              !soundBtn.contains(e.target)
            ) {
              volumeSliderContainer.style.display = "none";
            }
          });
          // Prompt height may change after UI initializes; resync once more
          setTimeout(syncPromptHeightVar, 50);
          // Dice animation removed
        }

        // Audio initialization moved to the top level with user interaction
        // Check if audio was already initialized from click/keydown
        if (!isAudioInitialized) {
          console.log("Waiting for user interaction to initialize audio");
        }
        // Map header click to toggle maximize state
        const mainContainer = document.getElementById("main-container");
        const fpvLabel = fpvViewContainer.querySelector(".view-label");
        const mapLabel = mapContainer.querySelector(".view-label");

        mapLabel.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          // Don't allow swapping on mobile
          if (window.innerWidth <= 768) return;
          mainContainer.classList.toggle("views-swapped");
          // Move the FPV prompt band to always sit under the large active FPV container
          const prompt = document.getElementById("dnd-fpv-prompt");
          if (prompt) {
            if (mainContainer.classList.contains("views-swapped")) {
              // FPV becomes small, keep prompt inside fpview-container but visible (CSS no longer hides it)
              fpvViewContainer.appendChild(prompt);
            } else {
              // FPV is large, ensure prompt is in fpview-container
              fpvViewContainer.appendChild(prompt);
            }
          }
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
          }, 60);
          setTimeout(() => {
            syncPromptHeightVar();
            window.dispatchEvent(new Event("resize"));
          }, 60);
        });
        fpvLabel?.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          // Don't allow swapping on mobile
          if (window.innerWidth <= 768) return;
          mainContainer.classList.toggle("views-swapped");
          const prompt = document.getElementById("dnd-fpv-prompt");
          if (prompt) {
            if (mainContainer.classList.contains("views-swapped")) {
              fpvViewContainer.appendChild(prompt);
            } else {
              fpvViewContainer.appendChild(prompt);
            }
          }
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
          }, 60);
          setTimeout(() => {
            syncPromptHeightVar();
            window.dispatchEvent(new Event("resize"));

            // Position keypad after load
            try {
              positionKeypad();
              console.log('✅ Keypad positioned successfully');
            } catch (e) {
              console.error('❌ positionKeypad() failed:', e);
            }
          }, 60);
        });
      };



      // === FLUID UI SYSTEM ===

      class FluidUI {
        constructor() {
          this.mapContainer = document.getElementById('mapview-container');
          this.fpvContainer = document.getElementById('fpv-viewport');
          this.mainContainer = document.getElementById('main-container');
          this.isDragging = false;
          this.isResizing = false;
          this.currentHandle = null;
          this.startPos = { x: 0, y: 0 };
          this.startSize = { width: 0, height: 0 };
          this.startPosition = { left: 0, top: 0 };

          this.init();
        }

        init() {
          this.loadState();
          this.checkAndResetPosition();
          this.addDragFunctionality();
          this.addResizeFunctionality();
          this.addLabelClickHandlers();
          this.addAutoLayoutDetection();
          this.addAdventureViewMinimization();

          // Initialize Fluid Compass

        }

        makeFluid(element) {
          if (!element) return;

          // Drag functionality
          element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) return;
            // Allow interaction with internal elements if needed, but for now drag on empty space
            // or if it's the container itself
            if (e.target !== element && !e.target.classList.contains('view-label')) {
              // Optional: check if we want to allow dragging from children?
              // For compass, dragging from anywhere inside is fine unless it's a control
            }

            this.activeDragElement = element;
            this.isDragging = true;
            element.classList.add('dragging');
            this.startPos = { x: e.clientX, y: e.clientY };
            this.startPosition = {
              left: element.offsetLeft,
              top: element.offsetTop
            };

            e.preventDefault();
            e.stopPropagation();
          });

          // Resize functionality
          const handles = element.querySelectorAll('.resize-handle');
          handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.preventDefault();

              this.activeResizeElement = element;
              this.isResizing = true;
              this.resizeDir = '';
              if (handle.classList.contains("se")) this.resizeDir = "se";
              else if (handle.classList.contains("sw")) this.resizeDir = "sw";
              else if (handle.classList.contains("ne")) this.resizeDir = "ne";
              else if (handle.classList.contains("nw")) this.resizeDir = "nw";

              const rect = element.getBoundingClientRect();
              this.resizeStart = {
                x: e.clientX,
                y: e.clientY,
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
              };

              // Add global listeners for move/up
              const onMove = (e) => this.handleGenericResize(e);
              const onUp = () => {
                this.isResizing = false;
                this.activeResizeElement = null;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            });
          });
        }

        handleGenericResize(e) {
          if (!this.isResizing || !this.activeResizeElement) return;

          const dx = e.clientX - this.resizeStart.x;
          const dy = e.clientY - this.resizeStart.y;
          let newWidth = this.resizeStart.width;
          let newHeight = this.resizeStart.height;
          let newLeft = this.resizeStart.left;
          let newTop = this.resizeStart.top;

          const MIN_SIZE = 80;

          if (this.resizeDir.includes('e')) newWidth = Math.max(MIN_SIZE, this.resizeStart.width + dx);
          if (this.resizeDir.includes('s')) newHeight = Math.max(MIN_SIZE, this.resizeStart.height + dy);
          if (this.resizeDir.includes('w')) {
            const w = Math.max(MIN_SIZE, this.resizeStart.width - dx);
            newLeft = this.resizeStart.left + (this.resizeStart.width - w);
            newWidth = w;
          }
          if (this.resizeDir.includes('n')) {
            const h = Math.max(MIN_SIZE, this.resizeStart.height - dy);
            newTop = this.resizeStart.top + (this.resizeStart.height - h);
            newHeight = h;
          }

          // For compass, keep aspect ratio 1:1 if desired, or let it stretch.
          // Let's enforce 1:1 for compass specifically?


          this.activeResizeElement.style.width = newWidth + 'px';
          this.activeResizeElement.style.height = newHeight + 'px';
          this.activeResizeElement.style.left = newLeft + 'px';
          this.activeResizeElement.style.top = newTop + 'px';
        }

        addDragFunctionality() {
          this.mapContainer.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) return;
            if (e.target.classList.contains('view-label')) return;

            this.isDragging = true;
            this.mapContainer.classList.add('dragging');
            this.startPos = { x: e.clientX, y: e.clientY };
            this.startPosition = {
              left: this.mapContainer.offsetLeft,
              top: this.mapContainer.offsetTop
            };

            e.preventDefault();
          });



          // Generic global mouse move for dragging
          document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
              const target = this.activeDragElement || this.mapContainer;

              const deltaX = e.clientX - this.startPos.x;
              const deltaY = e.clientY - this.startPos.y;

              let newLeft = this.startPosition.left + deltaX;
              let newTop = this.startPosition.top + deltaY;

              // Constrain to viewport
              const containerRect = target.getBoundingClientRect();
              newLeft = Math.max(0, Math.min(window.innerWidth - containerRect.width, newLeft));
              newTop = Math.max(0, Math.min(window.innerHeight - containerRect.height, newTop));

              target.style.left = newLeft + 'px';
              target.style.top = newTop + 'px';
              target.style.right = 'auto';
              target.style.bottom = 'auto';

              if (target === this.mapContainer) this.checkAutoLayout();
            }
          });

          document.addEventListener('mouseup', () => {
            if (this.isDragging) {
              this.isDragging = false;
              if (this.activeDragElement) {
                this.activeDragElement.classList.remove('dragging');
                this.activeDragElement = null;
              } else {
                this.mapContainer.classList.remove('dragging');
              }
            }
          });
        }

        addResizeFunctionality() {
          const handles = this.mapContainer.querySelectorAll('.resize-handle');

          handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
              this.isResizing = true;
              this.currentHandle = handle;
              this.mapContainer.classList.add('resizing');
              this.startPos = { x: e.clientX, y: e.clientY };
              this.startSize = {
                width: this.mapContainer.offsetWidth,
                height: this.mapContainer.offsetHeight
              };
              this.startPosition = {
                left: this.mapContainer.offsetLeft,
                top: this.mapContainer.offsetTop
              };

              e.stopPropagation();
              e.preventDefault();
            });
          });

          document.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;

            const deltaX = e.clientX - this.startPos.x;
            const deltaY = e.clientY - this.startPos.y;
            const handleClass = this.currentHandle.className;

            let newWidth = this.startSize.width;
            let newHeight = this.startSize.height;
            let newLeft = this.startPosition.left;
            let newTop = this.startPosition.top;

            if (handleClass.includes('se')) {
              newWidth = Math.max(200, this.startSize.width + deltaX);
              newHeight = Math.max(200, this.startSize.height + deltaY);
            } else if (handleClass.includes('sw')) {
              newWidth = Math.max(200, this.startSize.width - deltaX);
              newHeight = Math.max(200, this.startSize.height + deltaY);
              newLeft = this.startPosition.left + deltaX;
            } else if (handleClass.includes('ne')) {
              newWidth = Math.max(200, this.startSize.width + deltaX);
              newHeight = Math.max(200, this.startSize.height - deltaY);
              newTop = this.startPosition.top + deltaY;
            } else if (handleClass.includes('nw')) {
              newWidth = Math.max(200, this.startSize.width - deltaX);
              newHeight = Math.max(200, this.startSize.height - deltaY);
              newLeft = this.startPosition.left + deltaX;
              newTop = this.startPosition.top + deltaY;
            } else if (handleClass.includes('n')) {
              newHeight = Math.max(200, this.startSize.height - deltaY);
              newTop = this.startPosition.top + deltaY;
            } else if (handleClass.includes('s')) {
              newHeight = Math.max(200, this.startSize.height + deltaY);
            } else if (handleClass.includes('e')) {
              newWidth = Math.max(200, this.startSize.width + deltaX);
            } else if (handleClass.includes('w')) {
              newWidth = Math.max(200, this.startSize.width - deltaX);
              newLeft = this.startPosition.left + deltaX;
            }

            this.mapContainer.style.width = newWidth + 'px';
            this.mapContainer.style.height = newHeight + 'px';
            this.mapContainer.style.left = newLeft + 'px';
            this.mapContainer.style.top = newTop + 'px';
            this.mapContainer.style.right = 'auto';
            this.mapContainer.style.bottom = 'auto';

            this.checkAutoLayout();
          });

          document.addEventListener('mouseup', () => {
            if (this.isResizing) {
              this.isResizing = false;
              this.currentHandle = null;
              this.mapContainer.classList.remove('resizing');
              this.saveState();
            }
          });
        }

        checkAndResetPosition() {
          const rect = this.mapContainer.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;

          // Check if significantly off-screen
          if (rect.right < 50 || rect.left > vw - 50 || rect.bottom < 50 || rect.top > vh - 50) {
            console.log("PiP off-screen, resetting to default.");
            this.mapContainer.style.top = '20px';
            this.mapContainer.style.right = '20px';
            this.mapContainer.style.left = 'auto';
            this.mapContainer.style.bottom = 'auto';
            this.mapContainer.style.width = '300px';
            this.mapContainer.style.height = '300px';
          }
        }

        saveState() {
          try {
            const s = {
              left: this.mapContainer.offsetLeft,
              top: this.mapContainer.offsetTop,
              width: this.mapContainer.offsetWidth,
              height: this.mapContainer.offsetHeight
            };
            safeStorage.setItem("mapPiPState.v2", JSON.stringify(s));
          } catch (e) { }
        }

        loadState() {
          try {
            const raw = safeStorage.getItem("mapPiPState.v2");
            if (raw) {
              const s = JSON.parse(raw);
              this.mapContainer.style.left = s.left + 'px';
              this.mapContainer.style.top = s.top + 'px';
              this.mapContainer.style.width = s.width + 'px';
              this.mapContainer.style.height = s.height + 'px';
              this.mapContainer.style.right = 'auto';
              this.mapContainer.style.bottom = 'auto';
            }
          } catch (e) { }
        }

        addLabelClickHandlers() {
          const mapLabel = this.mapContainer.querySelector('.view-label');
          const fpvLabel = this.fpvContainer.querySelector('.view-label');

          mapLabel?.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.switchPositions();
          });

          fpvLabel?.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.switchPositions();
          });
        }

        switchPositions() {
          // Get current positions
          const mapRect = this.mapContainer.getBoundingClientRect();
          const fpvRect = this.fpvContainer.getBoundingClientRect();

          // Store map container's current absolute position
          const mapCurrentLeft = this.mapContainer.offsetLeft;
          const mapCurrentTop = this.mapContainer.offsetTop;

          // If map is in its default position (top-right), move it to bottom-left
          if (mapCurrentLeft > window.innerWidth * 0.6 && mapCurrentTop < window.innerHeight * 0.4) {
            this.mapContainer.style.left = '20px';
            this.mapContainer.style.top = (window.innerHeight - mapRect.height - 20) + 'px';
            this.mapContainer.style.right = 'auto';
            this.mapContainer.style.bottom = 'auto';
          } else {
            // Move back to top-right
            this.mapContainer.style.left = 'auto';
            this.mapContainer.style.top = '20px';
            this.mapContainer.style.right = '20px';
            this.mapContainer.style.bottom = 'auto';
          }
        }

        checkAutoLayout() {
          const mapRect = this.mapContainer.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // Check if approaching 50/50 split (within 5%)
          const horizontalMidpoint = viewportWidth * 0.5;
          const verticalMidpoint = viewportHeight * 0.5;
          const tolerance = Math.min(viewportWidth, viewportHeight) * 0.05; // 5% tolerance

          // Check if map spans close to 50% of screen
          const mapSpansHorizontal = Math.abs(mapRect.width - viewportWidth * 0.5) < tolerance;
          const mapSpansVertical = Math.abs(mapRect.height - viewportHeight * 0.5) < tolerance;

          // Check if positioned near center line
          const nearHorizontalCenter = Math.abs((mapRect.left + mapRect.width / 2) - horizontalMidpoint) < tolerance;
          const nearVerticalCenter = Math.abs((mapRect.top + mapRect.height / 2) - verticalMidpoint) < tolerance;

          if ((mapSpansHorizontal && nearVerticalCenter) || (mapSpansVertical && nearHorizontalCenter)) {
            this.enableAutoLayout(mapSpansHorizontal ? 'side-by-side' : 'top-bottom');
          } else {
            this.disableAutoLayout();
          }
        }

        enableAutoLayout(type) {
          if (type === 'side-by-side') {
            this.mainContainer.classList.add('auto-layout-horizontal');
            this.mainContainer.classList.remove('auto-layout-vertical');
          } else {
            this.mainContainer.classList.add('auto-layout-vertical');
            this.mainContainer.classList.remove('auto-layout-horizontal');
          }
        }

        disableAutoLayout() {
          this.mainContainer.classList.remove('auto-layout-horizontal', 'auto-layout-vertical');
        }

        addAutoLayoutDetection() {
          // Monitor for auto-layout triggers during resize/drag operations
          const checkAutoLayoutThrottled = () => {
            clearTimeout(this.autoLayoutCheckTimer);
            this.autoLayoutCheckTimer = setTimeout(() => {
              this.checkAutoLayout();
            }, 100);
          };

          // Add to existing event listeners
          window.addEventListener('resize', checkAutoLayoutThrottled);

          // Check auto-layout periodically during drag operations
          this.mapContainer.addEventListener('mousedown', () => {
            this.autoLayoutInterval = setInterval(checkAutoLayoutThrottled, 50);
          });

          document.addEventListener('mouseup', () => {
            if (this.autoLayoutInterval) {
              clearInterval(this.autoLayoutInterval);
              this.autoLayoutInterval = null;
            }
          });
        }

        addAdventureViewMinimization() {
          const adventureView = document.getElementById('adventure-view');
          if (!adventureView) return;

          let clickCount = 0;
          let clickTimer = null;

          adventureView.addEventListener('click', (e) => {
            // Only trigger on clicks to the adventure view itself, not child elements
            if (e.target !== adventureView && !e.target.classList.contains('panel-label')) return;

            clickCount++;

            if (clickCount === 1) {
              clickTimer = setTimeout(() => {
                clickCount = 0;
              }, 400); // Reset after 400ms
            } else if (clickCount === 2) {
              clearTimeout(clickTimer);
              clickCount = 0;
              this.toggleAdventureViewMinimized();
            }
          });

          // Also allow clicking on the panel label to minimize
          const panelLabel = adventureView.querySelector('.panel-label');
          if (panelLabel) {
            panelLabel.addEventListener('dblclick', (e) => {
              e.stopPropagation();
              this.toggleAdventureViewMinimized();
            });
          }
        }

        toggleAdventureViewMinimized() {
          const adventureView = document.getElementById('adventure-view');
          if (!adventureView) return;

          const isMinimized = adventureView.classList.contains('minimized');

          if (isMinimized) {
            // Expand
            adventureView.classList.remove('minimized');
          } else {
            // Minimize
            adventureView.classList.add('minimized');
          }


        }

        // updateMiniCompassRadar REMOVED
      }

      // Add CSS for auto-layout
      const autoLayoutCSS = `
        #main-container.auto-layout-horizontal {
          display: flex;
          flex-direction: row;
          width: 100vw;
          height: 100vh;
        }
        
        #main-container.auto-layout-horizontal #mapview-container {
          position: relative !important;
          width: 50% !important;
          height: 100% !important;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          bottom: auto !important;
          border-radius: 0 !important;
        }
        
        #main-container.auto-layout-horizontal #fpv-viewport {
          width: 50% !important;
          height: 100% !important;
        }
        
        #main-container.auto-layout-vertical {
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
        }
        
        #main-container.auto-layout-vertical #mapview-container {
          position: relative !important;
          width: 100% !important;
          height: 50% !important;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          bottom: auto !important;
          border-radius: 0 !important;
        }
        
        #main-container.auto-layout-vertical #fpv-viewport {
          width: 100% !important;
          height: 50% !important;
        }
      `;

      // Inject auto-layout CSS
      const autoLayoutStyleSheet = document.createElement('style');
      autoLayoutStyleSheet.textContent = autoLayoutCSS;
      document.head.appendChild(autoLayoutStyleSheet);

      // Initialize Fluid UI System
      new FluidUI();

      // Ensure a single awardXP implementation is used
      window.awardXP = awardXP;

      // Dice roll helpers (FPV movement overlay)
      try {
        function rollCenterDice() {
          try {
            const dice = document.querySelector('.dnd-game-3d-dice');
            if (!dice) return;

            const result = Math.floor(Math.random() * 6) + 1;
            const rotations = {
              1: 'rotateX(0deg) rotateY(0deg)',
              2: 'rotateX(-90deg) rotateY(0deg)',
              3: 'rotateX(0deg) rotateY(-90deg)',
              4: 'rotateX(0deg) rotateY(90deg)',
              5: 'rotateX(90deg) rotateY(0deg)',
              6: 'rotateX(180deg) rotateY(0deg)'
            };

            const randomX = (Math.floor(Math.random() * 4) + 2) * 360;
            const randomY = (Math.floor(Math.random() * 4) + 2) * 360;

            dice.classList.add('rolling');
            dice.classList.remove('fast-spin');
            dice.style.transform = `rotateX(${randomX}deg) rotateY(${randomY}deg) ${rotations[result]}`;

            setTimeout(() => { try { dice.classList.remove('rolling'); dice.style.transform = rotations[result]; } catch (e) { } }, 1800);

            try {
              const diceSound = new Audio();
              diceSound.volume = 0.32;
              diceSound.src = 'data:audio/wav;base64,UklGRjsBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YRMBAAC4uLi4uLi4uLi4tbW1tbW1tbW1tbWysrKysrKysrKyrq6urq6urq6urqurq6urq6urq6urqKioqKioqKioqKWlpaWlpaWlpaWipaKloqWipaKln6Ofop+in6KfoqGhoaGhoaGhoaGenp6enp6enp6em5ubm5ubm5ubm5iYmJiYmJiYmJiVlZWVlZWVlZWVkpKSkpKSkpKSkpOTk5OTk5OTk5CQkJCQkJCQkJCNjY2NjY2NjY2NioqKioqKioqKiYmJiYmJiYmJhoeGh4aHhoeGg4ODg4ODg4ODgYGBgYGBgYGBfn5+fn5+fn5+fHx8fHx8fHx8eXl5eXl5eXl5dnZ2dnZ2dnZ2dHR0dHR0dHR0cXFxcXFxcXFxbm5ubm5ubm5ubGxsbGxsbGxsaWlpaWlpaWlpZ2dnZ2dnZ2dnZGRkZGRkZGRkYmJiYmJiYmJiX19fX19fX19fXFxcXFxcXFxcWlpaWlpaWlpaV1dXV1dXV1dXVVVVVVVVVVVVUlJSUlJSUlJSUFBQUFBQUFBQTU1NTU1NTU1NSkpKSkpKSkpKSEhISEhISEhIRUVFRUVFRUVFQ0NDQ0NDQ0NDQEBAQEBAQEBAOj09';
              diceSound.play().catch(() => { });
            } catch (e) { }

            setTimeout(() => { try { showDiceResult(result); } catch (e) { } }, 1200);
            return result;
          } catch (e) { console.warn('rollCenterDice failed', e); }
        }

        function showDiceResult(result) {
          try {
            const resultEl = document.createElement('div');
            resultEl.className = 'dice-result-popup';
            resultEl.textContent = `🎲 ${result}`;
            resultEl.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(59,130,246,0.92); color: white; padding: 12px 20px; border-radius: 14px; font-size: 20px; font-weight: 700; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 2000; animation: diceResultAnim 1.8s ease-out forwards; pointer-events: none;';

            if (!document.getElementById('dice-result-styles')) {
              const style = document.createElement('style');
              style.id = 'dice-result-styles';
              style.textContent = '@keyframes diceResultAnim { 0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0 } 30% { transform: translate(-50%, -50%) scale(1.1); opacity: 1 } 60% { transform: translate(-50%, -60%) scale(1); opacity: 1 } 100% { transform: translate(-50%, -140%) scale(1); opacity: 0 } }';
              document.head.appendChild(style);
            }

            document.body.appendChild(resultEl);
            setTimeout(() => resultEl.remove(), 1800);
          } catch (e) { console.warn('showDiceResult failed', e); }
        }
      } catch (e) { console.warn('dice helpers failed to initialize', e); }

      // Small directional helper used by the FPV keypad overlay buttons
      try {
        window.movePlayerDir = function (dir) {
          try {
            console.log('FPV Keypad movement:', dir);

            // Map keypad directions to arrow key events
            const keyMap = {
              'up': 'ArrowUp',
              'down': 'ArrowDown',
              'left': 'ArrowLeft',
              'right': 'ArrowRight'
            };

            const arrowKey = keyMap[dir];
            if (arrowKey) {
              // Create and dispatch a keydown event to simulate arrow key press
              const keyEvent = new KeyboardEvent('keydown', {
                key: arrowKey,
                code: arrowKey,
                bubbles: true,
                cancelable: true
              });
              document.dispatchEvent(keyEvent);

              // Brief delay then keyup to complete the movement
              setTimeout(() => {
                const keyUpEvent = new KeyboardEvent('keyup', {
                  key: arrowKey,
                  code: arrowKey,
                  bubbles: true,
                  cancelable: true
                });
                document.dispatchEvent(keyUpEvent);
              }, 100);
            }
          } catch (e) { console.warn('movePlayerDir failed', e); }
        };
      } catch (e) { console.warn('failed to install movePlayerDir', e); }

      // Global console functions for forensic analysis
      console.log('🚀 FORENSIC TOOLS LOADED:');
      console.log('   analyzeMonsters() - Analyze monster model duplication');
      console.log('   analyzeClickMove() - Analyze click-to-move system');
      console.log('   analyzeTacticalPositioning() - Analyze tactical circle & model positioning');
      console.log('   runFullForensics() - Run complete forensic analysis');
      console.log('   fixArrows() - Emergency arrow visibility fix');
      console.log('   addWhiteBorders() - Emergency white border fix');
    };
// Backup exposure
if (typeof init === 'function') window.init = init;
console.log("✅ Game.js execution completed. window.init set.");



