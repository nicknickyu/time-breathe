import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';
import { TickChange } from './TerrainEvolutionManager';

/**
 * 水域地形演化管理器（单例）
 * 每 tick 50% 概率向邻接空地扩散（最多 3 格）
 */
export class WaterTerrainManager {
    private static _instance: WaterTerrainManager;
    static get instance(): WaterTerrainManager {
        if (!this._instance) {
            this._instance = new WaterTerrainManager();
        }
        return this._instance;
    }

    evolve(snapshot: { gridX: number; gridY: number; terrainType: TerrainType; height: number }[]): TickChange[] {
        const changes: TickChange[] = [];
        const mgr = HexGridManager.instance;

        // 仅本 tick 开始时就是 WATER 的格子才能扩散
        const originalWaterKeys = new Set<string>();
        for (const cell of snapshot) {
            if (cell.terrainType === TerrainType.WATER) {
                originalWaterKeys.add(`${cell.gridX},${cell.gridY}`);
            }
        }

        const waterCandidates: { col: number; row: number }[] = [];
        const waterCandidateSet = new Set<string>();

        for (const cell of snapshot) {
            if (!originalWaterKeys.has(`${cell.gridX},${cell.gridY}`)) continue;

            const neighbors = mgr.getNeighbors(cell.gridX, cell.gridY);
            for (const n of neighbors) {
                const key = `${n.col},${n.row}`;
                if (waterCandidateSet.has(key)) continue;
                const neighborCell = mgr.getCell(n.col, n.row);
                if (!neighborCell || !neighborCell.isEmpty()) continue;
                waterCandidateSet.add(key);
                waterCandidates.push({ col: n.col, row: n.row });
            }
        }

        if (waterCandidates.length > 0 && Math.random() < 0.5) {
            const count = Math.min(3, waterCandidates.length);
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(Math.random() * waterCandidates.length);
                const target = waterCandidates.splice(idx, 1)[0];
                mgr.setCellTerrain(target.col, target.row, TerrainType.WATER);
                changes.push({
                    col: target.col,
                    row: target.row,
                    terrainType: TerrainType.WATER,
                    height: 0,
                });
            }
        }

        return changes;
    }
}
