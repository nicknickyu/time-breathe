import { _decorator, Component, Sprite, SpriteFrame, UITransform, Vec3, Node } from 'cc';
const { ccclass, property } = _decorator;

/** 每个岩石堆叠层的高度偏移像素 */
const STACK_OFFSET = 22;

/**
 * 岩石地形专属视图组件
 * 管理岩石堆叠效果（高度视觉层数），后续可扩展粒子特效等
 * 需手动绑定到 HexCellRock.prefab
 */
@ccclass('HexCellRockView')
export class HexCellRockView extends Component {
    @property(SpriteFrame)
    rockSprite: SpriteFrame | null = null;

    private _stackNodes: Node[] = [];

    /**
     * 更新格子堆叠高度
     * 每层在格子上方 STACK_OFFSET × level 处添加一个岩石贴图
     */
    setHeight(height: number): void {
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
            sprite.spriteFrame = this.rockSprite;

            const uiTransform = stackNode.addComponent(UITransform);
            uiTransform.width = 65;
            uiTransform.height = 89;

            this.node.addChild(stackNode);
            this._stackNodes.push(stackNode);
        }
    }

    /** 清除所有堆叠子节点 */
    clearStacks(): void {
        for (const node of this._stackNodes) {
            node.destroy();
        }
        this._stackNodes = [];
    }
}
