import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';

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

    /**
     * Calculate score for the current grid state:
     * each non-EMPTY cell = 1 point.
     */
    calculateRoundScore(): number {
        const cells = HexGridManager.instance.getAllCells();
        return cells.filter(c => c.terrainType !== TerrainType.EMPTY).length;
    }

    /**
     * Add round score to the running total.
     */
    addRoundScore(roundScore: number): void {
        this._totalScore += roundScore;
    }

    reset(): void {
        this._totalScore = 0;
    }
}
