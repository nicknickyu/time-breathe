import { _decorator, Component, Sprite, SpriteFrame, UITransform, Node, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 侵蚀源标记视图组件
 * 在侵蚀源格子上方显示一个标记节点（"侵蚀源标记"）
 * 动态添加到 HexCell 节点上，由 GridView 托管生命周期
 */
@ccclass('ErosionSourceView')
export class ErosionSourceView extends Component {
    @property(SpriteFrame)
    markerSprite: SpriteFrame | null = null;

    private _markerNode: Node | null = null;

    /** 设置标记贴图并创建标记节点 */
    setMarkerSprite(sf: SpriteFrame): void {
        this.markerSprite = sf;
        this._createMarkerNode();
    }

    /** 清除标记节点 */
    clearMarker(): void {
        if (this._markerNode) {
            this._markerNode.destroy();
            this._markerNode = null;
        }
    }

    private _createMarkerNode(): void {
        this.clearMarker();

        if (!this.markerSprite) return;

        const markerNode = new Node('ErosionSourceMarker');
        markerNode.setPosition(new Vec3(0, 15, 0));

        const sprite = markerNode.addComponent(Sprite);
        sprite.spriteFrame = this.markerSprite;

        const uiTransform = markerNode.addComponent(UITransform);
        uiTransform.width = 40;
        uiTransform.height = 40;

        this.node.addChild(markerNode);
        this._markerNode = markerNode;

        // 呼吸动画：0.9 ~ 1.1 循环缩放
        tween(markerNode)
            .repeatForever(
                tween(markerNode)
                    .to(1.0, { scale: new Vec3(1.05, 1.05, 1) })
                    .to(1.0, { scale: new Vec3(0.95, 0.95, 1) })
            )
            .start();
    }

    protected onDestroy(): void {
        this.clearMarker();
    }
}
