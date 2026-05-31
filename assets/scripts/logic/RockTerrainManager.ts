import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';
import { TickChange } from './TerrainEvolutionManager';

/**
 * 岩石地形演化管理器（单例）
 * 每 3 tick 高度 +1 并向邻接空地扩散
 */
export class RockTerrainManager {
    private static _instance: RockTerrainManager;
    static get instance(): RockTerrainManager {
        if (!this._instance) {
            this._instance = new RockTerrainManager();
        }
        return this._instance;
    }

    evolve(snapshot: { gridX: number; gridY: number; terrainType: TerrainType; height: number }[], tickCount: number): TickChange[] {
        const changes: TickChange[] = [];

        // 仅每 3 tick 生长 + 扩散
        if (tickCount % 3 !== 0) return changes;

        const mgr = HexGridManager.instance;

        // 仅本 tick 开始时就是 ROCK 的格子才能扩散（防止连锁反应）
        const originalRockKeys = new Set<string>();
        for (const cell of snapshot) {
            if (cell.terrainType === TerrainType.ROCK) {
                originalRockKeys.add(`${cell.gridX},${cell.gridY}`);
            }
        }

        for (const cell of snapshot) {
            if (!originalRockKeys.has(`${cell.gridX},${cell.gridY}`)) continue;

            // 当前格子：高度 +1
            const gridCell = mgr.getCell(cell.gridX, cell.gridY);
            if (!gridCell) continue;
            gridCell.height += 1;
            changes.push({
                col: cell.gridX,
                row: cell.gridY,
                terrainType: TerrainType.ROCK,
                height: gridCell.height,
            });

            // 随机扩散到邻接空地
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

        return changes;
    }
}
