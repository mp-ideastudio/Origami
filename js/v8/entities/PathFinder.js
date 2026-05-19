/**
 * PathFinder.js — T0.1 extraction from NewOrigami.Engine8.html
 *
 * Pure pathfinding utilities. No Three.js dependency.
 * Factory pattern: createPathFinder(map, MAP_W, MAP_H) → { monAStar }
 *
 * Preserves T0.6 behaviour exactly:
 *   _monAStar(sx, sz, gx, gz) — grid-based A*, 4-directional, Manhattan
 *   heuristic, capped at _MON_A_STAR_MAX expansions. Returns [[gx,gz],...]
 *   from start to goal (inclusive), or null on failure.
 */

const _MON_A_STAR_MAX = 800;   // bumped from 200 — cross-floor chases need a bigger expansion budget so monsters that lose LOS can still path to the player through doors.

/**
 * createPathFinder(map, MAP_W, MAP_H)
 *
 * @param {Array}  map   - 2-D tile array from MapGen. map[x][z].type === 'wall'|'floor'|...
 * @param {number} MAP_W - grid width
 * @param {number} MAP_H - grid height
 * @returns {{ monAStar: Function }}
 */
export function createPathFinder(map, MAP_W, MAP_H) {
    /**
     * monAStar(sx, sz, gx, gz)
     *
     * Grid-cell A* from (sx,sz) → (gx,gz). Coordinates are GRID-cell indices,
     * not world-units. Uses Manhattan heuristic. Caps at _MON_A_STAR_MAX node
     * expansions so it degrades gracefully on large maps.
     *
     * Returns array of [gx,gz] tuples from start to goal, or null when no path
     * is found within the expansion budget.
     */
    function monAStar(sx, sz, gx, gz) {
        if (sx === gx && sz === gz) return [[sx, sz]];
        // Bail fast if goal is in a wall or shoji panel (paper screens are
        // visually thin but still solid — engine collision matches).
        const goalCell = map[gx]?.[gz];
        if (!goalCell || goalCell.type === 'wall' || goalCell.type === 'shoji') return null;

        const open = [{ gx: sx, gz: sz, f: Math.abs(sx - gx) + Math.abs(sz - gz) }];
        const gScore = new Map();
        const cameFrom = new Map();
        const sk = sx + ',' + sz;
        gScore.set(sk, 0);
        const closed = new Set();
        let expanded = 0;

        while (open.length && expanded < _MON_A_STAR_MAX) {
            // O(n) min — n stays small for short chase paths
            let bestIdx = 0;
            for (let i = 1; i < open.length; i++) if (open[i].f < open[bestIdx].f) bestIdx = i;
            const cur = open.splice(bestIdx, 1)[0];
            const ck = cur.gx + ',' + cur.gz;
            if (cur.gx === gx && cur.gz === gz) {
                // reconstruct
                const path = [[cur.gx, cur.gz]];
                let k = ck;
                while (cameFrom.has(k)) {
                    k = cameFrom.get(k);
                    const [px2, pz2] = k.split(',').map(Number);
                    path.unshift([px2, pz2]);
                }
                return path;
            }
            closed.add(ck);
            expanded++;
            // 8-direction neighborhood (was 4). Diagonals get cost √2≈1.414,
            // cardinals cost 1.0 — keeps the path optimal AND prefers diagonals
            // when they actually shorten the route. The heuristic also
            // upgraded to octile distance so A* stays admissible (won't
            // overestimate when diagonals exist).
            const dirs = [
                [ 1,  0, 1.0], [-1,  0, 1.0], [ 0,  1, 1.0], [ 0, -1, 1.0],
                [ 1,  1, 1.414], [ 1, -1, 1.414], [-1,  1, 1.414], [-1, -1, 1.414],
            ];
            for (let d = 0; d < dirs.length; d++) {
                const dx = dirs[d][0], dz = dirs[d][1], cost = dirs[d][2];
                const nx = cur.gx + dx;
                const nz = cur.gz + dz;
                if (nx < 0 || nx >= MAP_W || nz < 0 || nz >= MAP_H) continue;
                const cell = map[nx]?.[nz];
                if (!cell || cell.type === 'wall' || cell.type === 'shoji') continue;
                // Diagonal corner-cutting prevention: don't slip diagonally
                // between two walls (or shoji panels). e.g. moving NE requires
                // N or E to be walkable so the monster doesn't squeeze through
                // a 1-tile diagonal gap that has walls on both cardinal sides.
                if (cost > 1.0) {
                    const sideA = map[cur.gx + dx]?.[cur.gz];
                    const sideB = map[cur.gx]?.[cur.gz + dz];
                    const blockA = !sideA || sideA.type === 'wall' || sideA.type === 'shoji';
                    const blockB = !sideB || sideB.type === 'wall' || sideB.type === 'shoji';
                    if (blockA && blockB) continue;
                }
                const nk = nx + ',' + nz;
                if (closed.has(nk)) continue;
                const tg = (gScore.get(ck) ?? Infinity) + cost;
                if (tg < (gScore.get(nk) ?? Infinity)) {
                    cameFrom.set(nk, ck);
                    gScore.set(nk, tg);
                    // Octile heuristic — admissible with √2 diagonals.
                    const hdx = Math.abs(nx - gx);
                    const hdz = Math.abs(nz - gz);
                    const h = Math.max(hdx, hdz) + (Math.SQRT2 - 1) * Math.min(hdx, hdz);
                    const f = tg + h;
                    // Replace or push
                    let foundOpen = false;
                    for (let i = 0; i < open.length; i++) {
                        if (open[i].gx === nx && open[i].gz === nz) { open[i].f = f; foundOpen = true; break; }
                    }
                    if (!foundOpen) open.push({ gx: nx, gz: nz, f });
                }
            }
        }
        return null;
    }

    return { monAStar };
}

export default createPathFinder;
