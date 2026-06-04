import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';
import { TickChange } from './TerrainEvolutionManager';

/**
 * 侵蚀地形演化管理器（单例）
 *
 * 侵蚀规则：
 * 1) 场上存在侵蚀源时才发生侵蚀扩散
 * 2) 每 tick 70% 概率侵蚀 1 格 WATER 和 1 格 GRASS（转成 ERODED）
 * 3) 当侵蚀源的周边 6 格都不是 ERODED 时，侵蚀源自身变成 ERODED
 *
 * 注意：遍历 mgr.getAllCells() 而非快照（原设计如此，侵蚀依赖当前全局状态）
 */
export class ErodedTerrainManager {
    private static _instance: ErodedTerrainManager;
    static get instance(): ErodedTerrainManager {
        if (!this._instance) {
            this._instance = new ErodedTerrainManager();
        }
        return this._instance;
    }

    /** 检查场上是否存在侵蚀源 */
    private _hasErosionSource(): boolean {
        return HexGridManager.instance.getAllCells().some(
            cell => cell.terrainType === TerrainType.EROSION_SOURCE,
        );
    }

    evolve(): TickChange[] {
        const changes: TickChange[] = [];
        const mgr = HexGridManager.instance;

        // — 条件1：场上存在侵蚀源时才进行侵蚀扩散 —
        if (!this._hasErosionSource()) {
            return changes;
        }

        // ── 收集侵蚀候选（从已有 ERODED 格子的邻居中找 WATER / GRASS） ──
        const erosionWaterCandidates: { col: number; row: number }[] = [];
        const erosionGrassCandidates: { col: number; row: number }[] = [];
        const erosionTargets = new Set<string>();

        for (const cell of mgr.getAllCells()) {
            if (cell.terrainType !== TerrainType.ERODED) continue;

            const neighbors = mgr.getNeighbors(cell.gridX, cell.gridY);
            for (const n of neighbors) {
                const key = `${n.col},${n.row}`;
                if (erosionTargets.has(key)) continue;
                const c = mgr.getCell(n.col, n.row);
                if (!c) continue;

                if (c.terrainType === TerrainType.WATER) {
                    erosionTargets.add(key);
                    erosionWaterCandidates.push({ col: n.col, row: n.row });
                } else if (c.terrainType === TerrainType.GRASS) {
                    erosionTargets.add(key);
                    erosionGrassCandidates.push({ col: n.col, row: n.row });
                }
            }
        }

        // 每 tick 70% 概率随机侵蚀 1 格 WATER
        if (erosionWaterCandidates.length > 0 && Math.random() < 0.7) {
            const target = erosionWaterCandidates[Math.floor(Math.random() * erosionWaterCandidates.length)];
            mgr.setCellTerrain(target.col, target.row, TerrainType.ERODED);
            const c = mgr.getCell(target.col, target.row);
            if (c) c.height = 0;
            changes.push({ col: target.col, row: target.row, terrainType: TerrainType.ERODED, height: 0 });
        }

        // 每 tick 70% 概率随机侵蚀 1 格 GRASS
        if (erosionGrassCandidates.length > 0 && Math.random() < 0.7) {
            const target = erosionGrassCandidates[Math.floor(Math.random() * erosionGrassCandidates.length)];
            mgr.setCellTerrain(target.col, target.row, TerrainType.ERODED);
            const c = mgr.getCell(target.col, target.row);
            if (c) c.height = 0;
            changes.push({ col: target.col, row: target.row, terrainType: TerrainType.ERODED, height: 0 });
        }

        // — 条件2：侵蚀源周边无一格 ERODED → 侵蚀源自身变成 ERODED —
        for (const cell of mgr.getAllCells()) {
            if (cell.terrainType !== TerrainType.EROSION_SOURCE) continue;

            const neighbors = mgr.getNeighbors(cell.gridX, cell.gridY);
            const allNonEroded = neighbors.every(n => {
                const c = mgr.getCell(n.col, n.row);
                // 邻居不存在视为非eroded，但侵蚀源只会在非边角格，理论上都有邻居
                return c && c.terrainType !== TerrainType.ERODED;
            });

            if (allNonEroded) {
                mgr.setCellTerrain(cell.gridX, cell.gridY, TerrainType.ERODED);
                changes.push({
                    col: cell.gridX,
                    row: cell.gridY,
                    terrainType: TerrainType.ERODED,
                    height: 0,
                });
            }
        }

        return changes;
    }
}
