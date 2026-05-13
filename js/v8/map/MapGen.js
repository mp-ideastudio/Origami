/**
 * MapGen.js — T0.1.B extraction from NewOrigami.Engine8.html
 *
 * Procedural dungeon generator. No Three.js dependency.
 * Export: generateDungeonMap(level, MAP_W, MAP_H) → { map, rooms, spawnX, spawnZ, mobSpawns }
 *
 * 7 dungeon levels × 12-18 rooms each. No doors — rooms connect via open
 * 2-tile-wide corridor gaps. Level 7 has a large locked OniBaba sanctum.
 */

/**
 * generateDungeonMap(level, MAP_W, MAP_H)
 *
 * @param {number} level - Dungeon level 1-7
 * @param {number} MAP_W - Map width in grid cells
 * @param {number} MAP_H - Map height in grid cells
 * @returns {{ map, rooms, spawnX, spawnZ, mobSpawns }}
 */
export function generateDungeonMap(level = 1, MAP_W = 128, MAP_H = 128) {
    level = Math.max(1, Math.min(7, level));
    const map = Array.from({length:MAP_W}, ()=>Array.from({length:MAP_H}, ()=>({type:'wall'})));
    const rooms = [];
    const BORDER = 3;  // keep rooms away from map edge
    const MIN_R = 5, MAX_R = 10; // room dimensions
    const ONIBABA_ROOM_SIZE = 18; // boss sanctum
    const targetRooms = 12 + Math.floor(Math.random() * 7); // 12-18

    // ── Carve a rectangular room and register it ──────────────────────────────
    const carveRoom = (id, x0, z0, w, h, opts={}) => {
        for(let x=x0; x<x0+w; x++) for(let z=z0; z<z0+h; z++)
            map[x][z] = {type:'floor', room:true, roomId:id, ...opts};
        const cx = Math.floor(x0+w/2), cz = Math.floor(z0+h/2);
        rooms.push({id, x:x0, y:z0, w, h, cx, cz, center:{x:cx, y:cz}, ...opts});
    };

    // ── Carve a 2-wide open corridor between two points (no doors) ───────────
    const carveCorridor = (ax, az, bx, bz, roomIdA, roomIdB) => {
        let x=ax, z=az;
        // L-shaped: horizontal first, then vertical — always reaches destination
        const hEnd = bx;
        const vEnd = bz;
        while(x !== hEnd){
            const step = x < hEnd ? 1 : -1;
            if(map[x]?.[z]?.type === 'wall')   map[x][z]   = {type:'floor', hall:true, roomId: roomIdA ?? -1};
            if(map[x]?.[z+1]?.type === 'wall') map[x][z+1] = {type:'floor', hall:true, roomId: roomIdA ?? -1};
            x += step;
        }
        while(z !== vEnd){
            const step = z < vEnd ? 1 : -1;
            if(map[x]?.[z]?.type === 'wall')   map[x][z]   = {type:'floor', hall:true, roomId: roomIdB ?? -1};
            if(map[x+1]?.[z]?.type === 'wall') map[x+1][z] = {type:'floor', hall:true, roomId: roomIdB ?? -1};
            z += step;
        }
    };

    // ── Overlap check with buffer ─────────────────────────────────────────────
    const overlaps = (x0, z0, w, h, buf=2) => {
        if(x0-buf < BORDER || z0-buf < BORDER) return true;
        if(x0+w+buf >= MAP_W-BORDER || z0+h+buf >= MAP_H-BORDER) return true;
        for(const r of rooms){
            if(x0-buf < r.x+r.w && x0+w+buf > r.x &&
               z0-buf < r.y+r.h && z0+h+buf > r.y) return true;
        }
        return false;
    };

    // ── Japanese room name pool per level ────────────────────────────────────
    const ROOM_POOLS = [
        /* L1 */ ['入口の間','武具蔵','板の間','土間','長屋','番所','厩','倉庫','水の間','火の間'],
        /* L2 */ ['地下廊下','石牢','水責め部屋','拷問部屋','隠し部屋','番兵詰所','武器庫','兵糧庫','火薬庫','地下道'],
        /* L3 */ ['呪いの間','骸骨の部屋','腐敗の廊下','古戦場','血の祭壇','暗黒の庭','亡者の館','闇の蔵','冥界の扉','怨霊の間'],
        /* L4 */ ['炎の間','溶岩の廊下','鬼の洞窟','業火の部屋','赤鬼の間','閻魔の庭','地獄谷','焦熱地獄','火の柱','灼熱の間'],
        /* L5 */ ['氷の廊下','雪女の間','吹雪の洞','霜の蔵','冰牢','雪の祭壇','凍てつく間','氷柱の廊','白銀の間','霧の間'],
        /* L6 */ ['雷の間','稲妻の廊下','嵐の洞','天雷の部屋','神鳴の間','龍神の庭','電光石火','疾風の間','暴風の蔵','雷神の祭壇'],
        /* L7 */ ['鬼婆の聖域','冥府の門','黒龍の間','業の間','六道の辻','恩讐の庭','鬼の玉座','幽冥の奥','彼岸の間','魂の祭壇'],
    ];
    const namePool = [...(ROOM_POOLS[level-1] || ROOM_POOLS[0])];
    const getNextName = () => {
        if(!namePool.length) return '謎の間';
        const i = Math.floor(Math.random()*namePool.length);
        return namePool.splice(i,1)[0];
    };

    // ── Scatter rooms ────────────────────────────────────────────────────────
    let id = 0;
    let attempts = 0;

    // Level 7: place large OniBaba sanctum first, in the far north
    if(level === 7){
        const ox = Math.floor(MAP_W/2) - Math.floor(ONIBABA_ROOM_SIZE/2);
        const oz = BORDER + 2;
        if(!overlaps(ox, oz, ONIBABA_ROOM_SIZE, ONIBABA_ROOM_SIZE, 1)){
            carveRoom(id++, ox, oz, ONIBABA_ROOM_SIZE, ONIBABA_ROOM_SIZE,
                {roomName:'鬼婆の聖域', roomType:'sanctum', isOniBaba:true});
        }
    }

    // Fill the rest of the map with scattered rooms
    while(rooms.length < targetRooms && attempts < 2000){
        attempts++;
        const w = MIN_R + Math.floor(Math.random()*(MAX_R-MIN_R+1));
        const h = MIN_R + Math.floor(Math.random()*(MAX_R-MIN_R+1));
        const x0 = BORDER + Math.floor(Math.random()*(MAP_W - w - BORDER*2));
        const z0 = BORDER + Math.floor(Math.random()*(MAP_H - h - BORDER*2));
        if(!overlaps(x0, z0, w, h)){
            const rName = getNextName();
            carveRoom(id++, x0, z0, w, h, {roomName:rName, roomType:'room'});
        }
    }

    // ── Connect rooms with open corridors (minimum spanning tree) ─────────────
    // Prim's algorithm: always connect nearest unconnected room
    if(rooms.length > 1){
        const connected = new Set([0]);
        while(connected.size < rooms.length){
            let bestDist = Infinity, bestA = -1, bestB = -1;
            for(const ai of connected){
                for(let bi=0; bi<rooms.length; bi++){
                    if(connected.has(bi)) continue;
                    const ra = rooms[ai], rb = rooms[bi];
                    const d = Math.abs(ra.cx-rb.cx)+Math.abs(ra.cz-rb.cz);
                    if(d < bestDist){ bestDist=d; bestA=ai; bestB=bi; }
                }
            }
            if(bestB < 0) break;
            carveCorridor(rooms[bestA].cx, rooms[bestA].cz, rooms[bestB].cx, rooms[bestB].cz, rooms[bestA].id, rooms[bestB].id);
            connected.add(bestB);
        }
        // Add a few extra random connections so it feels less linear
        const extras = 2 + Math.floor(Math.random()*3);
        for(let e=0; e<extras; e++){
            const a = rooms[Math.floor(Math.random()*rooms.length)];
            const b = rooms[Math.floor(Math.random()*rooms.length)];
            if(a !== b) carveCorridor(a.cx, a.cz, b.cx, b.cz, a.id, b.id);
        }
    }

    // ── Spawn point + start hallway ──────────────────────────────────────────
    // Pick the southernmost room as the entrance room
    const entranceRoom = rooms.reduce((best, r) => r.cz > best.cz ? r : best, rooms[0]);
    const spawnX = entranceRoom.cx;

    // Carve a 2-tile-wide, 7-tile-long start hallway south of the entrance room.
    // hallStart = first tile immediately south of the room's south wall.
    // stairsUpZ = south tip of the hallway (7 tiles down) = exit stairs.
    // Player spawns at hallStart (north end of hallway) facing north into the dungeon.
    const roomSouthEdge = entranceRoom.y + entranceRoom.h; // first tile SOUTH of room
    const hallStart     = roomSouthEdge;
    const stairsUpZ     = Math.min(MAP_H - 3, hallStart + 6); // 7 tiles: hallStart..hallStart+6
    for(let cz = hallStart; cz <= stairsUpZ; cz++){
        if(map[spawnX  ]?.[cz]) map[spawnX  ][cz] = {type:'floor', hall:true, roomId: entranceRoom.id};
        if(map[spawnX+1]?.[cz]) map[spawnX+1][cz] = {type:'floor', hall:true, roomId: entranceRoom.id};
    }
    // South tip = stairs_up (exit door). Right tile marked stairs_up_r so
    // geometry only renders one combined double-door spanning both tiles.
    if(map[spawnX  ]?.[stairsUpZ]) map[spawnX  ][stairsUpZ] = {type:'stairs_up',   roomId: entranceRoom.id};
    if(map[spawnX+1]?.[stairsUpZ]) map[spawnX+1][stairsUpZ] = {type:'stairs_up_r', roomId: entranceRoom.id};

    // Player spawns at bottom of the stairs, facing north into the dungeon
    const spawnZ = stairsUpZ - 1;

    // ── Stairs down: in the northernmost non-sanctum room ────────────────────
    const stairsRoom = rooms.filter(r=>!r.isOniBaba)
                           .reduce((best,r) => r.cz < best.cz ? r : best, rooms[0]);
    map[stairsRoom.cx][stairsRoom.cz] = {type:'stairs_down', roomId: stairsRoom.id};

    // ── Monster spawns: 1–3 per room ─────────────────────────────────────────
    const mobSpawns = [];
    let mobIdCtr = 0;
    const hpByLevel = [50, 65, 80, 100, 120, 145, 175];
    const monsterHp = hpByLevel[Math.min(level-1, 6)];

    rooms.forEach(r => {
        if(r.roomType === 'hallway') return;
        // OniBaba sanctum on L7: no random mobs — boss is spawned separately
        if(r.isOniBaba) return;

        const count = 1 + Math.floor(Math.random()*3); // 1, 2 or 3
        // Build candidate floor cells (not adjacent to walls)
        const candidates = [];
        for(let cx=r.x+1; cx<r.x+r.w-1; cx++){
            for(let cz=r.y+1; cz<r.y+r.h-1; cz++){
                if(map[cx]?.[cz]?.type !== 'floor') continue;
                candidates.push([cx, cz]);
            }
        }
        if(!candidates.length) return;
        const used = new Set();
        for(let i=0; i<count; i++){
            let pick = null;
            for(let tries=0; tries<20 && !pick; tries++){
                const [tx,tz] = candidates[Math.floor(Math.random()*candidates.length)];
                const key = `${tx},${tz}`;
                if(!used.has(key)){ used.add(key); pick=[tx,tz]; }
            }
            if(!pick) break;
            mobSpawns.push({
                id:`goblin-${r.id}-${mobIdCtr++}`,
                name:'Yakuza Goblin',
                type:'monster',
                x:pick[0], z:pick[1],
                hp:monsterHp, maxHp:monsterHp,
                isHostile:true
            });
        }
    });

    return {map, rooms, spawnX, spawnZ, mobSpawns};
}

export default generateDungeonMap;
