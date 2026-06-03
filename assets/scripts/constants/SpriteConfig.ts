import { _decorator, Component, SpriteFrame } from 'cc';
import { TerrainType } from '../data/TerrainType';
import { AnimalType } from '../data/AnimalData';
const { ccclass, property } = _decorator;

/**
 * 精灵图配置组件
 *
 * 集中管理所有游戏 SpriteFrame 引用，作为编辑器绑定的唯一入口。
 * 使用方式：挂载到场景任意节点 → 在 Inspector 面板拖拽 SpriteFrame 到数组 →
 * 其他组件通过 @property(SpriteConfig) 引用并使用 getter 方法访问。
 *
 * 数组顺序约定：
 *   terrainSprites[0..3] = ERODED / GRASS / ROCK / WATER
 *   animalSprites[0..2]  = BISON / OWL / HIPPO
 */
@ccclass('SpriteConfig')
export class SpriteConfig extends Component {

    @property({ type: [SpriteFrame], displayName: 'Terrain: [ERODED, GRASS, ROCK, WATER, EROSION_SOURCE]' })
    terrainSprites: SpriteFrame[] = [];

    @property(SpriteFrame)
    erosionSourceMarkerSprite: SpriteFrame | null = null;

    @property({ type: [SpriteFrame], displayName: 'Animal: [BISON, OWL, HIPPO]' })
    animalSprites: SpriteFrame[] = [];

    // ── Public getters ──

    getTerrainFrame(type: TerrainType): SpriteFrame | null {
        const idx = this._terrainIndex(type);
        return idx >= 0 && idx < this.terrainSprites.length ? this.terrainSprites[idx] : null;
    }

    getAnimalFrame(type: AnimalType): SpriteFrame | null {
        const idx = this._animalIndex(type);
        return idx >= 0 && idx < this.animalSprites.length ? this.animalSprites[idx] : null;
    }

    // ── Private helpers ──

    private _terrainIndex(type: TerrainType): number {
        switch (type) {
            case TerrainType.ERODED:         return 0;
            case TerrainType.GRASS:          return 1;
            case TerrainType.ROCK:           return 2;
            case TerrainType.WATER:          return 3;
            case TerrainType.EROSION_SOURCE: return 4;
        }
    }

    private _animalIndex(type: AnimalType): number {
        switch (type) {
            case AnimalType.BISON: return 0;
            case AnimalType.OWL:   return 1;
            case AnimalType.HIPPO: return 2;
        }
    }
}
