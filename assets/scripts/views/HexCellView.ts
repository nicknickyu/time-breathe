import { _decorator, Component, Sprite, SpriteFrame, UITransform, Color, Node, Vec3 } from 'cc';
import { TerrainType } from '../data/TerrainType';
const { ccclass, property } = _decorator;

/** 每个岩石堆叠层的高度偏移像素 */
const STACK_OFFSET = 22;

/**
 * 六边形格子视图
 * 管理单个格子的地形显示、堆叠效果和高亮
 */
@ccclass('HexCellView')
export class HexCellView extends Component {
    @property(Sprite)
    topSprite: Sprite | null = null;

    private _spriteFrames: Map<TerrainType, SpriteFrame> = new Map();
    private _currentType: TerrainType = TerrainType.EMPTY;
    private _stackNodes: Node[] = [];

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

    /** 设置地形类型并更新显示 */
    setTerrain(type: TerrainType): void {
        this._currentType = type;
        this._applyVisual();
        if (type !== TerrainType.ROCK) {
            this._clearStacks();
        }
    }

    /** 切换高亮颜色（选中或放置预览） */
    setHighlight(active: boolean): void {
        if (this.topSprite) {
            this.topSprite.color = active
                ? new Color(230, 255, 230)
                : new Color(255, 255, 255);
        }
    }

    /**
     * 更新格子堆叠高度（仅 ROCK 地形）
     * 每层在格子上方 STACK_OFFSET × level 处添加一个岩石贴图
     */
    setHeight(height: number): void {
        if (this._currentType !== TerrainType.ROCK) {
            this._clearStacks();
            return;
        }

        const rockSf = this._spriteFrames.get(TerrainType.ROCK);
        if (!rockSf) return;

        // 移除多余的堆叠层
        while (this._stackNodes.length > height) {
            const node = this._stackNodes.pop()!;
            node.destroy();
        }

        // 新增堆叠层
        while (this._stackNodes.length < height) {
            const level = this._stackNodes.length + 1;
            const stackNode = new Node('RockStack');
            stackNode.setPosition(new Vec3(0, level * STACK_OFFSET, 0));

            const sprite = stackNode.addComponent(Sprite);
            sprite.spriteFrame = rockSf;

            const uiTransform = stackNode.addComponent(UITransform);
            uiTransform.width = 65;
            uiTransform.height = 89;

            this.node.addChild(stackNode);
            this._stackNodes.push(stackNode);
        }
    }

    /** 清除所有堆叠子节点 */
    private _clearStacks(): void {
        for (const node of this._stackNodes) {
            node.destroy();
        }
        this._stackNodes = [];
    }

    /** 应用当前地形的贴图到 Sprite */
    private _applyVisual(): void {
        const sf = this._spriteFrames.get(this._currentType);
        if (sf && this.topSprite) {
            this.topSprite.spriteFrame = sf;
        }
    }
}
