import { _decorator, Component, Sprite, UITransform, Color, Label } from 'cc';
import { TerrainType } from '../data/TerrainType';
import { DEBUG_LABEL } from '../constants/DebugConfig';
import { SpriteConfig } from '../constants/SpriteConfig';
const { ccclass, property } = _decorator;

/**
 * 六边形格子通用视图
 * 管理单个格子的地形显示和高亮，不包含任何地形专属逻辑
 */
@ccclass('HexCellView')
export class HexCellView extends Component {
    @property(Sprite)
    topSprite: Sprite | null = null;

    private _spriteConfig: SpriteConfig | null = null;
    private _currentType: TerrainType = TerrainType.ERODED;
    private _debugLabel: Label | null = null;

    onLoad(): void {
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.width = 65;
            uiTransform.height = 89;
        }
        // 初始化时根据调试开关控制 DebugLabel 显隐
        const debugLabelNode = this.node.getChildByName('DebugLabel');
        if (debugLabelNode) {
            debugLabelNode.active = DEBUG_LABEL;
        }
    }

    setSpriteConfig(config: SpriteConfig): void {
        this._spriteConfig = config;
        this._applyVisual();
    }

    /** 设置地形类型并更新贴图 */
    setTerrain(type: TerrainType): void {
        this._currentType = type;
        this._applyVisual();
    }

    /** 切换高亮颜色（选中或放置预览） */
    setHighlight(active: boolean): void {
        if (this.topSprite) {
            this.topSprite.color = active
                ? new Color(230, 255, 230)
                : new Color(255, 255, 255);
        }
    }

    /** 设置调试坐标显示（显示/隐藏受全局 DEBUG_LABEL 控制） */
    setDebugCoord(col: number, row: number): void {
        if (!this._debugLabel) {
            this._debugLabel = this.node.getChildByName('DebugLabel')?.getComponent(Label) ?? null;
        }
        if (this._debugLabel) {
            this._debugLabel.string = `(${col}, ${row})`;
            this._debugLabel.node.active = DEBUG_LABEL;
        }
    }

    /** 应用当前地形的贴图到 Sprite */
    private _applyVisual(): void {
        if (!this._spriteConfig || !this.topSprite) return;
        const sf = this._spriteConfig.getTerrainFrame(this._currentType);
        if (sf) {
            this.topSprite.spriteFrame = sf;
        }
    }
}
