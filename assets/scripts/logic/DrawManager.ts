import { TerrainType } from '../data/TerrainType';

/** 抽取分组数据 */
export interface DrawGroup {
    tiles: TerrainType[];
}

/**
 * 地形块抽取管理器（单例）
 * 负责生成三组随机地形、管理玩家手牌
 */
export class DrawManager {
    private static _instance: DrawManager;
    static get instance(): DrawManager {
        if (!this._instance) {
            this._instance = new DrawManager();
        }
        return this._instance;
    }

    private _groups: DrawGroup[] = [];
    private _currentHand: TerrainType[] = [];

    get groups(): DrawGroup[] { return this._groups; }
    get currentHand(): TerrainType[] { return this._currentHand; }

    private readonly TERRAIN_POOL: TerrainType[] = [
        TerrainType.GRASS,
        TerrainType.ROCK,
        TerrainType.WATER,
    ];

    /** 生成 3 组随机地形，每组 3 块 */
    generateGroups(): void {
        this._groups = [];
        this._currentHand = [];
        for (let g = 0; g < 3; g++) {
            const tiles: TerrainType[] = [];
            for (let t = 0; t < 3; t++) {
                const idx = Math.floor(Math.random() * this.TERRAIN_POOL.length);
                tiles.push(this.TERRAIN_POOL[idx]);
            }
            this._groups.push({ tiles });
        }
    }

    /** 选中一组的全部地形块作为当前手牌 */
    selectGroup(index: number): void {
        if (index < 0 || index >= this._groups.length) return;
        this._currentHand = [...this._groups[index].tiles];
    }

    /** 从手牌中移除已放置的一块 */
    removePlacedTile(handIndex: number): void {
        if (handIndex < 0 || handIndex >= this._currentHand.length) return;
        this._currentHand.splice(handIndex, 1);
    }

    /** 手牌是否还有未放置的地形块 */
    hasMoreTiles(): boolean {
        return this._currentHand.length > 0;
    }
}
