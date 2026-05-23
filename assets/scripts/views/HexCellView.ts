import { _decorator, Component, Sprite, SpriteFrame, UITransform, Color, Node, Vec3 } from 'cc';
import { TerrainType } from '../data/TerrainType';
const { ccclass, property } = _decorator;

const STACK_OFFSET = 22;

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

    setTerrain(type: TerrainType): void {
        this._currentType = type;
        this._applyVisual();
        if (type !== TerrainType.ROCK) {
            this._clearStacks();
        }
    }

    setHighlight(active: boolean): void {
        if (this.topSprite) {
            this.topSprite.color = active
                ? new Color(230, 255, 230)
                : new Color(255, 255, 255);
        }
    }

    /**
     * Add/remove stacked rock tiles above this cell to match height.
     * Each level = one extra rock sprite at STACK_OFFSET × level.
     */
    setHeight(height: number): void {
        // Only ROCK cells display stacks
        if (this._currentType !== TerrainType.ROCK) {
            this._clearStacks();
            return;
        }

        const rockSf = this._spriteFrames.get(TerrainType.ROCK);
        if (!rockSf) return;

        // Remove excess stacks
        while (this._stackNodes.length > height) {
            const node = this._stackNodes.pop()!;
            node.destroy();
        }

        // Add new stacks
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

    private _clearStacks(): void {
        for (const node of this._stackNodes) {
            node.destroy();
        }
        this._stackNodes = [];
    }

    private _applyVisual(): void {
        const sf = this._spriteFrames.get(this._currentType);
        if (sf && this.topSprite) {
            this.topSprite.spriteFrame = sf;
        }
    }
}
