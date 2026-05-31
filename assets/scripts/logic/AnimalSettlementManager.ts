import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';
import { AnimalType, TargetAnimal } from '../data/AnimalData';

/**
 * 动物入住管理器（单例）
 * 负责生成目标动物、检查动物栖息地合法性
 */
export class AnimalSettlementManager {
    private static _instance: AnimalSettlementManager;
    static get instance(): AnimalSettlementManager {
        if (!this._instance) {
            this._instance = new AnimalSettlementManager();
        }
        return this._instance;
    }

    private _targetAnimals: TargetAnimal[] = [];

    get targetAnimals(): TargetAnimal[] {
        return this._targetAnimals;
    }

    /** 生成 3 种目标动物，每种数量 2~4 随机 */
    generateTargetAnimals(): void {
        this._targetAnimals = [];

        const types = [AnimalType.BISON, AnimalType.OWL, AnimalType.HIPPO];
        for (const type of types) {
            const count = 2 + Math.floor(Math.random() * 3); // 2~4
            this._targetAnimals.push({
                type,
                totalCount: count,
                settledCount: 0,
            });
        }
    }

    /**
     * 获取某种动物的合法入住格子
     * BISON: GRASS 且所有邻格都是 GRASS
     * OWL: ROCK 且 height > 3
     * HIPPO: WATER 且所有邻格都是 WATER 或 EMPTY
     */
    getValidCells(type: AnimalType): { col: number; row: number }[] {
        const mgr = HexGridManager.instance;
        const cells = mgr.getAllCells();
        const result: { col: number; row: number }[] = [];

        for (const cell of cells) {
            if (cell.isEmpty()) continue;

            switch (type) {
                case AnimalType.BISON:
                    if (cell.terrainType === TerrainType.GRASS && this._allNeighborsAre(cell.gridX, cell.gridY, TerrainType.GRASS)) {
                        result.push({ col: cell.gridX, row: cell.gridY });
                    }
                    break;
                case AnimalType.OWL:
                    if (cell.terrainType === TerrainType.ROCK && cell.height > 3) {
                        result.push({ col: cell.gridX, row: cell.gridY });
                    }
                    break;
                case AnimalType.HIPPO:
                    if (cell.terrainType === TerrainType.WATER && this._allNeighborsWaterOrEroded(cell.gridX, cell.gridY)) {
                        result.push({ col: cell.gridX, row: cell.gridY });
                    }
                    break;
            }
        }

        return result;
    }

    /** 检查 (col,row) 的所有邻格是否都是指定地形 */
    private _allNeighborsAre(col: number, row: number, type: TerrainType): boolean {
        const neighbors = HexGridManager.instance.getNeighbors(col, row);
        if (neighbors.length === 0) return false;
        return neighbors.every(n => {
            const cell = HexGridManager.instance.getCell(n.col, n.row);
            return cell && cell.terrainType === type;
        });
    }

    /** 检查 (col,row) 的所有邻格是否都是 WATER 或 ERODED */
    private _allNeighborsWaterOrEroded(col: number, row: number): boolean {
        const neighbors = HexGridManager.instance.getNeighbors(col, row);
        if (neighbors.length === 0) return false;
        return neighbors.every(n => {
            const cell = HexGridManager.instance.getCell(n.col, n.row);
            if (!cell) return false;
            return cell.terrainType === TerrainType.WATER || cell.terrainType === TerrainType.ERODED;
        });
    }
}
