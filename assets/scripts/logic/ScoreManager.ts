import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';

/**
 * 分数管理器（单例）
 * 管理总分数，每轮地形分 + 动物入住分
 */
export class ScoreManager {
    private static _instance: ScoreManager;
    static get instance(): ScoreManager {
        if (!this._instance) {
            this._instance = new ScoreManager();
        }
        return this._instance;
    }

    private _totalScore: number = 0;

    get totalScore(): number { return this._totalScore; }

    /** 计算本轮分数：每个非侵蚀地格 = 1 分 */
    calculateRoundScore(): number {
        const cells = HexGridManager.instance.getAllCells();
        return cells.filter(c => c.terrainType !== TerrainType.ERODED).length;
    }

    /** 累加本轮地形分 */
    addRoundScore(roundScore: number): void {
        this._totalScore += roundScore;
    }

    /** 累加入住动物分数（每只 +5） */
    addAnimalScore(count: number): void {
        this._totalScore += count * 5;
    }

    /** 重置总分 */
    reset(): void {
        this._totalScore = 0;
    }
}
