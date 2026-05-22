import { _decorator, Component, Sprite, SpriteFrame, UITransform, Color } from 'cc';
import { TerrainType } from '../data/TerrainType';
const { ccclass, property } = _decorator;

@ccclass('HexCellView')
export class HexCellView extends Component {
    @property(Sprite)
    topSprite: Sprite | null = null;

    private _spriteFrames: Map<TerrainType, SpriteFrame> = new Map();
    private _currentType: TerrainType = TerrainType.EMPTY;

    onLoad(): void {
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.width = 65;
            uiTransform.height = 89;
        }
    }

    setSpriteFrames(map: Map<TerrainType, SpriteFrame>): void {
        this._spriteFrames = map;
        this._applyVisual();
    }

    setTerrain(type: TerrainType): void {
        this._currentType = type;
        this._applyVisual();
    }

    setHighlight(active: boolean): void {
        if (this.topSprite) {
            this.topSprite.color = active
                ? new Color(230, 255, 230)
                : new Color(255, 255, 255);
        }
    }

    private _applyVisual(): void {
        const sf = this._spriteFrames.get(this._currentType);
        if (sf && this.topSprite) {
            this.topSprite.spriteFrame = sf;
        }
    }
}
