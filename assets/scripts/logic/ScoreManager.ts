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
 * 管理总分数：终局地形分 + 动物入住分 - 侵蚀惩罚
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

    /** 侵蚀地块数量 */
    private _erodedCount: number = 0;

    /** 是否存在侵蚀源 */
    private _hasErosionSource: boolean = false;

    /** 每种动物累计入住只数 */
    private _animalCounts: Record<string, number> = {};

    get totalScore(): number { return this._totalScore; }

    /**
     * 最终结算：在游戏结束时调用一次，
     * 扫描当前 grid 统计各地形块数，并根据最终地形块数一次性计分。
     */
    finalize(): void {
        // 统计 final grid 的各地形块数、侵蚀地块、侵蚀源
        const cells = HexGridManager.instance.getAllCells();
        this._terrainCounts = {};
        this._erodedCount = 0;
        this._hasErosionSource = false;

        for (const cell of cells) {
            if (cell.terrainType === TerrainType.ERODED) {
                this._erodedCount++;
            } else if (cell.terrainType === TerrainType.EROSION_SOURCE) {
                this._hasErosionSource = true;
            } else {
                this._terrainCounts[cell.terrainType] = (this._terrainCounts[cell.terrainType] || 0) + 1;
            }
        }

        // 终局一次性计分：地形正分（每块 +1）
        for (const type in this._terrainCounts) {
            this._totalScore += this._terrainCounts[type] * TERRAIN_UNIT_SCORE;
        }

        // 侵蚀源惩罚：存在则 -10 分
        if (this._hasErosionSource) {
            this._totalScore -= 10;
        }

        // 侵蚀地块惩罚：每块 -1 分
        this._totalScore -= this._erodedCount;
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
     *     侵蚀源惩罚: -10分          ← 仅当存在侵蚀源
     *     侵蚀地块: 3块 × -1分 = -3分  ← 仅当有侵蚀地块
     *     地形净分: -4分
     *
     *   【动物得分】
     *     野牛: 2只 × 5分 = 10分
     *     猫头鹰: 1只 × 5分 = 5分
     *     动物总分: 15分
     *
     *   ━━━━━━━━━━━━━━━━
     *   总分: 11分
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

        // ── 侵蚀惩罚（如果有） ──
        if (this._hasErosionSource) {
            terrainTotal -= 10;
            lines.push(`  侵蚀源惩罚: -10分`);
        }
        if (this._erodedCount > 0) {
            const erodedPts = this._erodedCount * 1;
            terrainTotal -= erodedPts;
            lines.push(`  侵蚀地块: ${this._erodedCount}块 × -1分 = -${erodedPts}分`);
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
        this._erodedCount = 0;
        this._hasErosionSource = false;
        this._animalCounts = {};
    }
}
