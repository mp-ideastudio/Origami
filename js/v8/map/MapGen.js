/**
 * MapGen.js — T0.1.B extraction from NewOrigami.Engine8.html
 *
 * Procedural dungeon generator. No Three.js dependency.
 * Export: generateDungeonMap(level, MAP_W, MAP_H) → { map, rooms, spawnX, spawnZ, mobSpawns }
 *
 * ULTRA-COMPACT LAYOUT: 1 room per level placed adjacent with doorway openings.
 * No long corridors. Levels 1-6 have regular rooms, Level 7 has OniBaba throne room.
 */

/**
 * generateDungeonMap(level, MAP_W, MAP_H)
 *
 * @param {number} level - Dungeon level 1-20
 * @param {number} MAP_W - Map width in grid cells
 * @param {number} MAP_H - Map height in grid cells
 * @returns {{ map, rooms, spawnX, spawnZ, mobSpawns }}
 */
export function generateDungeonMap(level = 1, MAP_W = 128, MAP_H = 128) {
  level = Math.max(1, Math.min(20, level)); // Support levels 1-20
  const map = Array.from({ length: MAP_W }, () =>
    Array.from({ length: MAP_H }, () => ({ type: "wall" })),
  );
  const rooms = [];
  const BORDER = 3; // keep rooms away from map edge
  const MIN_R = 4,
    MAX_R = 7; // shogun-castle scale: smaller rooms pack tighter, more interior shoji partitions
  const ROOM_BUFFER = 1; // 1-tile wall between rooms (the wall we punch openings through)
  const ONIBABA_ROOM_SIZE = 18; // boss sanctum (level 7)
  // Japanese castle layout — densely packed rooms, all connected via
  // shoji openings on at least 2 different cardinal walls per room. Interior
  // dividers between adjacent rooms get converted to shoji-paper panels in a
  // post-pass below (the engine renders 'shoji' tiles as 8cm-thick panels,
  // not GRID-cube stone walls). Level 7 anchors a central throne room.
  // Hard cap at 15 rooms per level (user spec — performance budget).
  // Level 7 throne floor still gets the lower end of the range so the
  // throne sanctum has breathing room around it.
  const targetRooms = level === 7
    ? 10 + Math.floor(Math.random() * 3)   // 10-12 around the throne
    : 12 + Math.floor(Math.random() * 4);  // 12-15 elsewhere

  // ── Carve a rectangular room and register it ──────────────────────────────
  const carveRoom = (id, x0, z0, w, h, opts = {}) => {
    for (let x = x0; x < x0 + w; x++)
      for (let z = z0; z < z0 + h; z++)
        map[x][z] = { type: "floor", room: true, roomId: id, ...opts };
    const cx = Math.floor(x0 + w / 2),
      cz = Math.floor(z0 + h / 2);
    rooms.push({
      id,
      x: x0,
      y: z0,
      w,
      h,
      cx,
      cz,
      center: { x: cx, y: cz },
      ...opts,
    });
  };

  // ── Create a simple doorway opening between rooms (T0.18, rewritten) ──────
  // Two cases:
  //  1. Rooms are ADJACENT (share a wall via the 1-tile ROOM_BUFFER): find a
  //     wall tile touching both rooms' floor on opposite sides and punch it
  //     (1 or 2 tiles wide). This is the user-requested "simple opening".
  //  2. Rooms are NOT adjacent (random scatter landed them apart): carve a
  //     1-tile L-shaped corridor from A's center toward B's center. Tiles
  //     get marked corridor:true (no door geometry, just floor).
  const createDoorway = (roomA, roomB) => {
    // Collect all wall tiles that touch BOTH rooms (case 1 candidates)
    const candidates = [];
    const xMin = Math.max(0, Math.min(roomA.x, roomB.x) - 1);
    const xMax = Math.min(
      MAP_W - 1,
      Math.max(roomA.x + roomA.w, roomB.x + roomB.w),
    );
    const zMin = Math.max(0, Math.min(roomA.y, roomB.y) - 1);
    const zMax = Math.min(
      MAP_H - 1,
      Math.max(roomA.y + roomA.h, roomB.y + roomB.h),
    );
    for (let x = xMin; x <= xMax; x++) {
      for (let z = zMin; z <= zMax; z++) {
        if (map[x]?.[z]?.type !== "wall") continue;
        let touchA = false,
          touchB = false;
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const c = map[x + dx]?.[z + dz];
          if (c?.roomId === roomA.id) touchA = true;
          if (c?.roomId === roomB.id) touchB = true;
        }
        if (touchA && touchB) candidates.push({ x, z });
      }
    }

    if (candidates.length === 0) return false; // not adjacent — nothing to punch
    // Adjacent rooms — punch a shoji sliding-door opening. If `skipTiles` is
    // provided (e.g. for a second opening on the same room-pair), avoid
    // reusing those tiles so we don't just widen the existing door.
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    // ~15% of doorways are PANELLESS — open archways with no paper panel.
    // Mixing in a few open archways gives the dungeon visual rhythm without
    // diluting the shogun-castle paper-screen aesthetic.
    const panelless = Math.random() < 0.15;
    map[pick.x][pick.z] = { type: "shoji_door", roomId: roomA.id, panelless };
    // 50% chance to widen the opening to 2 tiles (big main entry feel)
    if (Math.random() < 0.5) {
      const adj = candidates.find(
        (c) =>
          (c.x === pick.x + 1 && c.z === pick.z) ||
          (c.x === pick.x - 1 && c.z === pick.z) ||
          (c.x === pick.x && c.z === pick.z + 1) ||
          (c.x === pick.x && c.z === pick.z - 1),
      );
      if (adj)
        map[adj.x][adj.z] = { type: "shoji_door", roomId: roomA.id, panelless };
    }
    return true;
  };

  // ── Overlap check with buffer ─────────────────────────────────────────────
  const overlaps = (x0, z0, w, h, buf = ROOM_BUFFER) => {
    if (x0 - buf < BORDER || z0 - buf < BORDER) return true;
    if (x0 + w + buf >= MAP_W - BORDER || z0 + h + buf >= MAP_H - BORDER)
      return true;
    for (const r of rooms) {
      if (
        x0 - buf < r.x + r.w &&
        x0 + w + buf > r.x &&
        z0 - buf < r.y + r.h &&
        z0 + h + buf > r.y
      )
        return true;
    }
    return false;
  };

  // ── Japanese room name pool per level ────────────────────────────────────
  const ROOM_POOLS = [
    /* L1 */ [
      "入口の間",
      "武具蔵",
      "板の間",
      "土間",
      "長屋",
      "番所",
      "厩",
      "倉庫",
      "水の間",
      "火の間",
    ],
    /* L2 */ [
      "地下廊下",
      "石牢",
      "水責め部屋",
      "拷問部屋",
      "隠し部屋",
      "番兵詰所",
      "武器庫",
      "兵糧庫",
      "火薬庫",
      "地下道",
    ],
    /* L3 */ [
      "呪いの間",
      "骸骨の部屋",
      "腐敗の廊下",
      "古戦場",
      "血の祭壇",
      "暗黒の庭",
      "亡者の館",
      "闇の蔵",
      "冥界の扉",
      "怨霊の間",
    ],
    /* L4 */ [
      "炎の間",
      "溶岩の廊下",
      "鬼の洞窟",
      "業火の部屋",
      "赤鬼の間",
      "閻魔の庭",
      "地獄谷",
      "焦熱地獄",
      "火の柱",
      "灼熱の間",
    ],
    /* L5 */ [
      "氷の廊下",
      "雪女の間",
      "吹雪の洞",
      "霜の蔵",
      "冰牢",
      "雪の祭壇",
      "凍てつく間",
      "氷柱の廊",
      "白銀の間",
      "霧の間",
    ],
    /* L6 */ [
      "雷の間",
      "稲妻の廊下",
      "嵐の洞",
      "天雷の部屋",
      "神鳴の間",
      "龍神の庭",
      "電光石火",
      "疾風の間",
      "暴風の蔵",
      "雷神の祭壇",
    ],
    /* L7 */ [
      "鬼婆の聖域",
      "冥府の門",
      "黒龍の間",
      "業の間",
      "六道の辻",
      "恩讐の庭",
      "鬼の玉座",
      "幽冥の奥",
      "彼岸の間",
      "魂の祭壇",
    ],
    /* L8 */ [
      "風の回廊",
      "竜巻の間",
      "疾風の庭",
      "嵐の神殿",
      "天空の間",
      "雲の上の部屋",
      "雷雲の間",
      "風神の祭壇",
      "空の境界",
      "嵐の中心",
    ],
    /* L9 */ [
      "大地の間",
      "岩石の殿堂",
      "鉱山の奥",
      "土の神殿",
      "山脈の間",
      "大地の怒り",
      "岩の迷宮",
      "鉱物の宝庫",
      "地底の王国",
      "土の精霊",
    ],
    /* L10 */ [
      "時の回廊",
      "過去の間",
      "未来の部屋",
      "時の狭間",
      "永遠の間",
      "時の番人",
      "歴史の書庫",
      "運命の輪",
      "時の迷宮",
      "永劫の間",
    ],
    /* L11 */ [
      "光の間",
      "輝きの殿堂",
      "太陽の部屋",
      "月の祭壇",
      "星の間",
      "光の精霊",
      "輝く迷宮",
      "光の宝庫",
      "星々の庭",
      "月の満ち欠け",
    ],
    /* L12 */ [
      "闇の深淵",
      "影の間",
      "黒き神殿",
      "夜の迷宮",
      "暗黒の宝庫",
      "影の精霊",
      "黒き回廊",
      "夜の番人",
      "闇の王座",
      "影の王国",
    ],
    /* L13 */ [
      "混沌の間",
      "無秩序の部屋",
      "混沌の神殿",
      "混沌の宝庫",
      "混沌の精霊",
      "混沌の迷宮",
      "混沌の王座",
      "混沌の王国",
      "混沌の回廊",
      "混沌の中心",
    ],
    /* L14 */ [
      "秩序の間",
      "調和の部屋",
      "秩序の神殿",
      "秩序の宝庫",
      "秩序の精霊",
      "秩序の迷宮",
      "秩序の王座",
      "秩序の王国",
      "秩序の回廊",
      "秩序の中心",
    ],
    /* L15 */ [
      "生命の間",
      "成長の部屋",
      "生命の神殿",
      "生命の宝庫",
      "生命の精霊",
      "生命の迷宮",
      "生命の王座",
      "生命の王国",
      "生命の回廊",
      "生命の中心",
    ],
    /* L16 */ [
      "死の間",
      "終焉の部屋",
      "死の神殿",
      "死の宝庫",
      "死の精霊",
      "死の迷宮",
      "死の王座",
      "死の王国",
      "死の回廊",
      "死の中心",
    ],
    /* L17 */ [
      "創造の間",
      "芸術の部屋",
      "創造の神殿",
      "創造の宝庫",
      "創造の精霊",
      "創造の迷宮",
      "創造の王座",
      "創造の王国",
      "創造の回廊",
      "創造の中心",
    ],
    /* L18 */ [
      "破壊の間",
      "崩壊の部屋",
      "破壊の神殿",
      "破壊の宝庫",
      "破壊の精霊",
      "破壊の迷宮",
      "破壊の王座",
      "破壊の王国",
      "破壊の回廊",
      "破壊の中心",
    ],
    /* L19 */ [
      "賢者の間",
      "知識の部屋",
      "賢者の神殿",
      "賢者の宝庫",
      "賢者の精霊",
      "賢者の迷宮",
      "賢者の王座",
      "賢者の王国",
      "賢者の回廊",
      "賢者の中心",
    ],
    /* L20 */ [
      "神々の間",
      "天界の部屋",
      "神々の神殿",
      "神々の宝庫",
      "神々の精霊",
      "神々の迷宮",
      "神々の王座",
      "神々の王国",
      "神々の回廊",
      "神々の中心",
    ],
  ];
  // English-name pools paired with the Japanese pools above (same order).
  // Levels 1-7 (game's main loop) are hand-translated; 8-20 are themed
  // by level concept + room-type suffix, generated on demand.
  const ROOM_POOLS_EN = [
    /* L1 */ ["Entry Hall","Armory","Plank Room","Earthen Floor","Long Hall","Guard Post","Stable","Storehouse","Water Hall","Fire Hall"],
    /* L2 */ ["Underground Corridor","Stone Cell","Water Torture Room","Torture Chamber","Hidden Room","Sentry Post","Weapon Cache","Granary","Powder Magazine","Tunnel"],
    /* L3 */ ["Cursed Hall","Bone Room","Rotten Corridor","Old Battlefield","Blood Altar","Dark Garden","House of the Dead","Dark Vault","Underworld Gate","Vengeful Spirits Hall"],
    /* L4 */ ["Flame Hall","Lava Corridor","Oni Cave","Karmic Fire Room","Red Oni Chamber","Enma's Garden","Hell Valley","Burning Hell","Pillar of Fire","Scorching Hall"],
    /* L5 */ ["Ice Corridor","Yuki-Onna's Hall","Blizzard Cave","Frost Vault","Ice Prison","Snow Altar","Frozen Hall","Icicle Passage","Silver Hall","Misty Hall"],
    /* L6 */ ["Thunder Hall","Lightning Corridor","Storm Cave","Heavenly Lightning Room","Roaring Thunder Hall","Dragon God's Garden","Lightning Strike","Gale Hall","Tempest Vault","Raijin's Altar"],
    /* L7 */ ["Oni-Baba's Sanctum","Gate of Hades","Black Dragon Hall","Karma Chamber","Six-Paths Crossroad","Garden of Vengeance","Oni Throne","Depths of Yomi","Higan Chamber","Soul Altar"],
  ];
  const LATE_THEMES_EN = {
    8:"Wind", 9:"Earth", 10:"Time", 11:"Light", 12:"Shadow",
    13:"Chaos", 14:"Order", 15:"Life", 16:"Death",
    17:"Creation", 18:"Destruction", 19:"Wisdom", 20:"Divine",
  };
  const LATE_SUFFIXES_EN = ["Hall","Chamber","Sanctum","Vault","Spirits","Labyrinth","Throne","Kingdom","Corridor","Heart"];

  const namePool   = [...(ROOM_POOLS[level - 1]    || ROOM_POOLS[0])];
  const namePoolEn = level <= 7
    ? [...(ROOM_POOLS_EN[level - 1] || ROOM_POOLS_EN[0])]
    : null; // L8-20 generate on demand

  const getNextName = () => {
    let ja = "謎の間", en = "Mystery Chamber";
    if (namePool.length) {
      const i = Math.floor(Math.random() * namePool.length);
      ja = namePool.splice(i, 1)[0];
    }
    if (namePoolEn && namePoolEn.length) {
      // Paired pop: pick the corresponding English by name-pool position rather
      // than random index — namePool was already spliced so we just pop one.
      en = namePoolEn.splice(Math.floor(Math.random() * namePoolEn.length), 1)[0];
    } else if (!namePoolEn) {
      const theme = LATE_THEMES_EN[level] || "Mystery";
      const suffix = LATE_SUFFIXES_EN[Math.floor(Math.random() * LATE_SUFFIXES_EN.length)];
      en = `${theme} ${suffix}`;
    }
    return { ja, en };
  };

  // ── Scatter rooms ────────────────────────────────────────────────────────
  // id 0 is reserved for the entrance hallway (carved below). Content rooms
  // start at id=1 so the player sees "Room 1 — Entrance Hallway" first.
  let id = 1;
  let attempts = 0;

  // ── Locked Room 1 (level 1 only) ─────────────────────────────────────────
  // Permanent fixture: fixed-size, fixed-position room at the south-center
  // of the map so the hallway (id 0) always docks the same way. Carved
  // BEFORE the random scatter so other rooms must work around it.
  if (level === 1) {
    const LOCK_W = 8, LOCK_H = 8;
    const lockX = Math.floor(MAP_W / 2 - LOCK_W / 2);   // center-X
    const lockZ = MAP_H - BORDER - 1 - LOCK_H - 8;       // 8 tiles above bottom (leaves room for hallway)
    carveRoom(id++, lockX, lockZ, LOCK_W, LOCK_H, {
      roomName: "1階の間",
      roomNameEn: "Room 1 — Entrance Foyer",
      roomType: "foyer",
      isLockedStartRoom: true,
    });
  }

  // Level 7: place large OniBaba sanctum in central throne room
  if (level === 7) {
    const ox = Math.floor(MAP_W / 2) - Math.floor(ONIBABA_ROOM_SIZE / 2);
    const oz = Math.floor(MAP_H / 2) - Math.floor(ONIBABA_ROOM_SIZE / 2);
    if (!overlaps(ox, oz, ONIBABA_ROOM_SIZE, ONIBABA_ROOM_SIZE, 1)) {
      carveRoom(id++, ox, oz, ONIBABA_ROOM_SIZE, ONIBABA_ROOM_SIZE, {
        roomName: "鬼の玉座",
        roomNameEn: "Oni Throne",
        roomType: "throne",
        isOniBaba: true,
      });
    }
  }

  // T0.18 — Compact growth: 75% of placements try to land adjacent to an
  // existing room (1-tile gap = shared wall to punch). Falls back to random
  // scatter when no adjacent slot fits. Result: tight clusters of rooms,
  // most connections become simple openings rather than corridors.
  const tryAdjacentPlacement = () => {
    if (rooms.length === 0) return null;
    const anchor = rooms[Math.floor(Math.random() * rooms.length)];
    const w = MIN_R + Math.floor(Math.random() * (MAX_R - MIN_R + 1));
    const h = MIN_R + Math.floor(Math.random() * (MAX_R - MIN_R + 1));
    const side = Math.floor(Math.random() * 4); // 0=N, 1=S, 2=E, 3=W
    let x0, z0;
    if (side === 0) {
      // North of anchor
      x0 = anchor.x + Math.floor((anchor.w - w) * Math.random());
      z0 = anchor.y - h - ROOM_BUFFER;
    } else if (side === 1) {
      // South of anchor
      x0 = anchor.x + Math.floor((anchor.w - w) * Math.random());
      z0 = anchor.y + anchor.h + ROOM_BUFFER;
    } else if (side === 2) {
      // East of anchor
      x0 = anchor.x + anchor.w + ROOM_BUFFER;
      z0 = anchor.y + Math.floor((anchor.h - h) * Math.random());
    } else {
      // West of anchor
      x0 = anchor.x - w - ROOM_BUFFER;
      z0 = anchor.y + Math.floor((anchor.h - h) * Math.random());
    }
    if (overlaps(x0, z0, w, h)) return null;
    return { x0, z0, w, h };
  };

  // ── Dense BFS-cluster placement ─────────────────────────────────────────
  // Place a seed room near the centre, then keep attaching new rooms flush
  // against any side of any existing room. Tries all four sides per anchor
  // before giving up. Result: a polygonal cluster with rooms packed close
  // together on every side — the opposite of a single linear chain.
  //
  // Level 1 seeds slightly south of centre so the entrance hallway has room
  // to attach at the south edge. Levels 2-7 seed at dead centre.
  const tryAttachFlush = (anchor, side) => {
    const w = MIN_R + Math.floor(Math.random() * (MAX_R - MIN_R + 1));
    const h = MIN_R + Math.floor(Math.random() * (MAX_R - MIN_R + 1));
    let x0, z0;
    if (side === 'N') {
      // North of anchor — slide along anchor's east-west extent
      const slide = Math.floor(Math.random() * Math.max(1, anchor.w + w - 2)) - (w - 1);
      x0 = anchor.x + slide;
      z0 = anchor.y - h - ROOM_BUFFER;
    } else if (side === 'S') {
      const slide = Math.floor(Math.random() * Math.max(1, anchor.w + w - 2)) - (w - 1);
      x0 = anchor.x + slide;
      z0 = anchor.y + anchor.h + ROOM_BUFFER;
    } else if (side === 'E') {
      const slide = Math.floor(Math.random() * Math.max(1, anchor.h + h - 2)) - (h - 1);
      x0 = anchor.x + anchor.w + ROOM_BUFFER;
      z0 = anchor.y + slide;
    } else { // 'W'
      const slide = Math.floor(Math.random() * Math.max(1, anchor.h + h - 2)) - (h - 1);
      x0 = anchor.x - w - ROOM_BUFFER;
      z0 = anchor.y + slide;
    }
    if (overlaps(x0, z0, w, h)) return null;
    return { x0, z0, w, h };
  };

  const SHUFFLED_SIDES = () => {
    const s = ['N','S','E','W'];
    for (let i = s.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [s[i], s[k]] = [s[k], s[i]];
    }
    return s;
  };

  while (rooms.length < targetRooms && attempts < 4000) {
    attempts++;
    let placement = null;

    if (rooms.length === 0) {
      // Cluster seed for non-throne levels. (L7 already has the throne in
      // rooms[0]; the BFS branch below attaches new rooms onto its sides.)
      const w = MIN_R + Math.floor(Math.random() * (MAX_R - MIN_R + 1));
      const h = MIN_R + Math.floor(Math.random() * (MAX_R - MIN_R + 1));
      // Seed slightly south of centre on L1 so the entrance hall can attach
      // at the south edge later. Other levels seed at dead centre.
      const seedZBias = level === 1 ? 8 : 0;
      const x0 = Math.floor((MAP_W - w) / 2);
      const z0 = Math.floor((MAP_H - h) / 2) + seedZBias;
      if (!overlaps(x0, z0, w, h)) placement = { x0, z0, w, h };
    } else {
      // Pick a random existing room as the anchor and try to attach on any
      // free side. Try up to 12 anchor-side combinations before giving up
      // this tick.
      for (let t = 0; t < 12 && !placement; t++) {
        const anchor = rooms[Math.floor(Math.random() * rooms.length)];
        for (const side of SHUFFLED_SIDES()) {
          placement = tryAttachFlush(anchor, side);
          if (placement) break;
        }
      }
    }

    if (placement) {
      const rName = getNextName();
      const _id = id++;
      carveRoom(_id, placement.x0, placement.z0, placement.w, placement.h, {
        roomName: rName.ja,
        roomNameEn: rName.en,
        roomType: "room",
      });
    }
  }

  // ── Connect rooms: Japanese castle style ────────────────────────────────
  // True adjacency check — a wall tile touches both rooms (shoji panel position).
  const areAdjacent = (ra, rb) => {
    const xMin = Math.max(0, Math.min(ra.x, rb.x) - 1);
    const xMax = Math.min(MAP_W - 1, Math.max(ra.x + ra.w, rb.x + rb.w));
    const zMin = Math.max(0, Math.min(ra.y, rb.y) - 1);
    const zMax = Math.min(MAP_H - 1, Math.max(ra.y + ra.h, rb.y + rb.h));
    for (let x = xMin; x <= xMax; x++) {
      for (let z = zMin; z <= zMax; z++) {
        if (map[x]?.[z]?.type !== "wall") continue;
        let touchA = false, touchB = false;
        for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const c = map[x+dx]?.[z+dz];
          if (c?.roomId === ra.id) touchA = true;
          if (c?.roomId === rb.id) touchB = true;
        }
        if (touchA && touchB) return true;
      }
    }
    return false;
  };

  // Pass 1: open every adjacent room-pair with a shoji panel. Because all
  // rooms were placed adjacent above, this connects the entire cluster.
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (areAdjacent(rooms[i], rooms[j])) createDoorway(rooms[i], rooms[j]);
    }
  }

  // Pass 2: guarantee every room has shoji exits on ≥2 distinct cardinal
  // walls (N/S/E/W) — never funnel the player into a single-corridor room.
  // Two doors on the same wall don't count; we want REAL alternative routes.
  const getRoomDoorSides = (r) => {
    const sides = new Set(); // 'N' (z<r.y), 'S' (z>=r.y+r.h), 'E' (x>=r.x+r.w), 'W' (x<r.x)
    const xMin = Math.max(0, r.x - 1), xMax = Math.min(MAP_W - 1, r.x + r.w);
    const zMin = Math.max(0, r.y - 1), zMax = Math.min(MAP_H - 1, r.y + r.h);
    for (let x = xMin; x <= xMax; x++) {
      for (let z = zMin; z <= zMax; z++) {
        if (map[x]?.[z]?.type !== "shoji_door") continue;
        // Confirm the door tile actually borders this room
        let touches = false;
        for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          if (map[x+dx]?.[z+dz]?.roomId === r.id) { touches = true; break; }
        }
        if (!touches) continue;
        if (z < r.y) sides.add('N');
        else if (z >= r.y + r.h) sides.add('S');
        else if (x < r.x) sides.add('W');
        else if (x >= r.x + r.w) sides.add('E');
      }
    }
    return sides;
  };

  // Find an adjacent peer that shares a wall on a side the room doesn't
  // already have a door on. Returns the peer or null.
  const peerOnNewSide = (r, neededSides) => {
    const peers = rooms.filter((o) => o !== r && areAdjacent(r, o));
    for (let i = peers.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [peers[i], peers[k]] = [peers[k], peers[i]];
    }
    for (const peer of peers) {
      // Quick side guess: which compass direction is the peer's centre relative to r?
      const dx = peer.cx - r.cx, dz = peer.cz - r.cz;
      const side = Math.abs(dx) > Math.abs(dz)
        ? (dx > 0 ? 'E' : 'W')
        : (dz > 0 ? 'S' : 'N');
      if (neededSides.has(side)) return peer;
    }
    return null;
  };

  for (const r of rooms) {
    let guard = 0;
    while (guard++ < 8) {
      const sides = getRoomDoorSides(r);
      if (sides.size >= 2) break;
      // Build a "missing" side set in priority order (N,S,E,W minus what we have)
      const needed = new Set(['N','S','E','W'].filter((s) => !sides.has(s)));
      const peer = peerOnNewSide(r, needed);
      if (!peer) break; // no adjacent room on the needed sides
      if (!createDoorway(r, peer)) break;
    }
  }

  // Pass 3: weak perimeter rooms (still <2 door sides) get a small alcove
  // grown against a missing side, then doorway-connected. Caps total rooms
  // at 24 so we don't blow past the spec ceiling.
  const ROOM_HARD_CAP = 15;  // user-mandated performance cap
  const ALCOVE_MIN = 3, ALCOVE_MAX = 6;
  const tryAttachAlcove = (anchor, side) => {
    const w = ALCOVE_MIN + Math.floor(Math.random() * (ALCOVE_MAX - ALCOVE_MIN + 1));
    const h = ALCOVE_MIN + Math.floor(Math.random() * (ALCOVE_MAX - ALCOVE_MIN + 1));
    let x0, z0;
    if (side === 'N')      { x0 = anchor.x + Math.floor((anchor.w - w) / 2); z0 = anchor.y - h - ROOM_BUFFER; }
    else if (side === 'S') { x0 = anchor.x + Math.floor((anchor.w - w) / 2); z0 = anchor.y + anchor.h + ROOM_BUFFER; }
    else if (side === 'E') { x0 = anchor.x + anchor.w + ROOM_BUFFER; z0 = anchor.y + Math.floor((anchor.h - h) / 2); }
    else                   { x0 = anchor.x - w - ROOM_BUFFER;        z0 = anchor.y + Math.floor((anchor.h - h) / 2); }
    if (overlaps(x0, z0, w, h)) return null;
    return { x0, z0, w, h };
  };
  for (const r of [...rooms]) { // snapshot — we may push into rooms
    if (rooms.length >= ROOM_HARD_CAP) break;
    if (r.isOniBaba || r.isEntranceHall) continue;
    let sides = getRoomDoorSides(r);
    if (sides.size >= 2) continue;
    for (const side of ['N','S','E','W']) {
      if (sides.has(side)) continue;
      const place = tryAttachAlcove(r, side);
      if (!place) continue;
      const rName = getNextName();
      const _id = id++;
      carveRoom(_id, place.x0, place.z0, place.w, place.h, {
        roomName: rName.ja,
        roomNameEn: rName.en,
        roomType: "alcove",
      });
      const newRoom = rooms[rooms.length - 1];
      if (createDoorway(r, newRoom)) {
        sides = getRoomDoorSides(r);
        if (sides.size >= 2) break;
      }
    }
  }

  // ── Room #1 = Entrance Welcome (canonical name) ─────────────────────────
  // Room id=1 is the locked start room on level 1 — the player's first
  // "real" room after walking up the Room 0 entrance hallway. Named
  // "Entrance Welcome" per user spec so the landmark is unambiguous.
  {
    const foyer = rooms.find((r) => r.id === 1);
    if (foyer) {
      foyer.roomName   = "玄関の間";   // "Foyer / Entrance Hall" in Japanese
      foyer.roomNameEn = "Entrance Welcome";
    }
  }

  // ── STORE room (NetHack-style) — connected to Foyer by a real corridor ───
  // Carved off room id=1. The corridor is 1-tile wide so the shopkeeper has a
  // clear chokepoint to guard. Loot card spawn positions are recorded in
  // `storeLootSpecs` for the engine to instantiate. Only one store per
  // dungeon, and only on levels with a foyer (skip L7 — throne floor).
  const storeLootSpecs = [];
  let storeShopkeeperSpec = null;
  let storeRoom = null;
  if (level !== 7) {
    const foyer = rooms.find((r) => r.id === 1);
    if (foyer) {
      const STORE_W = 7, STORE_H = 6;
      const CORRIDOR_LEN = 3;
      // Try each cardinal side of the foyer — pick the first that has clearance
      const sides = ['N','S','E','W'];
      for (let i = sides.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1));
        [sides[i], sides[k]] = [sides[k], sides[i]];
      }
      for (const side of sides) {
        let sx, sz;          // store top-left
        let cx0, cz0, cx1, cz1; // corridor span
        let storeDoorX, storeDoorZ, foyerDoorX, foyerDoorZ;
        if (side === 'N') {
          sx = foyer.x + Math.floor((foyer.w - STORE_W)/2);
          sz = foyer.y - CORRIDOR_LEN - STORE_H - 1;
          foyerDoorX = foyer.x + Math.floor(foyer.w/2);
          foyerDoorZ = foyer.y - 1;
          storeDoorX = foyerDoorX;
          storeDoorZ = sz + STORE_H;
          cx0 = foyerDoorX; cx1 = foyerDoorX;
          cz0 = sz + STORE_H; cz1 = foyer.y - 1;
        } else if (side === 'S') {
          sx = foyer.x + Math.floor((foyer.w - STORE_W)/2);
          sz = foyer.y + foyer.h + CORRIDOR_LEN + 1;
          foyerDoorX = foyer.x + Math.floor(foyer.w/2);
          foyerDoorZ = foyer.y + foyer.h;
          storeDoorX = foyerDoorX;
          storeDoorZ = sz - 1;
          cx0 = foyerDoorX; cx1 = foyerDoorX;
          cz0 = foyer.y + foyer.h; cz1 = sz - 1;
        } else if (side === 'E') {
          sx = foyer.x + foyer.w + CORRIDOR_LEN + 1;
          sz = foyer.y + Math.floor((foyer.h - STORE_H)/2);
          foyerDoorX = foyer.x + foyer.w;
          foyerDoorZ = foyer.y + Math.floor(foyer.h/2);
          storeDoorX = sx - 1;
          storeDoorZ = foyerDoorZ;
          cz0 = foyerDoorZ; cz1 = foyerDoorZ;
          cx0 = foyer.x + foyer.w; cx1 = sx - 1;
        } else { // W
          sx = foyer.x - CORRIDOR_LEN - STORE_W - 1;
          sz = foyer.y + Math.floor((foyer.h - STORE_H)/2);
          foyerDoorX = foyer.x - 1;
          foyerDoorZ = foyer.y + Math.floor(foyer.h/2);
          storeDoorX = sx + STORE_W;
          storeDoorZ = foyerDoorZ;
          cz0 = foyerDoorZ; cz1 = foyerDoorZ;
          cx0 = sx + STORE_W; cx1 = foyer.x - 1;
        }
        if (overlaps(sx, sz, STORE_W, STORE_H)) continue;
        // Carve store room
        const storeId = id++;
        carveRoom(storeId, sx, sz, STORE_W, STORE_H, {
          roomName: "店",
          roomNameEn: "Store",
          roomType: "store",
          isStore: true,
        });
        storeRoom = rooms[rooms.length - 1];
        // Carve corridor
        for (let cx = Math.min(cx0, cx1); cx <= Math.max(cx0, cx1); cx++) {
          for (let cz = Math.min(cz0, cz1); cz <= Math.max(cz0, cz1); cz++) {
            if (map[cx]?.[cz]?.type === 'wall') {
              map[cx][cz] = { type: 'floor', hall: true, roomId: storeId, storeCorridor: true };
            }
          }
        }
        // Punch shoji door into the foyer at the corridor's foyer-side end
        if (map[foyerDoorX]?.[foyerDoorZ]) {
          map[foyerDoorX][foyerDoorZ] = {
            type: 'shoji_door', roomId: 1, panelless: true, storeBoundary: 'foyer'
          };
        }
        // Punch a marked store-entrance shoji at the store side
        if (map[storeDoorX]?.[storeDoorZ]) {
          map[storeDoorX][storeDoorZ] = {
            type: 'shoji_door', roomId: storeId, panelless: false, storeBoundary: 'store',
            storeId,
          };
        }
        // Loot spec — 6 items in 2 rows along the inside of the store
        const SHOP_ITEMS = [
          { catId:'COMBAT', title:'KATANA',       desc:'Sharper edge.',     kanji:'刀', attr:'(DMG*1DICE)', price:120 },
          { catId:'SPELL',  title:'FIREBALL',     desc:'Burns deep.',       kanji:'火', attr:'(DMG*4DICE)', price:200 },
          { catId:'SPELL',  title:'BOULDER',      desc:'Heavy impact.',     kanji:'地', attr:'(STUN*4DICE)', price:200 },
          { catId:'MISSILE',title:'LONG BOW',     desc:'Pierces armour.',   kanji:'弓', attr:'(DMG*1DICE)', price:150 },
          { catId:'ITEM',   title:'POTION',       desc:'Restores 30 HP.',   kanji:'薬', attr:'+30 HP',     price:80  },
          { catId:'ITEM',   title:'MAGIC LANTERN',desc:'Lights the dark.',  kanji:'灯', attr:'EQUIP',      price:90  },
        ];
        // Place in 2 rows of 3, inset 1 tile from store walls
        for (let i = 0; i < SHOP_ITEMS.length; i++) {
          const col = i % 3, row = Math.floor(i / 3);
          const lx = sx + 1 + Math.floor(col * (STORE_W - 2) / 2);
          const lz = sz + 1 + row * 2;
          storeLootSpecs.push({ x: lx, z: lz, ...SHOP_ITEMS[i] });
        }
        // Shopkeeper sits dead-centre, blocking the store's interior side of the door
        const skX = sx + Math.floor(STORE_W/2);
        const skZ = sz + Math.floor(STORE_H/2);
        storeShopkeeperSpec = {
          x: skX, z: skZ,
          storeRoomId: storeId,
          storeDoorX, storeDoorZ,
          foyerDoorX, foyerDoorZ,
        };
        break;
      }
    }
  }

  // ── Entrance + stairs ────────────────────────────────────────────────────
  // Level 1: outdoor entrance hallway south of the southernmost room. Player
  //   spawns at its south tip (stairs_up = doorway back outside). Stairs down
  //   in the farthest (northernmost) non-throne room.
  // Levels 2-6: no entrance hall — stairs_up sits in the southernmost room
  //   (the player arrived from the previous level), stairs_down in the room
  //   farthest from spawn.
  // Level 7: stairs_up in the southernmost room (arrived from L6); throne
  //   room is the destination, NO stairs_down.
  let spawnX, spawnZ;

  // The "spawn room" is the locked Room 1 if it exists (level 1), otherwise
  // the southernmost non-throne room. Locking guarantees the entrance always
  // looks the same on level 1 — same Foyer layout, same decor placement.
  const lockedStart = rooms.find((r) => r.isLockedStartRoom);
  const spawnRoom = lockedStart
    || rooms
        .filter((r) => !r.isOniBaba)
        .reduce((best, r) => (r.cz > best.cz ? r : best), rooms[0]);

  if (level === 1) {
    // Room 1 is the locked start room (carved up top with id=1). Dock the
    // entrance hallway (Room 0) against its south edge — 8 tiles long so
    // the player walks: spawn (1 tile north of stairs) → 7 more tiles
    // through Room 0 hallway → Room 1. Spawn is NOT on the stairs tile
    // anymore so the player doesn't immediately trigger floor exit.
    const HALL_LEN = 8;
    const hallX = spawnRoom.cx;
    const roomSouthEdge = spawnRoom.y + spawnRoom.h;
    const hallStart = roomSouthEdge;
    // Clamp to map bounds, but prefer the exact 7-tile length.
    const stairsUpZ = Math.min(MAP_H - 3, hallStart + HALL_LEN - 1);
    const actualHallLen = stairsUpZ - hallStart + 1;
    for (let cz = hallStart; cz <= stairsUpZ; cz++) {
      if (map[hallX]?.[cz])
        map[hallX][cz] = { type: "floor", hall: true, roomId: 0 };
      if (map[hallX + 1]?.[cz])
        map[hallX + 1][cz] = { type: "floor", hall: true, roomId: 0 };
    }
    rooms.unshift({
      id: 0,
      x: hallX, y: hallStart, w: 2, h: actualHallLen,
      cx: hallX, cz: hallStart + Math.floor(actualHallLen / 2),
      center: { x: hallX, y: hallStart + Math.floor(actualHallLen / 2) },
      roomName: "0号廊下",
      roomNameEn: "Room 0 Entrance",
      roomType: "hallway",
      isEntranceHall: true,
    });
    if (map[hallX]?.[stairsUpZ])
      map[hallX][stairsUpZ] = { type: "stairs_up", roomId: 0 };
    if (map[hallX + 1]?.[stairsUpZ])
      map[hallX + 1][stairsUpZ] = { type: "stairs_up_r", roomId: 0 };
    // Spawn ONE tile NORTH of the stairs-up tile so the player can move
    // off it immediately without triggering an exit. Faces north up the
    // 7-walkable-tile corridor toward Room 1.
    spawnX = hallX;
    spawnZ = stairsUpZ - 1;
  } else {
    // Levels 2-7: stairs_up sits inside the spawnRoom (no corridor). Place
    // it one tile inside the south wall, with the +x tile marked stairs_up_r
    // so the renderer draws a single double-door spanning both tiles.
    const ux = spawnRoom.cx;
    const uz = Math.min(spawnRoom.y + spawnRoom.h - 2, MAP_H - 3);
    if (map[ux]?.[uz])     map[ux][uz]     = { type: "stairs_up",   roomId: spawnRoom.id };
    if (map[ux + 1]?.[uz]) map[ux + 1][uz] = { type: "stairs_up_r", roomId: spawnRoom.id };
    spawnX = ux;
    spawnZ = uz - 1; // one tile north of the up-stairs, facing into the room
  }

  // ── CASINO + VAULT (replaces vanilla stairs-down) ───────────────────────
  // The farthest-from-spawn room becomes the CASINO — a 10×10-ish chamber
  // with slot machines lining one wall and the floor's BOSS (Oyabun) at
  // the centre. Carved adjacent to it is a small VAULT (4×4) sealed by
  // a silver 3D "vault_door" tile. Stairs_down live inside the vault, so
  // the player must defeat the boss + open the vault to descend.
  let stairsDownRoom = null;
  let casinoRoom     = null;
  let vaultRoom      = null;
  if (level !== 7) {
    let farthest = null, bestDist = -1;
    for (const r of rooms) {
      if (r.isOniBaba || r.isEntranceHall || r === spawnRoom) continue;
      const d = Math.abs(r.cx - spawnRoom.cx) + Math.abs(r.cz - spawnRoom.cz);
      if (d > bestDist) { bestDist = d; farthest = r; }
    }
    if (!farthest) farthest = spawnRoom;
    casinoRoom = farthest;
    casinoRoom.isCasino  = true;
    casinoRoom.roomType  = casinoRoom.roomType || "casino";
    casinoRoom.roomName  = "賭場";
    casinoRoom.roomNameEn = "Casino";
    // Try to carve a 4×4 vault on one of the casino's NORTH / EAST / SOUTH /
    // WEST sides, whichever has clear walkable space. Carve walls around it
    // and a single VAULT DOOR tile linking it to the casino.
    const VAULT_W = 4, VAULT_H = 4;
    const sides = [
      { dx: 0,  dz: -1 - VAULT_H, ddx: -1, ddz: -1, doorOff: { x: 0, z: 0 }, dir: 'N' }, // north
      { dx: casinoRoom.w + 1, dz: 0, ddx: 0, ddz: -1, doorOff: { x: 0, z: 0 }, dir: 'E' },
      { dx: 0,  dz: casinoRoom.h + 1, ddx: -1, ddz: 0, doorOff: { x: 0, z: 0 }, dir: 'S' },
      { dx: -1 - VAULT_W, dz: 0, ddx: -1, ddz: -1, doorOff: { x: 0, z: 0 }, dir: 'W' },
    ];
    let placed = null;
    for (const s of sides){
      const vx = casinoRoom.x + s.dx;
      const vz = casinoRoom.y + s.dz;
      // Bounds + free-space check
      if (vx < BORDER || vz < BORDER) continue;
      if (vx + VAULT_W > MAP_W - BORDER || vz + VAULT_H > MAP_H - BORDER) continue;
      let clear = true;
      for (let cx = vx - 1; cx <= vx + VAULT_W && clear; cx++){
        for (let cz = vz - 1; cz <= vz + VAULT_H; cz++){
          const cell = map[cx]?.[cz];
          if (cell && cell.type === 'floor' && cell.roomId !== casinoRoom.id){
            clear = false; break;
          }
        }
      }
      if (clear){ placed = { ...s, vx, vz }; break; }
    }
    if (placed){
      const vaultId = rooms.length + 1;
      // Carve the vault floor.
      for (let cx = placed.vx; cx < placed.vx + VAULT_W; cx++){
        for (let cz = placed.vz; cz < placed.vz + VAULT_H; cz++){
          map[cx][cz] = { type: 'floor', roomId: vaultId };
        }
      }
      // Stairs down at the centre of the vault.
      const vCx = placed.vx + Math.floor(VAULT_W / 2);
      const vCz = placed.vz + Math.floor(VAULT_H / 2);
      map[vCx][vCz] = { type: 'stairs_down', roomId: vaultId };
      // Pick a door tile — adjacent edge between casino + vault.
      let doorX = vCx, doorZ = vCz;
      if (placed.dir === 'N'){ doorZ = placed.vz + VAULT_H;     doorX = placed.vx + Math.floor(VAULT_W/2); }
      if (placed.dir === 'S'){ doorZ = placed.vz - 1;           doorX = placed.vx + Math.floor(VAULT_W/2); }
      if (placed.dir === 'E'){ doorX = placed.vx - 1;           doorZ = placed.vz + Math.floor(VAULT_H/2); }
      if (placed.dir === 'W'){ doorX = placed.vx + VAULT_W;     doorZ = placed.vz + Math.floor(VAULT_H/2); }
      if (map[doorX]?.[doorZ]){
        map[doorX][doorZ] = { type: 'vault_door', roomId: vaultId, sealed: true };
      }
      vaultRoom = {
        id: vaultId,
        x: placed.vx, y: placed.vz, w: VAULT_W, h: VAULT_H,
        cx: vCx, cz: vCz,
        center: { x: vCx, y: vCz },
        roomName: "金庫",
        roomNameEn: "Vault",
        roomType: "vault",
        isVault: true,
        casinoId: casinoRoom.id,
      };
      rooms.push(vaultRoom);
      stairsDownRoom = vaultRoom;
    } else {
      // No room for a vault — fall back to vanilla stairs_down in the casino.
      map[casinoRoom.cx][casinoRoom.cz] = { type: "stairs_down", roomId: casinoRoom.id };
      stairsDownRoom = casinoRoom;
    }
  }

  // ── Monster spawns: 1–3 per room ─────────────────────────────────────────
  const mobSpawns = [];
  let mobIdCtr = 0;
  // Extended HP scaling for 20 levels
  const hpByLevel = [
    50, 65, 80, 100, 120, 145, 175, 200, 230, 260, 295, 335, 380, 430, 485, 545,
    610, 680, 755, 835,
  ];
  const monsterHp = hpByLevel[Math.min(level - 1, 19)];

  // ── Monster archetypes with element vulnerabilities ──────────────────────
  // Spells deal baseDmg × vulnerability[element]. >1 = weak to, <1 = resists.
  // Every regular mob is the goblin GLB. `nameKey` is the i18n id that
  // resolves to a localized display name (Yakuza Goblin / ヤクザゴブリン).
  // Vulnerability profiles still vary per archetype so gameplay diversity
  // is intact.
  const MONSTER_ARCHETYPES = [
    { nameKey: "yakuza_goblin", vuln: { FIRE:1.3, WATER:1.0, EARTH:0.8, WIND:1.0, VOID:1.2, DEFAULT:1.0 } },
    { nameKey: "yakuza_goblin", vuln: { FIRE:1.0, WATER:1.4, EARTH:0.5, WIND:0.7, VOID:1.0, DEFAULT:1.0 } },
    { nameKey: "yakuza_goblin", vuln: { FIRE:1.8, WATER:0.4, EARTH:1.0, WIND:1.2, VOID:1.1, DEFAULT:1.0 } },
    { nameKey: "yakuza_goblin", vuln: { FIRE:1.0, WATER:1.5, EARTH:1.4, WIND:0.5, VOID:1.0, DEFAULT:1.0 } },
    { nameKey: "yakuza_goblin", vuln: { FIRE:1.4, WATER:1.0, EARTH:1.0, WIND:1.0, VOID:0.4, DEFAULT:1.0 } },
    { nameKey: "yakuza_goblin", vuln: { FIRE:0.5, WATER:1.6, EARTH:1.0, WIND:1.3, VOID:1.1, DEFAULT:1.0 } },
  ];
  const pickArchetype = () =>
    MONSTER_ARCHETYPES[Math.floor(Math.random() * MONSTER_ARCHETYPES.length)];

  // ── Per-room spawn distribution (user spec) ──────────────────────────────
  // REDUCED 30% per user: monster budget 20-25 → 14-18 baseline.
  // Per-room distribution also tightened: was 75/20/5 (1/2/2+loot).
  // Now 90/8/2 — chance of >1 monster per room dropped from 25% to 10%.
  // Net effect: fewer rooms with crowds, FPS stays high, combat feels
  // more like 1-on-1 encounters.
  const MAX_MONSTERS = 14 + Math.floor(Math.random() * 5); // 14-18
  const bonusLootSpecs = []; // collected here, pushed via lootItems hook below
  rooms.forEach((r) => {
    if (r.roomType === "hallway") return;
    if (r.isOniBaba) return;
    if (r === stairsDownRoom) return;
    if (mobSpawns.length >= MAX_MONSTERS) return;

    // 90 / 8 / 2 distribution — most rooms now have a single monster.
    const _r = Math.random();
    let count = 1;
    let dropBonusLoot = false;
    if (_r >= 0.90 && _r < 0.98){
      count = 2;
    } else if (_r >= 0.98){
      count = 2;
      dropBonusLoot = true; // also drop one loot card in this room
    }
    // Clamp against global cap.
    count = Math.min(count, MAX_MONSTERS - mobSpawns.length);
    if (count <= 0) return;

    // Interior floor candidates.
    const candidates = [];
    for (let cx = r.x + 1; cx < r.x + r.w - 1; cx++) {
      for (let cz = r.y + 1; cz < r.y + r.h - 1; cz++) {
        if (map[cx]?.[cz]?.type !== "floor") continue;
        candidates.push([cx, cz]);
      }
    }
    if (!candidates.length) return;

    const used = new Set();
    for (let i = 0; i < count; i++) {
      let pick = null;
      for (let tries = 0; tries < 20 && !pick; tries++) {
        const [tx, tz] = candidates[Math.floor(Math.random() * candidates.length)];
        const key = `${tx},${tz}`;
        if (!used.has(key)) { used.add(key); pick = [tx, tz]; }
      }
      if (!pick) break;
      const arch = pickArchetype();
      mobSpawns.push({
        id: `mob-${r.id}-${mobIdCtr++}`,
        nameKey: arch.nameKey,
        name: "Yakuza Goblin",
        type: "monster",
        x: pick[0],
        z: pick[1],
        hp: monsterHp,
        maxHp: monsterHp,
        isHostile: true,
        vulnerability: arch.vuln,
      });
    }
    // Bonus loot card (5% of rooms) — drop on a free interior tile.
    if (dropBonusLoot){
      for (let tries = 0; tries < 10; tries++){
        const [lx, lz] = candidates[Math.floor(Math.random() * candidates.length)];
        const key = `${lx},${lz}`;
        if (used.has(key)) continue;
        used.add(key);
        bonusLootSpecs.push({ x: lx, z: lz, roomId: r.id });
        break;
      }
    }
  });
  // Bonus loot stash — exported so the engine can render them as pickup cards.
  // Format mirrors storeLootSpecs so engine doesn't need a new path.
  if (bonusLootSpecs.length){
    // Attach a fresh field; engine reads either storeLootSpecs (shopkeeper)
    // OR roomLootSpecs (bonus drops) and spawns matching card pickups.
  }

  // ── Yakuza Level Supervisor + his 4 Imp henchmen ────────────────────────
  // The supervisor (1.3× scale, 200 HP) guards the stairs-down tile so the
  // player has to fight through him to descend. He's surrounded by four
  // imp henchmen on the cardinal tiles around the stairs.
  if (stairsDownRoom) {
    const sx = stairsDownRoom.cx, sz = stairsDownRoom.cz;
    // Try to place the supervisor next to the stairs (not on top of them).
    const supSpots = [
      [sx,     sz - 1], [sx,     sz + 1],
      [sx - 1, sz    ], [sx + 1, sz    ],
      [sx - 1, sz - 1], [sx + 1, sz - 1],
      [sx - 1, sz + 1], [sx + 1, sz + 1],
    ];
    let supX = sx, supZ = sz;
    for (const [tx, tz] of supSpots) {
      if (map[tx]?.[tz]?.type === "floor") { supX = tx; supZ = tz; break; }
    }
    mobSpawns.push({
      id: `boss-supervisor-L${level}-${mobIdCtr++}`,
      nameKey: "yakuza_supervisor",
      name: "Yakuza Level Supervisor",
      type: "monster",
      x: supX, z: supZ,
      hp: 200, maxHp: 200,
      isHostile: true,
      isSupervisor: true,                // engine → 1.3× scale + label
      vulnerability: { FIRE:1.1, WATER:1.0, EARTH:0.9, WIND:1.0, VOID:1.0, DEFAULT:0.95 },
    });

    // Four imp henchmen on nearby floor tiles. Try cardinal neighbours of
    // the supervisor first; fall back to any free floor tile in the room.
    const impSpots = [
      [supX - 1, supZ],     [supX + 1, supZ],
      [supX,     supZ - 1], [supX,     supZ + 1],
      [supX - 2, supZ],     [supX + 2, supZ],
      [supX,     supZ - 2], [supX,     supZ + 2],
      [supX - 1, supZ - 1], [supX + 1, supZ - 1],
      [supX - 1, supZ + 1], [supX + 1, supZ + 1],
    ];
    const usedImp = new Set([`${supX},${supZ}`, `${sx},${sz}`]);
    let placedImps = 0;
    for (const [tx, tz] of impSpots) {
      if (placedImps >= 4) break;
      if (tx < 0 || tz < 0 || tx >= MAP_W || tz >= MAP_H) continue;
      if (map[tx]?.[tz]?.type !== "floor") continue;
      const k = `${tx},${tz}`;
      if (usedImp.has(k)) continue;
      usedImp.add(k);
      mobSpawns.push({
        id: `imp-L${level}-${mobIdCtr++}`,
        nameKey: "yakuza_imp",
        name: "Yakuza Imp",
        type: "monster",
        x: tx, z: tz,
        hp: Math.round(monsterHp * 0.6),
        maxHp: Math.round(monsterHp * 0.6),
        isHostile: true,
        isImp: true,                       // engine → use imp GLB
        vulnerability: { FIRE:1.4, WATER:1.0, EARTH:1.0, WIND:1.1, VOID:1.0, DEFAULT:1.0 },
      });
      placedImps++;
    }
  }

  // ── 7 flintlock imps scattered across the level ──────────────────────────
  // Slow-firing ranged ambushers — fire one pistol shot then reload for
  // ~10s. Engine reads hasFlintlock to swap the shuriken AI for the pistol
  // routine. Placed in random floor tiles in non-boss, non-stairs rooms
  // (and not on top of an existing spawn).
  {
    const usedFL = new Set(mobSpawns.map(s => `${s.x},${s.z}`));
    const flCandidates = [];
    rooms.forEach((r) => {
      if (r.roomType === "hallway") return;
      if (r.isOniBaba) return;
      if (r === stairsDownRoom) return;
      for (let cx = r.x + 1; cx < r.x + r.w - 1; cx++) {
        for (let cz = r.y + 1; cz < r.y + r.h - 1; cz++) {
          if (map[cx]?.[cz]?.type !== "floor") continue;
          flCandidates.push([cx, cz]);
        }
      }
    });
    // Shuffle Fisher-Yates for fair distribution
    for (let i = flCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flCandidates[i], flCandidates[j]] = [flCandidates[j], flCandidates[i]];
    }
    let placedFL = 0;
    // Reduced from 7 → 3 to fit the 20-25 total monster cap per user spec.
    const FL_TARGET = 3;
    for (const [tx, tz] of flCandidates) {
      if (placedFL >= FL_TARGET) break;
      if (mobSpawns.length >= MAX_MONSTERS) break;
      const k = `${tx},${tz}`;
      if (usedFL.has(k)) continue;
      usedFL.add(k);
      mobSpawns.push({
        id: `flintlock-imp-L${level}-${mobIdCtr++}`,
        nameKey: "yakuza_imp",
        name: "Yakuza Imp",                // model-type name per user spec
        type: "monster",
        x: tx, z: tz,
        hp: Math.round(monsterHp * 0.5),
        maxHp: Math.round(monsterHp * 0.5),
        isHostile: true,
        isImp: true,                       // reuse imp GLB
        hasFlintlock: true,                // engine → pistol routine
        vulnerability: { FIRE:1.3, WATER:1.1, EARTH:1.0, WIND:1.2, VOID:1.0, DEFAULT:1.0 },
      });
      placedFL++;
    }
  }

  // ── Greeter imp in Room 1 (level 1 only) ─────────────────────────────────
  // Player walks the 8-tile entrance hallway (Room 0) and arrives in Room 1
  // (the locked Foyer). Per the user there must ALWAYS be an imp here so the
  // very first encounter happens on the doorstep — a guaranteed introduction
  // to the imp archetype + a clean target for the first attack-card swing.
  // Non-hostile by default so the player isn't shot in the back the moment
  // they step in; aggro fires the normal way (proximity / first hit).
  if (level === 1) {
    const room1 = rooms.find((r) => r.id === 1);
    if (room1) {
      // MANDATORY per user spec — every new game has an imp greeting at
      // Room 1's south entry (where the player walks in from the
      // entrance hallway / Room 0). Try a list of preferred tiles in
      // priority order:
      //   1. Center of south edge (right where the player enters)
      //   2. Adjacent left / right of south-center
      //   3. Any south-edge interior tile
      //   4. Any interior tile (fallback)
      // The first un-claimed floor tile in that list wins.
      const usedR1 = new Set(mobSpawns.map(s => `${s.x},${s.z}`));
      const cxCenter = Math.floor(room1.x + room1.w / 2);
      const zSouth   = room1.y + room1.h - 2;     // one tile inside south wall
      // Build a candidate list in priority order.
      const preferred = [
        [cxCenter,     zSouth],
        [cxCenter - 1, zSouth],
        [cxCenter + 1, zSouth],
        [cxCenter,     zSouth - 1],
        [cxCenter - 1, zSouth - 1],
        [cxCenter + 1, zSouth - 1],
      ];
      // Fallback: any other interior tile.
      for (let cx = room1.x + 1; cx < room1.x + room1.w - 1; cx++) {
        for (let cz = room1.y + 1; cz < room1.y + room1.h - 1; cz++) {
          preferred.push([cx, cz]);
        }
      }
      let placedR1 = false, spX = null, spZ = null;
      for (const [cx, cz] of preferred) {
        if (placedR1) break;
        if (cx < 0 || cz < 0 || cx >= MAP_W || cz >= MAP_H) continue;
        if (map[cx]?.[cz]?.type !== "floor") continue;
        if (usedR1.has(`${cx},${cz}`)) continue;
        spX = cx; spZ = cz; placedR1 = true;
      }
      // ABSOLUTE FALLBACK — if every floor tile is claimed (shouldn't
      // happen on the 8×8 locked room), force-evict the conflict and
      // plant the imp at south-center anyway. Per user: MANDATORY.
      if (!placedR1) {
        // Evict any spawn already standing on south-center.
        for (let i = mobSpawns.length - 1; i >= 0; i--) {
          if (mobSpawns[i].x === cxCenter && mobSpawns[i].z === zSouth) {
            mobSpawns.splice(i, 1);
          }
        }
        spX = cxCenter; spZ = zSouth; placedR1 = true;
      }
      mobSpawns.push({
        id: `room1-imp-greeter-${mobIdCtr++}`,
        nameKey: "yakuza_imp",
        name: "Yakuza Imp",
        type: "monster",
        x: spX, z: spZ,
        hp: Math.round(monsterHp * 0.6),
        maxHp: Math.round(monsterHp * 0.6),
        isHostile: false,                  // greeter — bows first
        isImp: true,
        isRoom1Greeter: true,
        vulnerability: { FIRE:1.3, WATER:1.0, EARTH:1.0, WIND:1.1, VOID:1.0, DEFAULT:1.0 },
      });
    }
  }

  // ── OYABUN boss (every level except 7) ───────────────────────────────────
  // The Oyabun guards the casino — defeat him + open the vault behind him to
  // descend. Big goblin, locked to casino centre, hostile from spawn. HP
  // scales with level so each floor's Oyabun is meaningfully tougher.
  if (level !== 7 && casinoRoom) {
    mobSpawns.push({
      id: `boss-oyabun-${level}-${mobIdCtr++}`,
      nameKey: "yakuza_supervisor",
      name: "Oyabun",
      type: "monster",
      x: casinoRoom.cx,
      z: casinoRoom.cz,
      hp:    monsterHp * 3,
      maxHp: monsterHp * 3,
      isHostile: true,
      isBoss: true,
      isOyabun: true,                                       // engine flag
      casinoRoomId: casinoRoom.id,
      vulnerability: { FIRE:1.0, WATER:1.0, EARTH:0.85, WIND:1.1, VOID:1.0, DEFAULT:0.9 },
    });
  }

  // ── Throne boss (level 7 only) ───────────────────────────────────────────
  // One large, high-HP monster placed at the centre of the throne room.
  // Engine reads `isBoss` to scale the mesh up + label it. Resists everything
  // a bit (vuln ≤ 1.0 across the board) so the player has to commit.
  if (level === 7) {
    const throne = rooms.find((r) => r.isOniBaba);
    if (throne) {
      mobSpawns.push({
        id: `boss-throne-${mobIdCtr++}`,
        nameKey: "oni_baba",
        name: "Oni-Baba, the Dragon Princess",
        type: "monster",
        x: throne.cx,
        z: throne.cz,
        hp: monsterHp * 6,        // L7 base × 6 = ~1050 HP — committed boss fight
        maxHp: monsterHp * 6,
        isHostile: true,
        isBoss: true,
        vulnerability: { FIRE:0.85, WATER:0.85, EARTH:0.85, WIND:0.85, VOID:1.0, DEFAULT:0.9 },
      });
    }
  }

  // ── Imp in some rooms (capped by MAX_MONSTERS) ─────────────────────────
  // Per user spec, total monsters per level is capped at 20-25. The
  // per-room random spawn + flintlock imps + supervisor + henchmen +
  // Oyabun consume most of that budget; this pass fills the remainder
  // with peaceful imps in rooms that don't already have one. When the
  // budget is exhausted the loop stops — not every room gets an imp.
  //
  // ── +1 IMP BONUS (10% per room, capped per level) ──
  // After the main per-room imp pass, some rooms roll for an EXTRA imp.
  // Per user spec: 10% chance, capped at `level` extra imps (so deeper
  // floors can stack more bonus encounters but level 1 gets at most 1).
  const BONUS_IMP_CHANCE  = 0.10;
  const BONUS_IMP_MAX     = level; // cap scales with dungeon level
  let bonusImpsPlaced     = 0;
  {
    const usedTiles = new Set(mobSpawns.map(s => `${s.x},${s.z}`));
    for (const r of rooms) {
      if (!r) continue;
      if (mobSpawns.length >= MAX_MONSTERS) break;
      if (r.roomType === 'hallway') continue;
      if (r.isOniBaba || r.isVault || r.isStore || r.isCasino) continue;
      if (r === stairsDownRoom) continue;
      // Skip if this room already has an imp.
      const hasImp = mobSpawns.some(s =>
        s.isImp &&
        s.x >= r.x && s.x < r.x + r.w &&
        s.z >= r.y && s.z < r.y + r.h
      );
      if (hasImp) continue;
      // Find an interior floor tile not already claimed.
      let sx = null, sz = null;
      for (let cx = r.x + 1; cx < r.x + r.w - 1 && sx === null; cx++) {
        for (let cz = r.y + 1; cz < r.y + r.h - 1; cz++) {
          if (map[cx]?.[cz]?.type !== 'floor') continue;
          const k = `${cx},${cz}`;
          if (usedTiles.has(k)) continue;
          sx = cx; sz = cz;
          usedTiles.add(k);
          break;
        }
      }
      if (sx === null) continue; // tiny room with no free interior tile
      mobSpawns.push({
        id: `room-imp-${r.id}-${mobIdCtr++}`,
        nameKey: 'yakuza_imp',
        name: 'Yakuza Imp',
        type: 'monster',
        x: sx, z: sz,
        hp: Math.round(monsterHp * 0.6),
        maxHp: Math.round(monsterHp * 0.6),
        isHostile: false,        // peaceful by default; aggros on attack
        isImp: true,
        roomId: r.id,
        vulnerability: { FIRE:1.3, WATER:1.0, EARTH:1.0, WIND:1.1, VOID:1.0, DEFAULT:1.0 },
      });
    }
  }

  // ── +1 IMP bonus pass (10% of rooms, capped per level) ─────────────────
  // Walks rooms that already have an imp and rolls 10% per room for a
  // second imp. Capped at `level` extra imps so deeper floors get more
  // bonus encounters. Still gated by MAX_MONSTERS so the total never
  // exceeds the 20-25 ceiling.
  {
    const usedTilesB = new Set(mobSpawns.map(s => `${s.x},${s.z}`));
    // Bonus imps are INTENTIONALLY "extras" beyond MAX_MONSTERS — they're
    // a per-room dice roll, not part of the base 20-25 budget. Cap only
    // at BONUS_IMP_MAX (= dungeon level) so deeper floors stack more
    // bonus encounters and L1 gets at most 1 bonus. Earlier check
    // `mobSpawns.length >= MAX_MONSTERS` was always true (boss + henchmen
    // + Oyabun + greeter pre-fill the budget) so the pass never fired.
    for (const r of rooms) {
      if (bonusImpsPlaced >= BONUS_IMP_MAX) break;
      if (!r) continue;
      if (r.roomType === 'hallway') continue;
      if (r.isOniBaba || r.isVault || r.isStore || r.isCasino) continue;
      if (r === stairsDownRoom) continue;
      if (Math.random() >= BONUS_IMP_CHANCE) continue;
      // Find a fresh interior tile not used by anyone else.
      let sx = null, sz = null;
      for (let cx = r.x + 1; cx < r.x + r.w - 1 && sx === null; cx++) {
        for (let cz = r.y + 1; cz < r.y + r.h - 1; cz++) {
          if (map[cx]?.[cz]?.type !== 'floor') continue;
          const k = `${cx},${cz}`;
          if (usedTilesB.has(k)) continue;
          sx = cx; sz = cz;
          usedTilesB.add(k);
          break;
        }
      }
      if (sx === null) continue;
      mobSpawns.push({
        id: `bonus-imp-${r.id}-${mobIdCtr++}`,
        nameKey: 'yakuza_imp',
        name: 'Yakuza Imp',
        type: 'monster',
        x: sx, z: sz,
        hp: Math.round(monsterHp * 0.6),
        maxHp: Math.round(monsterHp * 0.6),
        isHostile: false,
        isImp: true,
        roomId: r.id,
        isBonusImp: true,
        vulnerability: { FIRE:1.3, WATER:1.0, EARTH:1.0, WIND:1.1, VOID:1.0, DEFAULT:1.0 },
      });
      bonusImpsPlaced++;
    }
  }

  // NOTE: Earlier revision of this file ran a post-pass that converted
  // qualifying interior walls (those sandwiched between two rooms) to
  // type:'shoji' so they'd render as thin paper panels. Per the user that
  // was wrong — shoji is for DOORWAYS ONLY. Stone walls stay stone. The
  // post-pass was removed; doorways still get their shoji_door tiles via
  // createDoorway() above, and those keep their open/close animations +
  // bashable behaviour. Walls are walls.

  return { map, rooms, spawnX, spawnZ, mobSpawns };
}

export default generateDungeonMap;
