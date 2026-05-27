import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';

/** 一次演化 tick 中单个格子的变化数据 */
export interface TickChange {
    col: number;
    row: number;
    terrainType: TerrainType;
    height: number;
}

/**
 * 地形演化管理器（单例）
 * 控制 ROCK / GRASS / WATER 三种地形的自动演化规则
 */
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

    /** 开始演化，持续 maxTicks 次 tick */
    startEvolution(maxTicks: number): void {
        this._tickCount = 0;
        this._maxTicks = maxTicks;
        this._isEvolving = true;
    }

    /** 停止演化并重置计数 */
    stopEvolution(): void {
        this._isEvolving = false;
        this._tickCount = 0;
    }

    /**
     * 执行一次演化 tick:
     * - ROCK: 每 3 tick 高度 +1 并向邻接空地扩散
     * - GRASS: 若 3 格内有 WATER 则概率向邻接空地扩散
     * - WATER: 50% 概率向邻接空地扩散（最多 3 格）
     * - EMPTY: 每 tick 侵蚀 1 格 WATER 和 1 格 GRASS（转成 EMPTY）
     * 返回本 tick 所有格子的变化
     */
    tick(): TickChange[] {
        if (!this._isEvolving) return [];
        this._tickCount++;
        const changes: TickChange[] = [];
        const mgr = HexGridManager.instance;

        // 快照：固定本 tick 开始时的格子列表，防止同一 tick 内连锁反应
        const snapshot = mgr.getAllCells();

        // ── 1) ROCK: 每 3 tick 生长 + 扩散 ──
        if (this._tickCount % 3 === 0) {
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
                cell.height += 1;
                changes.push({
                    col: cell.gridX,
                    row: cell.gridY,
                    terrainType: TerrainType.ROCK,
                    height: cell.height,
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
        }

        // ── 2) GRASS: 每 tick 检查 3 格内是否有水，有则向邻接空地扩散（每格最多 1 次）──
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
            // 跳过本 tick 内新变成 GRASS 的格子（防止连锁反应）
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
            `[Tick ${this._tickCount}] grass: total=${grassTotal}, ` +
            `hasWater=${grassWithWater}, willSpread=${grassWillSpread}`
        );

        // ── 3) WATER: 每 tick 50% 概率向邻接空地扩散（最多 3 格）──
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

        // ── 4) EMPTY 侵蚀：每 tick 全局只侵蚀 1 格 WATER + 1 格 GRASS ──
        const erosionWaterCandidates: { col: number; row: number }[] = [];
        const erosionGrassCandidates: { col: number; row: number }[] = [];
        const erosionTargets = new Set<string>();

        for (const cell of mgr.getAllCells()) {
            if (cell.terrainType !== TerrainType.EMPTY) continue;

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

        // 每 tick 80% 概率随机侵蚀 1 格 WATER
        if (erosionWaterCandidates.length > 0 && Math.random() < 0.7) {
            const target = erosionWaterCandidates[Math.floor(Math.random() * erosionWaterCandidates.length)];
            mgr.setCellTerrain(target.col, target.row, TerrainType.EMPTY);
            const c = mgr.getCell(target.col, target.row);
            if (c) c.height = 0;
            changes.push({ col: target.col, row: target.row, terrainType: TerrainType.EMPTY, height: 0 });
        }

        // 每 tick 80% 概率随机侵蚀 1 格 GRASS
        if (erosionGrassCandidates.length > 0 && Math.random() < 0.7) {
            const target = erosionGrassCandidates[Math.floor(Math.random() * erosionGrassCandidates.length)];
            mgr.setCellTerrain(target.col, target.row, TerrainType.EMPTY);
            const c = mgr.getCell(target.col, target.row);
            if (c) c.height = 0;
            changes.push({ col: target.col, row: target.row, terrainType: TerrainType.EMPTY, height: 0 });
        }

        // 检查演化是否已全部完成
        if (this._tickCount >= this._maxTicks) {
            this._isEvolving = false;
        }

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
