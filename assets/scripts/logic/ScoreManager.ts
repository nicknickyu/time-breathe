import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';
import { AnimalType } from '../data/AnimalData';

/** 每种地形每块 1 分，每种动物每只 5 分 */
const ANIMAL_UNIT_SCORE = 5;
const TERRAIN_UNIT_SCORE = 1;

/** 用于显示的本地化名称映射 */
const TERRAIN_DISPLAY: Record<string, string> = {
    [TerrainType.GRASS]: '草地',
    [TerrainType.ROCK]: '岩石',
    [TerrainType.WATER]: '水域',
};

const ANIMAL_DISPLAY: Record<string, string> = {
    [AnimalType.BISON]: '野牛',
    [AnimalType.OWL]: '猫头鹰',
    [AnimalType.HIPPO]: '河马',
};

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

    /** 每种地形累计块数（跨轮次累加） */
    private _terrainCounts: Record<string, number> = {};

    /** 每种动物累计入住只数 */
    private _animalCounts: Record<string, number> = {};

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

    /**
     * 最终结算：在游戏结束时调用一次，
     * 扫描当前 grid 统计各地形块数，供 getScoreSummary() 使用。
     */
    finalize(): void {
        // 统计 final grid 的各地形块数
        const cells = HexGridManager.instance.getAllCells();
        this._terrainCounts = {};
        for (const cell of cells) {
            if (cell.terrainType !== TerrainType.ERODED) {
                this._terrainCounts[cell.terrainType] = (this._terrainCounts[cell.terrainType] || 0) + 1;
            }
        }
    }

    /** 累加入住动物分数（每只 +5），注明动物类型 */
    addAnimalScore(count: number, animalType?: string): void {
        if (animalType) {
            this._animalCounts[animalType] = (this._animalCounts[animalType] || 0) + count;
        }
        this._totalScore += count * ANIMAL_UNIT_SCORE;
    }

    /**
     * 生成结算明细字符串
     * 格式：
     *   游戏结束
     *
     *   【地形得分】
     *     草地: 4块 × 1分 = 4分
     *     岩石: 3块 × 1分 = 3分
     *     水域: 2块 × 1分 = 2分
     *     地形总分: 9分
     *
     *   【动物得分】
     *     野牛: 2只 × 5分 = 10分
     *     猫头鹰: 1只 × 5分 = 5分
     *     动物总分: 15分
     *
     *   ━━━━━━━━━━━━━━━━
     *   总分: 24分
     */
    getScoreSummary(): string {
        const lines: string[] = [''];

        // ── 地形得分 ──
        lines.push('【地形得分】');
        let terrainTotal = 0;
        for (const type in this._terrainCounts) {
            const count = this._terrainCounts[type];
            if (count <= 0) continue;
            const pts = count * TERRAIN_UNIT_SCORE;
            const label = TERRAIN_DISPLAY[type] || type;
            lines.push(`  ${label}: ${count}块 × ${TERRAIN_UNIT_SCORE}分 = ${pts}分`);
            terrainTotal += pts;
        }
        lines.push(`  地形总分: ${terrainTotal}分\n`);

        // ── 动物得分 ──
        lines.push('【动物得分】');
        let animalTotal = 0;
        for (const type in this._animalCounts) {
            const count = this._animalCounts[type];
            if (count <= 0) continue;
            const pts = count * ANIMAL_UNIT_SCORE;
            const label = ANIMAL_DISPLAY[type] || type;
            lines.push(`  ${label}: ${count}只 × ${ANIMAL_UNIT_SCORE}分 = ${pts}分`);
            animalTotal += pts;
        }
        lines.push(`  动物总分: ${animalTotal}分`);
        lines.push('━━━━━━━━━━━━━━━━');
        lines.push(`总　　分: ${this._totalScore}分`);

        return lines.join('\n');
    }

    /** 重置所有分数 */
    reset(): void {
        this._totalScore = 0;
        this._terrainCounts = {};
        this._animalCounts = {};
    }
}
