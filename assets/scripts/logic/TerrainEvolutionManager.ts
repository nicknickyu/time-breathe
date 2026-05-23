import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';

export interface TickChange {
    col: number;
    row: number;
    terrainType: TerrainType;
    height: number;
}

export class TerrainEvolutionManager {
    private static _instance: TerrainEvolutionManager;
    static get instance(): TerrainEvolutionManager {
        if (!this._instance) {
            this._instance = new TerrainEvolutionManager();
        }
        return this._instance;
    }

    private _tickCount: number = 0;
    private _maxTicks: number = 0;
    private _isEvolving: boolean = false;

    get isEvolving(): boolean { return this._isEvolving; }
    get tickCount(): number { return this._tickCount; }
    get maxTicks(): number { return this._maxTicks; }

    startEvolution(maxTicks: number): void {
        this._tickCount = 0;
        this._maxTicks = maxTicks;
        this._isEvolving = true;
    }

    stopEvolution(): void {
        this._isEvolving = false;
        this._tickCount = 0;
    }

    /**
     * Execute one evolution tick.
     * - ROCK: every 3 ticks, height+1 and copy to adjacent empty
     * - GRASS: each tick, if water within 3 tiles, probability to spread to adjacent empty
     * Returns all cell changes in this tick.
     */
    tick(): TickChange[] {
        if (!this._isEvolving) return [];
        this._tickCount++;
        const changes: TickChange[] = [];
        const mgr = HexGridManager.instance;

        // Snapshot: freeze the cell list before any mutations
        const snapshot = mgr.getAllCells();

        // ── 1) ROCK: every 3 ticks, grow + spread ──
        if (this._tickCount % 3 === 0) {
            for (const cell of snapshot) {
                if (cell.terrainType !== TerrainType.ROCK) continue;

                // Current cell: height +1
                cell.height += 1;
                changes.push({
                    col: cell.gridX,
                    row: cell.gridY,
                    terrainType: TerrainType.ROCK,
                    height: cell.height,
                });

                // Spread to a random adjacent empty cell
                const neighbors = mgr.getNeighbors(cell.gridX, cell.gridY);
                const emptyNeighbors = neighbors.filter(n => {
                    const c = mgr.getCell(n.col, n.row);
                    return c && c.isEmpty();
                });

                if (emptyNeighbors.length > 0) {
                    const target = emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
                    mgr.setCellTerrain(target.col, target.row, TerrainType.ROCK);
                    const targetCell = mgr.getCell(target.col, target.row);
                    if (targetCell) targetCell.height = 0;
                    changes.push({
                        col: target.col,
                        row: target.row,
                        terrainType: TerrainType.ROCK,
                        height: 0,
                    });
                }
            }
        }

        // ── 2) GRASS: each tick, water within 3 tiles, at most 1 spread per cell ──
        // Only cells that were GRASS at the START of this tick can spread
        const originalGrassKeys = new Set<string>();
        for (const cell of snapshot) {
            if (cell.terrainType === TerrainType.GRASS) {
                originalGrassKeys.add(`${cell.gridX},${cell.gridY}`);
            }
        }

        let grassTotal = 0;
        let grassWithWater = 0;
        let grassWillSpread = 0;

        const grassTargets = new Set<string>();

        for (const cell of snapshot) {
            // Skip cells that weren't originally GRASS (prevents chain reaction)
            if (!originalGrassKeys.has(`${cell.gridX},${cell.gridY}`)) continue;
            grassTotal++;

            // Only spread if water is within 3 ticks
            if (!this._hasWaterWithinRange(cell.gridX, cell.gridY, 3)) continue;
            grassWithWater++;

            // Collect all empty neighbors that aren't already claimed
            const emptyNeighbors: { col: number; row: number }[] = [];
            const neighbors = mgr.getNeighbors(cell.gridX, cell.gridY);
            for (const n of neighbors) {
                const key = `${n.col},${n.row}`;
                if (grassTargets.has(key)) continue;

                const neighborCell = mgr.getCell(n.col, n.row);
                if (!neighborCell || !neighborCell.isEmpty()) continue;
                emptyNeighbors.push({ col: n.col, row: n.row });
            }

            // At most 1 spread per GRASS cell per tick
            if (emptyNeighbors.length > 0 && Math.random() < 0.8) {
                grassWillSpread++;
                const target = emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
                const key = `${target.col},${target.row}`;
                mgr.setCellTerrain(target.col, target.row, TerrainType.GRASS);
                const c = mgr.getCell(target.col, target.row);
                if (c) c.height = 0;
                grassTargets.add(key);
                changes.push({
                    col: target.col,
                    row: target.row,
                    terrainType: TerrainType.GRASS,
                    height: 0,
                });
            }
        }

        console.log(
            `[Tick ${this._tickCount}] grass: total=${grassTotal}, ` +
            `hasWater=${grassWithWater}, willSpread=${grassWillSpread}`
        );

        // Check if evolution is done after this tick
        if (this._tickCount >= this._maxTicks) {
            this._isEvolving = false;
        }

        return changes;
    }

    /**
     * BFS check if any WATER cell exists within `range` steps from (col, row).
     */
    private _hasWaterWithinRange(col: number, row: number, range: number): boolean {
        const mgr = HexGridManager.instance;
        const visited = new Set<string>();
        const queue: { col: number; row: number; dist: number }[] = [{ col, row, dist: 0 }];
        visited.add(`${col},${row}`);

        while (queue.length > 0) {
            const cur = queue.shift()!;

            if (cur.dist > 0 && cur.dist <= range) {
                const cell = mgr.getCell(cur.col, cur.row);
                if (cell && cell.terrainType === TerrainType.WATER) return true;
            }

            if (cur.dist >= range) continue;

            const neighbors = mgr.getNeighbors(cur.col, cur.row);
            for (const n of neighbors) {
                const key = `${n.col},${n.row}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({ col: n.col, row: n.row, dist: cur.dist + 1 });
                }
            }
        }

        return false;
    }
}
