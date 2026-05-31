import { HexGridManager } from './HexGridManager';
import { TerrainType } from '../data/TerrainType';
import { RockTerrainManager } from './RockTerrainManager';
import { GrassTerrainManager } from './GrassTerrainManager';
import { WaterTerrainManager } from './WaterTerrainManager';
import { ErodedTerrainManager } from './ErodedTerrainManager';

/** 一次演化 tick 中单个格子的变化数据 */
export interface TickChange {
    col: number;
    row: number;
    terrainType: TerrainType;
    height: number;
}

/**
 * 地形演化协调者（单例）
 * 控制演化流程，将各地形的演化规则委托给对应的地形管理器
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

    private _rockManager = RockTerrainManager.instance;
    private _grassManager = GrassTerrainManager.instance;
    private _waterManager = WaterTerrainManager.instance;
    private _erodedManager = ErodedTerrainManager.instance;

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
     * 执行一次演化 tick
     * 委托给各地形管理器执行演化，合并所有变化
     */
    tick(): TickChange[] {
        if (!this._isEvolving) return [];
        this._tickCount++;

        // 快照：固定本 tick 开始时的格子列表，防止同一 tick 内连锁反应
        const snapshot = HexGridManager.instance.getAllCells();

        const changes: TickChange[] = [];

        changes.push(...this._rockManager.evolve(snapshot, this._tickCount));
        changes.push(...this._grassManager.evolve(snapshot));
        changes.push(...this._waterManager.evolve(snapshot));
        changes.push(...this._erodedManager.evolve());

        // 检查演化是否已全部完成
        if (this._tickCount >= this._maxTicks) {
            this._isEvolving = false;
        }

        return changes;
    }
}
