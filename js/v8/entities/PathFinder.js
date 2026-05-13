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

const _MON_A_STAR_MAX = 200;

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
        // Bail fast if goal is in a wall
        const goalCell = map[gx]?.[gz];
        if (!goalCell || goalCell.type === 'wall') return null;

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
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            for (let d = 0; d < 4; d++) {
                const nx = cur.gx + dirs[d][0];
                const nz = cur.gz + dirs[d][1];
                if (nx < 0 || nx >= MAP_W || nz < 0 || nz >= MAP_H) continue;
                const cell = map[nx]?.[nz];
                if (!cell || cell.type === 'wall') continue;
                const nk = nx + ',' + nz;
                if (closed.has(nk)) continue;
                const tg = (gScore.get(ck) ?? Infinity) + 1;
                if (tg < (gScore.get(nk) ?? Infinity)) {
                    cameFrom.set(nk, ck);
                    gScore.set(nk, tg);
                    const f = tg + Math.abs(nx - gx) + Math.abs(nz - gz);
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
