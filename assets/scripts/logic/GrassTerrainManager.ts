import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';
import { TickChange } from './TerrainEvolutionManager';

/**
 * 草地地形演化管理器（单例）
 * 每 tick 检查 3 格内是否有 WATER，有则向邻接空地扩散
 */
export class GrassTerrainManager {
    private static _instance: GrassTerrainManager;
    static get instance(): GrassTerrainManager {
        if (!this._instance) {
            this._instance = new GrassTerrainManager();
        }
        return this._instance;
    }

    evolve(snapshot: { gridX: number; gridY: number; terrainType: TerrainType; height: number }[]): TickChange[] {
        const changes: TickChange[] = [];
        const mgr = HexGridManager.instance;

        // 仅本 tick 开始时就是 GRASS 的格子才能扩散
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
            if (!originalGrassKeys.has(`${cell.gridX},${cell.gridY}`)) continue;
            grassTotal++;

            // 仅当 3 格范围内有水时才扩散
            if (!this._hasWaterWithinRange(cell.gridX, cell.gridY, 3)) continue;
            grassWithWater++;

            // 收集未被其他 GRASS 格占用的邻接空地
            const emptyNeighbors: { col: number; row: number }[] = [];
            const neighbors = mgr.getNeighbors(cell.gridX, cell.gridY);
            for (const n of neighbors) {
                const key = `${n.col},${n.row}`;
                if (grassTargets.has(key)) continue;

                const neighborCell = mgr.getCell(n.col, n.row);
                if (!neighborCell || !neighborCell.isEmpty()) continue;
                emptyNeighbors.push({ col: n.col, row: n.row });
            }

            // 每 GRASS 格每 tick 最多扩散 1 次
            if (emptyNeighbors.length > 0 && Math.random() < 0.9) {
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
            `[Grass] total=${grassTotal}, ` +
            `hasWater=${grassWithWater}, willSpread=${grassWillSpread}`
        );

        return changes;
    }

    /**
     * BFS 检查 (col, row) 的 range 步数内是否存在 WATER 格子
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
